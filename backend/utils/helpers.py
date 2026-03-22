import ipaddress
from urllib.parse import urlparse

def calculate_risk_score(findings: list) -> int:
    """Accumulated risk points (higher = more issues). Accepts severities or finding dicts."""
    score = 0
    for item in findings:
        if isinstance(item, dict):
            severity = (item.get("severity") or "low").lower()
        else:
            severity = (item or "low").lower()
        if severity == "critical":
            score += 25
        elif severity == "high":
            score += 10
        elif severity == "medium":
            score += 5
        elif severity == "low":
            score += 2

    return min(100, score)

def format_duration(seconds: int) -> str:
    if seconds is None: return ""
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)
    if h > 0: return f"{h}h {m}m"
    if m > 0: return f"{m}m {s}s"
    return f"{s}s"

def sanitize_url(url: str) -> str:
    return url.strip().rstrip('/')

def is_private_ip(url: str) -> bool:
    try:
        hostname = urlparse(url).hostname
        if not hostname: return False
        if hostname == 'localhost': return True
        ip = ipaddress.ip_address(hostname)
        return ip.is_private or ip.is_loopback
    except Exception:
        return False
