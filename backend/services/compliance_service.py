import json
import os
from typing import Dict, List, Any

OWASP_EXPLANATIONS = {
    "A01": {
        "name": "Broken Access Control",
        "what_it_means": "Users can access things they shouldn't — other users' data, admin pages, or hidden files",
        "real_world_example": "A regular user changes their ID in the URL from 123 to 124 and sees someone else's medical records",
        "business_impact": "Data breach, GDPR fines, complete system takeover",
        "quick_fix": "Always verify the logged-in user owns the resource they're requesting before showing it",
    },
    "A02": {
        "name": "Cryptographic Failures",
        "what_it_means": "Sensitive data (passwords, credit cards, tokens) stored or transmitted without proper encryption",
        "real_world_example": "Passwords stored as plain text — if database is hacked, all passwords are immediately readable",
        "business_impact": "Mass credential theft, regulatory fines, permanent reputation damage",
        "quick_fix": "Use bcrypt for passwords, HTTPS everywhere, AES-256 for stored sensitive data",
    },
    "A03": {
        "name": "Injection",
        "what_it_means": "Attacker-controlled data is executed as code — SQL, shell commands, or scripts",
        "real_world_example": "Typing ' OR 1=1-- in a login field bypasses authentication and logs in as admin",
        "business_impact": "Complete database dump, server takeover, data destruction",
        "quick_fix": "Never concatenate user input into queries or commands — use parameterized statements",
    },
    "A04": {
        "name": "Insecure Design",
        "what_it_means": "Security was not considered when designing the system — flaws baked into the architecture",
        "real_world_example": "Password reset sends the new password in plaintext email instead of a secure link",
        "business_impact": "Architectural vulnerabilities cannot be patched with code fixes — require redesign",
        "quick_fix": "Threat model during design phase, apply security patterns before writing code",
    },
    "A05": {
        "name": "Security Misconfiguration",
        "what_it_means": "Default settings, exposed admin pages, verbose error messages, unnecessary features enabled",
        "real_world_example": "Admin panel at /admin is publicly accessible, or error messages show database structure",
        "business_impact": "Easy entry point for attackers — most common vulnerability in real breaches",
        "quick_fix": "Harden all defaults, disable debug mode in production, restrict admin access by IP",
    },
    "A06": {
        "name": "Vulnerable Components",
        "what_it_means": "Using outdated libraries or frameworks with known publicly disclosed exploits",
        "real_world_example": "Using jQuery 1.x which has a known XSS vulnerability that is already publicly exploited",
        "business_impact": "Pre-made exploits exist — any script kiddie can attack without skill",
        "quick_fix": "Run npm audit, pip-audit, or Trivy regularly and update all dependencies",
    },
    "A07": {
        "name": "Identification Failures",
        "what_it_means": "Weak authentication — easy passwords, no MFA, broken session management",
        "real_world_example": "Session token never expires, or default admin:admin credentials still work",
        "business_impact": "Account takeover, impersonation, unauthorized access to all user data",
        "quick_fix": "Enforce strong passwords, implement MFA, expire sessions, use secure random tokens",
    },
    "A08": {
        "name": "Software Integrity Failures",
        "what_it_means": "Untrusted code or data used in updates, plugins, or pipelines without verification",
        "real_world_example": "Auto-updating from an unverified CDN that was compromised (supply chain attack)",
        "business_impact": "Attacker code runs with full application privileges on every server",
        "quick_fix": "Verify checksums of all dependencies, use trusted registries, lock package versions",
    },
    "A09": {
        "name": "Logging Failures",
        "what_it_means": "Security events not logged — breaches go undetected for months",
        "real_world_example": "1000 failed login attempts with no alert — attacker brute-forced password undetected",
        "business_impact": "Cannot detect breaches, no forensic evidence, regulatory non-compliance",
        "quick_fix": "Log all auth events, failed access, admin actions — set up alerts for anomalies",
    },
    "A10": {
        "name": "Server-Side Request Forgery",
        "what_it_means": "Server makes HTTP requests controlled by attacker — used to reach internal systems",
        "real_world_example": "URL parameter accepts http://internal-server/admin — attacker reaches your private network",
        "business_impact": "Internal network access, cloud metadata theft (AWS keys), firewall bypass",
        "quick_fix": "Validate all URLs against allowlist, block internal IP ranges, disable unnecessary URL fetching",
    }
}

