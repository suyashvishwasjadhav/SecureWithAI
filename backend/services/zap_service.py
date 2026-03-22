import requests
import time
import os
import logging

logger = logging.getLogger(__name__)

ZAP_BASE = os.getenv("ZAP_URL", "http://zap:8090")


def _zap_get(url: str, params: dict = None, retries: int = 5, timeout: int = 30):
    """Make a GET request to ZAP with retry logic for transient failures."""
    for attempt in range(retries):
        try:
            r = requests.get(url, params=params, timeout=timeout)
            return r
        except (requests.ConnectionError, requests.Timeout) as e:
            if attempt < retries - 1:
                wait = 3 * (attempt + 1)
                logger.warning(f"[ZAP] Request failed ({e}), retrying in {wait}s... ({attempt+1}/{retries})")
                time.sleep(wait)
            else:
                raise


class ZAPService:

    def wait_for_zap(self, timeout=120):
        """Poll ZAP every 3 seconds until it responds. Raise if timeout."""
        start = time.time()
        while time.time() - start < timeout:
            try:
                r = requests.get(f"{ZAP_BASE}/JSON/core/view/version/", timeout=5)
                if r.status_code == 200:
                    logger.info(f"[ZAP] Connected — version: {r.json().get('version')}")
                    return True
            except Exception:
                pass
            time.sleep(3)
        raise Exception("ZAP did not start within timeout")

    def spider_target(self, scan_id: str, target_url: str, on_progress, intensity: str = "standard") -> list:
        """
        Spider (crawl) the target to discover all URLs.
        Returns list of discovered URLs.
        """
        # Adjust spider options based on intensity
        depth = 3
        threads = 10
        if intensity == "quick":
            depth = 1
            threads = 5
        elif intensity == "deep":
            depth = 5
            threads = 20

        _zap_get(f"{ZAP_BASE}/JSON/spider/action/setOptionMaxDepth/", params={"Integer": depth})
        _zap_get(f"{ZAP_BASE}/JSON/spider/action/setOptionThreadCount/", params={"Integer": threads})

        resp = _zap_get(
            f"{ZAP_BASE}/JSON/spider/action/scan/",
            params={"url": target_url, "maxChildren": 10 if intensity == "quick" else 20, "recurse": True},
        )
        data = resp.json()
        if "scan" not in data:
            logger.error(f"[ZAP Spider] Failed to start spider. Response: {data}")
            return []
            
        spider_id = data["scan"]

        while True:
            try:
                status_resp = _zap_get(
                    f"{ZAP_BASE}/JSON/spider/view/status/",
                    params={"scanId": spider_id},
                )
                pct = int(status_resp.json()["status"])
                on_progress(f"🕷️ Crawling ({intensity}): {pct}% complete", int(pct * 0.15))
                if pct >= 100:
                    break
            except Exception as e:
                logger.warning(f"[ZAP Spider] Poll error: {e}")
            time.sleep(2)

        urls_resp = _zap_get(
            f"{ZAP_BASE}/JSON/spider/view/results/",
            params={"scanId": spider_id},
        )
        return urls_resp.json().get("results", [])

    def active_scan(self, scan_id: str, target_url: str, on_progress, intensity: str = "standard") -> str:
        """
        Run active attack scan against target.
        This fires actual attack payloads (SQLi, XSS, etc.)
        """
        # Adjust attack options based on intensity
        threads = 15
        max_duration = 5 # minutes
        if intensity == "quick":
            threads = 5
            max_duration = 3
        elif intensity == "deep":
            threads = 40
            max_duration = 20

        _zap_get(f"{ZAP_BASE}/JSON/ascan/action/setOptionThreadPerHost/", params={"Integer": threads})
        _zap_get(f"{ZAP_BASE}/JSON/ascan/action/setOptionMaxRuleDurationInMins/", params={"Integer": max_duration})

        # For quick scan, use a lighter policy if possible, otherwise just limit scope
        scan_params = {"url": target_url, "recurse": True, "scanPolicyName": ""}
        if intensity == "quick":
            scan_params["recurse"] = False # Only scan the main page

        resp = _zap_get(
            f"{ZAP_BASE}/JSON/ascan/action/scan/",
            params=scan_params,
        )
        data = resp.json()
        if "scan" not in data:
            logger.error(f"[ZAP Active Scan] Failed to start active scan. Response: {data}")
            return None
            
        ascan_id = data["scan"]

        if not ascan_id:
            return None
            
        consecutive_errors = 0
        while True:
            try:
                status_resp = _zap_get(
                    f"{ZAP_BASE}/JSON/ascan/view/status/",
                    params={"scanId": ascan_id},
                )
                pct = int(status_resp.json()["status"])
                on_progress(f"⚔️ Attacking ({intensity}): {pct}% complete", int(15 + pct * 0.45))
                consecutive_errors = 0
                if pct >= 100:
                    break
            except Exception as e:
                consecutive_errors += 1
                logger.warning(f"[ZAP Active] Poll error #{consecutive_errors}: {e}")
                if consecutive_errors >= 10:
                    logger.error("[ZAP Active] Too many errors, assuming scan complete")
                    break
            time.sleep(3)

        return ascan_id

    def get_alerts(self, target_url: str) -> list:
        """Get all vulnerability alerts found by ZAP."""
        resp = _zap_get(
            f"{ZAP_BASE}/JSON/core/view/alerts/",
            params={"baseurl": target_url, "start": 0, "count": 200},
        )
        return resp.json().get("alerts", [])

    def get_discovered_urls(self) -> list:
        """Get all URLs ZAP discovered (for attack surface map)."""
        try:
            resp = _zap_get(f"{ZAP_BASE}/JSON/core/view/urls/")
            return resp.json().get("urls", [])
        except Exception:
            return []

    def parse_alerts_to_findings(self, alerts: list, scan_id: str) -> list:
        """
        Convert ZAP alert format → our finding schema.
        """
        OWASP_MAP = {
            "SQL Injection": "A03:2021 - Injection",
            "Cross Site Scripting (Reflected)": "A03:2021 - Injection",
            "Cross Site Scripting (Persistent)": "A03:2021 - Injection",
            "Cross-Site Request Forgery": "A01:2021 - Broken Access Control",
            "Path Traversal": "A01:2021 - Broken Access Control",
            "Remote File Inclusion": "A03:2021 - Injection",
            "Server Side Request Forgery": "A10:2021 - SSRF",
            "Missing Anti-clickjacking Header": "A05:2021 - Security Misconfiguration",
            "X-Content-Type-Options Header Missing": "A05:2021 - Security Misconfiguration",
            "Absence of Anti-CSRF Tokens": "A01:2021 - Broken Access Control",
            "Application Error Disclosure": "A05:2021 - Security Misconfiguration",
            "Cookie Without Secure Flag": "A02:2021 - Cryptographic Failures",
            "Cookie No HttpOnly Flag": "A02:2021 - Cryptographic Failures",
            "Insecure HTTP Method": "A05:2021 - Security Misconfiguration",
            "Strict-Transport-Security Header Not Set": "A05:2021 - Security Misconfiguration",
            "Content Security Policy (CSP) Header Not Set": "A05:2021 - Security Misconfiguration",
            "Remote OS Command Injection": "A03:2021 - Injection",
            "External Redirect": "A01:2021 - Broken Access Control",
            "Directory Browsing": "A05:2021 - Security Misconfiguration",
            "Source Code Disclosure": "A02:2021 - Cryptographic Failures",
            "Weak Authentication Method": "A07:2021 - Identification Failures",
            "Session ID in URL Rewrite": "A07:2021 - Identification Failures",
        }

        SEVERITY_MAP = {
            "High": "high",
            "Medium": "medium",
            "Low": "low",
            "Informational": "info",
        }

        findings = []
        seen: set[str] = set()

        for alert in alerts:
            key = f"{alert.get('alert')}:{alert.get('url')}:{alert.get('param')}"
            if key in seen:
                continue
            seen.add(key)

            risk = alert.get("risk", "Low")
            severity = SEVERITY_MAP.get(risk, "info")
            vuln_type = alert.get("alert", "Unknown")

            findings.append(
                {
                    "scan_id": scan_id,
                    "vuln_type": vuln_type,
                    "severity": severity,
                    "url": alert.get("url"),
                    "parameter": alert.get("param") or None,
                    "evidence": alert.get("evidence", "")[:500],
                    "description": alert.get("description", "")[:1000],
                    "attack_worked": severity in ["high", "critical", "medium"],
                    "owasp_category": OWASP_MAP.get(
                        vuln_type, "A05:2021 - Security Misconfiguration"
                    ),
                    "tool_source": "zap",
                }
            )

        return findings

    def reset_for_new_scan(self, target_url: str):
        """Clear ZAP session before new scan to avoid mixing results."""
        try:
            _zap_get(f"{ZAP_BASE}/JSON/core/action/newSession/")
        except Exception as e:
            logger.warning(f"[ZAP] Could not reset session: {e}")
