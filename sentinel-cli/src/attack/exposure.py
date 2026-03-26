import requests
import re
from bs4 import BeautifulSoup

SENSITIVE_PATHS = [
    "/.env",
    "/.env.local",
    "/.env.production",
    "/.git/config",
    "/.git/HEAD",
    "/swagger.json",
    "/swagger/v1/swagger.json",
    "/api/swagger.json",
    "/openapi.json",
    "/api-docs",
    "/config.json",
    "/robots.txt",
    "/sitemap.xml",
    "/.DS_Store",
    "/backup.zip",
    "/dump.sql",
    "/phpinfo.php",
    "/server-status",
    "/actuator",
    "/actuator/env",
    "/actuator/health",
    "/_next/static/chunks/",
]

def check_exposure(target_url, console=None):
    def log(msg):
        if console: console.print(msg)
        else: print(msg)

    log("[yellow][*] Checking for exposed sensitive files...[/yellow]")

    findings = []
    target_url = target_url.rstrip("/")

    for path in SENSITIVE_PATHS:
        try:
            url = target_url + path
            r = requests.get(url, timeout=5, verify=False,
                           allow_redirects=False)

            if r.status_code in [200, 301, 302]:
                severity = "High"
                description = f"Sensitive path accessible: {path}"

                # Upgrade severity for really dangerous ones
                if any(x in path for x in [".env", ".git", "swagger",
                                            "actuator", "dump.sql"]):
                    severity = "High"
                    description = f"CRITICAL exposure: {path} is accessible. "
                    if ".env" in path:
                        description += "May contain API keys, DB credentials."
                    elif ".git" in path:
                        description += "Source code may be downloadable."
                    elif "swagger" in path:
                        description += "Full API documentation exposed to attackers."
                    elif "actuator" in path:
                        description += "Spring Boot actuator exposed — server internals visible."

                findings.append({
                    "tool": "exposure",
                    "vuln_type": f"Exposed File: {path}",
                    "severity": severity,
                    "endpoint": url,
                    "method": "GET",
                    "evidence": f"HTTP {r.status_code}",
                    "description": description,
                    "hacker_impact": f"Attacker can access {path} directly"
                })
                log(f"[red]  [!] FOUND: {path} → HTTP {r.status_code}[/red]")
            else:
                log(f"[dim]  [ ] {path} → {r.status_code}[/dim]")

        except Exception:
            continue

    # Also extract API routes from JS bundle if Next.js
    try:
        r = requests.get(target_url, timeout=8, verify=False)
        soup = BeautifulSoup(r.text, 'html.parser')
        scripts = [s.get('src','') for s in soup.find_all('script', src=True)]

        for script_src in scripts[:5]:  # check first 5 JS files
            if not script_src: continue
            url = target_url + script_src if script_src.startswith('/') else script_src
            try:
                js = requests.get(url, timeout=8, verify=False).text
                routes = re.findall(r'["\'](/api/[^"\'?\s]{3,50})["\']', js)
                routes += re.findall(r'["\'](/rest/[^"\'?\s]{3,50})["\']', js)
                if routes:
                    findings.append({
                        "tool": "exposure",
                        "vuln_type": "API Routes Extracted from JS Bundle",
                        "severity": "Medium",
                        "endpoint": url,
                        "method": "GET",
                        "evidence": f"Found {len(set(routes))} API routes in JS",
                        "description": f"API routes visible in JS bundle: {list(set(routes))[:10]}",
                        "hacker_impact": "Attacker has a complete map of your API without needing docs"
                    })
                    log(f"[yellow]  [!] {len(set(routes))} API routes extracted from JS[/yellow]")
                    break
            except:
                continue
    except:
        pass

    log(f"[green][+] Exposure check complete — {len(findings)} findings[/green]")
    return findings