"""
Attack categorizer — determines which attacks succeeded vs were blocked.
"""

ALL_ATTACK_TYPES = [
    "SQL Injection",
    "Cross Site Scripting (Reflected)",
    "Cross Site Scripting (Stored)",
    "Cross-Site Request Forgery",
    "Path Traversal",
    "Server Side Request Forgery",
    "Remote OS Command Injection",
    "External Redirect",
    "Directory Browsing",
    "Missing Anti-clickjacking Header",
    "Content Security Policy (CSP) Header Not Set",
    "Strict-Transport-Security Header Not Set",
    "X-Content-Type-Options Header Missing",
    "Cookie Without Secure Flag",
    "Cookie No HttpOnly Flag",
    "Application Error Disclosure",
    "Insecure HTTP Method",
    "Authentication Bypass",
    "Sensitive Path Exposed",
    "Weak Authentication Method",
]


def categorize_findings(all_findings: list) -> dict:
    """
    Categorizes findings into three states:
    1. Vulnerable: attack_worked=True
    2. Defended: attack_worked=False AND was_attempted=True
    3. Not Tested: everything else from ALL_ATTACK_TYPES
    """
    vulnerable = [f for f in all_findings if f.get("attack_worked")]
    defended = [f for f in all_findings if not f.get("attack_worked") and f.get("was_attempted")]
    
    # Track which categories have at least one finding (vulnerable or defended)
    tested_categories = set()
    found_any_params = any(f.get("parameter") for f in all_findings) or any("param" in f.get("evidence","").lower() for f in all_findings)

    for f in all_findings:
        if f.get("vuln_type"):
            vuln_name = f["vuln_type"]
            tested_categories.add(vuln_name)
            
            # Better Mapping fuzzy types
            vt = vuln_name.lower()
            if "sql" in vt: tested_categories.add("SQL Injection")
            if "xss" in vt or "cross site scripting" in vt or "cross-site scripting" in vt: 
                tested_categories.add("Cross Site Scripting (Reflected)")
                tested_categories.add("Cross Site Scripting (Stored)")
            if "csrf" in vt or "cross-site request forgery" in vt: 
                tested_categories.add("Cross-Site Request Forgery")
            if "command" in vt: tested_categories.add("Remote OS Command Injection")
            if "traversal" in vt or "path" in vt: tested_categories.add("Path Traversal")
            if "ssrf" in vt or "request forgery" in vt: tested_categories.add("Server Side Request Forgery")
            if "header" in vt:
                if "clickjacking" in vt: tested_categories.add("Missing Anti-clickjacking Header")
                if "csp" in vt or "content security policy" in vt: tested_categories.add("Content Security Policy (CSP) Header Not Set")
                if "hsts" in vt or "transport-security" in vt: tested_categories.add("Strict-Transport-Security Header Not Set")
                if "content-type-options" in vt: tested_categories.add("X-Content-Type-Options Header Missing")
            if "cookie" in vt:
                if "secure" in vt: tested_categories.add("Cookie Without Secure Flag")
                if "httponly" in vt: tested_categories.add("Cookie No HttpOnly Flag")
            if "redirect" in vt: tested_categories.add("External Redirect")
            if "directory" in vt or "browsing" in vt: tested_categories.add("Directory Browsing")

    not_tested = []
    # If ZAP ran, we consider many things tested even if not explicitly found
    zap_ran = any(f.get("tool_source") == "zap" for f in all_findings)
    native_ran = any("native" in (f.get("tool_source") or "") for f in all_findings)

    for attack_type in ALL_ATTACK_TYPES:
        if attack_type not in tested_categories:
            # Special case: if ZAP ran, it tests for many of these passively
            if zap_ran and attack_type in [
                "Missing Anti-clickjacking Header", 
                "Content Security Policy (CSP) Header Not Set",
                "Strict-Transport-Security Header Not Set",
                "X-Content-Type-Options Header Missing",
                "Cookie Without Secure Flag",
                "Cookie No HttpOnly Flag",
                "Application Error Disclosure",
                "Insecure HTTP Method",
                "Directory Browsing"
            ]:
                continue # ZAP tests these passively, so they shouldn't show as 'not tested'
                
            reason = "Scan configuration or target architecture did not require this specific test."
            if attack_type in ["SQL Injection", "Cross Site Scripting (Reflected)", "Remote OS Command Injection"]:
                if not found_any_params:
                    reason = f"No input parameters, forms, or APIs discovered on {attack_type} entry points."
                else:
                    reason = f"Fuzzer attempted multiple payloads on discovered parameters but found no vulnerabilities."
            
            not_tested.append({
                "attack_type": attack_type,
                "status": "not_tested",
                "message": reason
            })


    return {
        "vulnerable": vulnerable,
        "defended": defended,
        "not_tested": not_tested,
    }
