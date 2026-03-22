import subprocess
import json
import logging
import requests
import random
import string

logger = logging.getLogger(__name__)


class FFUFService:
    WORDLIST = "/scanner-tools/wordlists/common.txt"

    def detect_soft_404(self, target_url: str) -> dict:
        """
        Request two guaranteed-random URLs.
        If both return 200/similar, server uses soft-404.
        Record the baseline response size AND content signature.
        """
        fake1 = "".join(random.choices(string.ascii_lowercase, k=16))
        fake2 = "".join(random.choices(string.ascii_lowercase, k=12))

        target_url = target_url.rstrip("/")
        baseline = {"enabled": False, "size": 0, "content": ""}
        
        try:
            r1 = requests.get(f"{target_url}/{fake1}", timeout=5, allow_redirects=True)
            r2 = requests.get(f"{target_url}/{fake2}", timeout=5, allow_redirects=True)

            if r1.status_code == 200 and r2.status_code == 200:
                baseline["enabled"] = True
                baseline["size"] = (len(r1.content) + len(r2.content)) / 2
                baseline["content"] = r1.text[:2000] # Store snippet for similarity
                logger.info(f"[FFUF] Soft-404 detected. Baseline size: {baseline['size']}")
            return baseline
        except Exception as e:
            logger.error(f"[FFUF] Soft-404 detection failed: {e}")
            return baseline

    def is_false_positive(self, url: str, status: int, length: int, baseline: dict) -> tuple:
        """
        Returns (is_fp, confidence_reduction, reason)
        """
        if not baseline.get("enabled"):
            return False, 0, ""

        # 1. Exact size match is highly suspicious
        if length == int(baseline["size"]):
            return True, 100, "Exact size match with soft-404 baseline"

        # 2. Size similarity (within 5%)
        diff_pct = abs(length - baseline["size"]) / (baseline["size"] or 1)
        if diff_pct < 0.05:
            return True, 80, f"Size ({length}) is within 5% of soft-404 baseline"

        return False, 0, ""

    def scan(self, target_url: str, scan_id: str, on_progress) -> list:
        """Discover hidden paths, admin panels, config files."""
        output_file = f"/tmp/{scan_id}_ffuf.json"

        baseline = self.detect_soft_404(target_url)

        base_url = target_url.rstrip("/") + "/FUZZ"

        cmd = [
            "ffuf",
            "-u", base_url,
            "-w", self.WORDLIST,
            "-o", output_file,
            "-of", "json",
            "-mc", "200,201,301,302,403",
            "-fc", "301,302",  # filter redirects
            "-fl", "0",        # filter empty responses
            "-fw", "0",        # filter zero-word responses
            "-t", "50",
            "-timeout", "10",
            "-s",
            "-maxtime", "60",
        ]

        if baseline["enabled"] and baseline["size"] > 0:
            # We don't use -fs filter here because we want to do smarter diffing in parse_output
            # But we can use it as a first pass if the size is exactly the same
            pass

        on_progress("📂 Running FFUF directory scan...", 18)

        try:
            subprocess.run(cmd, capture_output=True, timeout=90)
        except subprocess.TimeoutExpired:
            on_progress("⚠️ FFUF timed out, continuing...", 22)
            return []
        except FileNotFoundError:
            on_progress("⚠️ FFUF not found, skipping...", 22)
            return []

        return self.parse_output(output_file, scan_id, baseline)

    def verify_finding(self, url: str) -> tuple:
        """
        Attempt to verify if a path is actually sensitive.
        Returns (confidence_score, evidence_note)
        """
        try:
            r = requests.get(url, timeout=5, allow_redirects=True)
            text = r.text.lower()
            
            # Indicators of a real admin/sensitive page
            indicators = ["login", "password", "username", "admin", "dashboard", "sign in", "authenticated"]
            found = [i for i in indicators if i in text]
            
            if len(found) >= 2:
                return 90, f"Verified: Found multiple admin indicators ({', '.join(found)})"
            if len(found) == 1:
                return 60, f"Partial Match: Found indicator '{found[0]}'"
            
            return 30, "Low Confidence: No clear admin indicators found in page content"
        except Exception:
            return 20, "Verification Failed: Could not reach path for content analysis"

    def parse_output(self, output_file: str, scan_id: str, baseline: dict) -> list:
        findings = []
        SENSITIVE = [
            "admin", "config", "backup", ".env", ".git", "password", "secret",
            "token", "key", "credentials", "database", "db", "api_key",
            "phpmyadmin", ".htaccess", "debug",
        ]

        try:
            with open(output_file) as f:
                data = json.load(f)

            for result in data.get("results", []):
                url = result.get("url", "")
                status = result.get("status", 0)
                length = result.get("length", 0)

                is_fp, reduction, reason = self.is_false_positive(url, status, length, baseline)
                
                url_lower = url.lower()
                is_sensitive_keyword = any(s in url_lower for s in SENSITIVE)

                # Base confidence
                confidence = 70 if is_sensitive_keyword else 40
                if status == 403: confidence += 15 # 403 is more likely real than a 200 catch-all
                
                confidence -= reduction

                if is_fp and confidence < 40:
                    continue # Discard obvious false positives

                # Verification Step for high-potential findings
                verification_note = ""
                if confidence > 50 and status == 200:
                    v_score, v_note = self.verify_finding(url)
                    confidence = (confidence + v_score) / 2
                    verification_note = f" | {v_note}"

                if is_sensitive_keyword or status == 403:
                    severity = "high" if confidence > 70 else "medium"
                    if confidence < 30: severity = "low"

                    findings.append(
                        {
                            "scan_id": scan_id,
                            "vuln_type": "Sensitive Path Exposed"
                            if is_sensitive_keyword
                            else "Forbidden Path",
                            "severity": severity,
                            "url": url,
                            "confidence_score": int(confidence),
                            "evidence": f"HTTP {status} (Size: {length}){verification_note}",
                            "description": f"Path {url} was detected with {int(confidence)}% confidence. {reason}",
                            "attack_worked": confidence > 40,
                            "owasp_category": "A05:2021 - Security Misconfiguration",
                            "tool_source": "ffuf",
                        }
                    )
        except (FileNotFoundError, json.JSONDecodeError):
            logger.warning(f"[FFUF] Could not parse output: {output_file}")

        return findings
