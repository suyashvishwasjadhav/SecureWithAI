import time
import requests
from datetime import datetime
from src.attack.nikto_scanner import run_nikto
from src.attack.exposure import check_exposure
from src.utils.cleaner import build_clean_report

ZAP_BASE = "http://127.0.0.1:8080"

def zap_get(endpoint, params=None):
    url = f"{ZAP_BASE}/JSON/{endpoint}/"
    r = requests.get(url, params=params, timeout=30)
    return r.json()

def run_zap_scan_live(
    target_url,
    on_spider_progress=None,
    on_spider_done=None,
    on_passive_done=None,
    on_active_progress=None,
    on_active_done=None,
    on_finding=None,
    console=None,
):
    # Test connection
    version = zap_get("core/view/version")["version"]

    # Step 1 — Seed URLs
    seed_urls = [
        target_url,
        f"{target_url}/rest/user/login",
        f"{target_url}/rest/products/search?q=",
        f"{target_url}/api/Users",
        f"{target_url}/rest/basket/1",
        f"{target_url}/rest/user/whoami",
        f"{target_url}/rest/admin/application-configuration",
        f"{target_url}/rest/memories",
        f"{target_url}/rest/chatbot/status",
        f"{target_url}/rest/deluxe-membership",
    ]

    for seed_url in seed_urls:
        try:
            zap_get("core/action/accessUrl", {
                "url": seed_url,
                "followRedirects": "true"
            })
            time.sleep(0.5)
        except Exception:
            pass

    # Step 2 — Spider
    spider = zap_get("spider/action/scan", {
        "url": target_url,
        "recurse": "true",
        "maxChildren": "20"
    })
    spider_id = spider["scan"]
    time.sleep(2)

    while True:
        status = int(zap_get("spider/view/status", {"scanId": spider_id})["status"])
        if on_spider_progress:
            on_spider_progress(status)
        if status >= 100:
            break
        time.sleep(3)

    urls = zap_get("spider/view/results", {"scanId": spider_id})["results"]
    if on_spider_done:
        on_spider_done(len(urls))

    # Step 3 — Passive scan
    while True:
        try:
            remaining = int(zap_get("pscan/view/recordsToScan").get("recordsToScan", 0))
            if remaining == 0:
                break
            time.sleep(2)
        except Exception:
            break
    if on_passive_done:
        on_passive_done()

    # Step 4 — Re-seed before active scan
    for seed_url in seed_urls:
        try:
            zap_get("core/action/accessUrl", {
                "url": seed_url,
                "followRedirects": "true"
            })
            time.sleep(0.3)
        except Exception:
            pass
    time.sleep(2)

    # Step 5 — Active scan
    ascan = zap_get("ascan/action/scan", {
        "url": target_url,
        "recurse": "true",
        "inScopeOnly": "false",
        "scanPolicyName": "",
        "method": "",
        "postData": "",
    })

    if "scan" not in ascan:
        ascan = zap_get("ascan/action/scan", {
            "url": f"{target_url}/rest/user/login",
            "recurse": "true",
            "inScopeOnly": "false",
        })

    if "scan" not in ascan:
        raise Exception(f"Active scan failed to start: {ascan}")

    ascan_id = ascan["scan"]
    time.sleep(2)
    reported_findings = set()

    while True:
        status = int(zap_get("ascan/view/status", {"scanId": ascan_id})["status"])
        if on_active_progress:
            on_active_progress(status)

        if on_finding:
            try:
                alerts = zap_get("core/view/alerts", {"baseurl": target_url})["alerts"]
                for alert in alerts:
                    key = f"{alert.get('name')}_{alert.get('url')}_{alert.get('param')}"
                    if key not in reported_findings:
                        reported_findings.add(key)
                        on_finding({
                            "vuln_type": alert.get("name", "Unknown"),
                            "severity":  alert.get("risk", "Informational"),
                            "endpoint":  alert.get("url", ""),
                            "parameter": alert.get("param", ""),
                        })
            except Exception:
                pass

        if status >= 100:
            break
        time.sleep(10)

    if on_active_done:
        on_active_done()

    # Step 6 — Collect ZAP alerts
    alerts = zap_get("core/view/alerts", {"baseurl": target_url})["alerts"]
    zap_findings = []
    for i, alert in enumerate(alerts):
        zap_findings.append({
            "id":           f"z{i+1:03d}",
            "tool":         "zap",
            "vuln_type":    alert.get("name", "Unknown"),
            "severity":     alert.get("risk", "Informational"),
            "endpoint":     alert.get("url", ""),
            "method":       alert.get("method", "GET"),
            "parameter":    alert.get("param", ""),
            "payload_used": alert.get("attack", ""),
            "evidence":     alert.get("evidence", ""),
            "description":  alert.get("description", ""),
            "solution":     alert.get("solution", ""),
            "cweid":        alert.get("cweid", ""),
        })

    # Step 7 — Run exposure check
    exposure_findings = check_exposure(target_url, console=console)

    # Step 8 — Run Nikto
    nikto_findings = run_nikto(target_url, console=console)

    # Step 9 — Merge all findings
    all_findings = zap_findings + exposure_findings + nikto_findings

    # Step 10 — Sort merged findings
    severity_order = {"High": 0, "Medium": 1, "Low": 2, "Informational": 3}
    all_findings.sort(key=lambda x: severity_order.get(x["severity"], 4))

    summary = {
        "High":          sum(1 for f in all_findings if f["severity"] == "High"),
        "Medium":        sum(1 for f in all_findings if f["severity"] == "Medium"),
        "Low":           sum(1 for f in all_findings if f["severity"] == "Low"),
        "Informational": sum(1 for f in all_findings if f["severity"] == "Informational"),
    }

    raw_results = {
        "scan_id":        f"scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "target_url":     target_url,
        "scanned_at":     datetime.now().isoformat(),
        "tool":           f"ZAP {version} + Nikto + Exposure",
        "total_findings": len(all_findings),
        "summary":        summary,
        "findings":       all_findings,
    }

    # Step 11 — Clean and deduplicate
    return build_clean_report(raw_results)