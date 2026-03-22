import re

VULN_ALIASES = {
    "SQL Injection": ["sql-injection", "sqli", "B608", "injection.sql", "django.security.injection"],
    "Cross-Site Scripting": ["xss", "cross-site-scripting", "B703", "javascript.browser.security.xss"],
    "Path Traversal": ["path-traversal", "directory-traversal", "B107", "B108"],
    "Hardcoded Secret": ["hardcoded-credentials", "secret", "gitleaks", "B105", "B106"],
    "Server-Side Request Forgery": ["ssrf", "server-side-request-forgery"],
    "Code Injection": ["eval", "exec", "B102", "B307"],
    "Weak Cryptography": ["weak-crypto", "md5", "sha1", "B303", "B324"],
}

def normalize_vuln_type(vuln_type: str) -> str:
    """Normalize vuln type for fuzzy matching."""
    vt = vuln_type.lower().replace(" ", "-").replace("_", "-")
    for canonical, aliases in VULN_ALIASES.items():
        if vt == canonical.lower().replace(" ","-"):
            return canonical
        for alias in aliases:
            if alias.lower() in vt or vt in alias.lower():
                return canonical
    return vuln_type

def url_path_to_keywords(url_path: str) -> list:
    """Extract search keywords from a URL path."""
    from urllib.parse import urlparse
    parsed = urlparse(url_path)
    path = parsed.path.lower()
    # Split by / and - and _ 
    parts = re.split(r'[/\-_]', path)
    return [p for p in parts if len(p) > 2 and p not in ['api','v1','v2','the','www']]

def correlate_findings(dast_findings: list, sast_findings: list) -> list:
    """
    Match DAST runtime findings to SAST source code findings.
    Returns list of correlated pairs with confidence scores.
    """
    correlations = []
    
    for dast in dast_findings:
        dast_type = normalize_vuln_type(dast.get("vuln_type", ""))
        url = dast.get("url", "")
        url_keywords = url_path_to_keywords(url)
        
        best_match = None
        best_confidence = 0
        
        for sast in sast_findings:
            sast_type = normalize_vuln_type(sast.get("vuln_type", ""))
            
            # Calculate confidence score
            confidence = 0
            
            # Exact vuln type match: +50
            if dast_type == sast_type:
                confidence += 50
            # Partial match: +25
            elif dast_type.lower() in sast_type.lower() or sast_type.lower() in dast_type.lower():
                confidence += 25
            else:
                continue  # Different vuln types, no correlation
            
            # URL-to-file path matching
            file_path = (sast.get("file_path") or "").lower()
            for keyword in url_keywords:
                if keyword in file_path:
                    confidence += 20
                    break
            
            # Same severity: +10
            if dast.get("severity") == sast.get("severity"):
                confidence += 10
            
            if confidence > best_confidence:
                best_confidence = confidence
                best_match = sast
        
        if best_match and best_confidence >= 50:
            dast_loc = dast.get("url", "")
            sast_loc = f"{best_match.get('file_path')}:{best_match.get('line_number')}"
            
            correlations.append({
                "dast_finding_id": dast.get("id"),
                "sast_finding_id": best_match.get("id"),
                "confidence": best_confidence,
                "vuln_type": dast_type,
                "message": f"{dast_type} at {dast_loc} matches code in {sast_loc}",
                "dast_finding": dast,
                "sast_finding": best_match
            })
    
    return correlations