PCI_DSS_MAPPING = {
    "Req 6.5.1": {
        "description": "Address SQL Injection vulnerabilities",
        "fix": "Use prepared statements or parameterized queries"
    },
    "Req 6.5.7": {
        "description": "Address Cross-Site Scripting (XSS) vulnerabilities",
        "fix": "Apply proper input validation and output encoding"
    },
    "Req 6.5.8": {
        "description": "Address Broken Access Control",
        "fix": "Implement robust server-side checks for all object access"
    },
    "Req 6.5.3": {
        "description": "Address Insecure Cryptography",
        "fix": "Never hardcode passwords and use strong cryptographic algorithms"
    },
    "Req 2.2": {
        "description": "Harden Default Configurations",
        "fix": "Disable unnecessary services and change default passwords"
    }
}

def calculate_compliance(scan_id: str, findings: List[Any]) -> Dict[str, Any]:
    """Calculate compliance readiness across various frameworks."""
    
    map_path = os.path.join(os.path.dirname(__file__), "../data/compliance_map.json")
    with open(map_path, "r") as f:
        COMPLIANCE_MAP = json.load(f)
    
    # 1. Identify failing findings (Critical and High only that worked)
    failing_findings = [f for f in findings if getattr(f, 'severity', 'info') in ["critical", "high"] and getattr(f, 'attack_worked', False)]
    failing_types = {getattr(f, 'vuln_type', 'Unknown') for f in failing_findings}
    
    # 2. Map findings to OWASP categories
    owasp_failing_map: Dict[str, set] = {} # code -> set of vuln_types
    for f in failing_findings:
        v_type = getattr(f, 'vuln_type', 'Unknown')
        mapping = COMPLIANCE_MAP.get(v_type, {})
        owasp_raw = mapping.get("owasp", "")
        if owasp_raw:
            code = owasp_raw.split(":")[0]
            if code not in owasp_failing_map:
                owasp_failing_map[code] = set()
            owasp_failing_map[code].add(v_type)

    # 3. Build OWASP breakdown
    owasp_breakdown = []
    passing_count = 0
    for code, explanation in OWASP_EXPLANATIONS.items():
        is_failing = code in owasp_failing_map
        if not is_failing:
            passing_count += 1
            
        owasp_breakdown.append({
            "code": code,
            "name": explanation["name"],
            "status": "FAIL" if is_failing else "PASS",
            "what_it_means": explanation["what_it_means"],
            "real_world_example": explanation["real_world_example"],
            "business_impact": explanation["business_impact"],
            "quick_fix": explanation["quick_fix"],
            "failing_findings": list(owasp_failing_map.get(code, []))
        })

    total_owasp = len(OWASP_EXPLANATIONS)
    owasp_score = round((passing_count / total_owasp) * 100) if total_owasp > 0 else 0

    # 4. PCI DSS gaps logic
    pci_gaps = []
    pci_violations = set()
    for vt in failing_types:
        mapping = COMPLIANCE_MAP.get(vt, {})
        vios = mapping.get("pci_dss", [])
        for v in vios:
            pci_violations.add(v)
            req_info = PCI_DSS_MAPPING.get(v, {"description": f"Requirement {v}", "fix": "Remediate as per guidelines"})
            pci_gaps.append({
                "requirement": v,
                "description": req_info["description"],
                "failing_because": vt,
                "how_to_fix": req_info["fix"]
            })

    pci_score = max(0, 100 - (len(pci_violations) * 10)) 

    # 5. HIPAA & GDPR
    hipaa_violations = set()
    gdpr_violations = set()
    for vt in failing_types:
        mapping = COMPLIANCE_MAP.get(vt, {})
        hipaa_violations.update(mapping.get("hipaa", []))
        gdpr_violations.update(mapping.get("gdpr", []))
    
    hipaa_score = max(0, 100 - len(hipaa_violations) * 8)
    gdpr_score = max(0, 100 - len(gdpr_violations) * 7)

    return {
        "scores": {
            "owasp": owasp_score,
            "pci_dss": pci_score,
            "hipaa": hipaa_score,
            "gdpr": gdpr_score
        },
        "owasp_breakdown": owasp_breakdown,
        "pci_dss_gaps": pci_gaps
    }
