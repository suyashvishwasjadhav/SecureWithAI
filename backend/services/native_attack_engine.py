import requests
import re
import json
import time
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
from typing import Optional, List, Any
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SESSION_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ShieldSentinel/1.0)",
    "Accept": "text/html,application/xhtml+xml,application/json,*/*",
}

class NativeAttackEngine:
    """
    Pure Python attack engine. No external binaries.
    Always works. Always produces results.
    """

    def __init__(self, target_url: str, scan_id: str, timeout: int = 10):
        self.target = target_url.rstrip('/')
        self.scan_id = scan_id
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(SESSION_HEADERS)
        self.session.verify = False
        self.findings = []

    # 1. SECURITY HEADERS CHECK
    def check_security_headers(self) -> list:
        findings = []
        try:
            resp = self.session.get(
                self.target, timeout=self.timeout,
                allow_redirects=True
            )
            headers = {k.lower(): v for k, v in resp.headers.items()}

            REQUIRED_HEADERS = {
                "x-frame-options": {
                    "vuln_type": "Missing Anti-Clickjacking Header",
                    "severity": "medium",
                    "description": "X-Frame-Options header is missing. Attackers can embed your site in an iframe on a malicious page and trick users into clicking buttons they cannot see (clickjacking attack). A user could unknowingly transfer money, change settings, or delete their account.",
                    "fix": "Add to your web server: X-Frame-Options: DENY",
                    "attack_name": "Clickjacking / UI Redressing",
                    "owasp": "A05:2021 - Security Misconfiguration",
                    "money_loss_min": 10000,
                    "money_loss_max": 500000,
                },
                "content-security-policy": {
                    "vuln_type": "Content Security Policy (CSP) Header Not Set",
                    "severity": "medium",
                    "description": "No Content Security Policy set. Without CSP, any injected JavaScript will execute in users' browsers. This makes XSS attacks significantly more impactful — attackers can steal sessions, redirect users, and mine cryptocurrency using your visitors' computers.",
                    "fix": "Add: Content-Security-Policy: default-src 'self'; script-src 'self'",
                    "attack_name": "Cross-Site Scripting (XSS) Amplification",
                    "owasp": "A05:2021 - Security Misconfiguration",
                    "money_loss_min": 5000,
                    "money_loss_max": 200000,
                },
                "strict-transport-security": {
                    "vuln_type": "Strict-Transport-Security Header Not Set",
                    "severity": "medium",
                    "description": "HSTS header missing. Without it, browsers may connect over HTTP first, allowing attackers on the same network to intercept and downgrade the connection before HTTPS is established (SSL stripping attack).",
                    "fix": "Add: Strict-Transport-Security: max-age=31536000; includeSubDomains",
                    "attack_name": "SSL Stripping / MITM",
                    "owasp": "A02:2021 - Cryptographic Failures",
                    "money_loss_min": 50000,
                    "money_loss_max": 2000000,
                },
                "x-content-type-options": {
                    "vuln_type": "X-Content-Type-Options Header Missing",
                    "severity": "low",
                    "description": "Browser MIME sniffing enabled. Attackers can upload files with wrong MIME types that browsers will execute as scripts or HTML, bypassing content type restrictions.",
                    "fix": "Add: X-Content-Type-Options: nosniff",
                    "attack_name": "MIME Sniffing Attack",
                    "owasp": "A05:2021 - Security Misconfiguration",
                    "money_loss_min": 1000,
                    "money_loss_max": 50000,
                },
                "referrer-policy": {
                    "vuln_type": "Referrer-Policy Header Missing",
                    "severity": "low",
                    "description": "Referrer-Policy not set. Full URL (including tokens, IDs in query params) sent to external sites when users click outbound links.",
                    "fix": "Add: Referrer-Policy: strict-origin-when-cross-origin",
                    "attack_name": "Referrer Leakage",
                    "owasp": "A05:2021 - Security Misconfiguration",
                    "money_loss_min": 500,
                    "money_loss_max": 20000,
                },
                "permissions-policy": {
                    "vuln_type": "Permissions-Policy Header Missing",
                    "severity": "low",
                    "description": "No Permissions-Policy header. Attackers can use injected scripts to access camera, microphone, and location APIs in users' browsers.",
                    "fix": "Add: Permissions-Policy: camera=(), microphone=(), geolocation=()",
                    "attack_name": "Browser API Abuse",
                    "owasp": "A05:2021 - Security Misconfiguration",
                    "money_loss_min": 500,
                    "money_loss_max": 10000,
                },
            }

            for header_key, info in REQUIRED_HEADERS.items():
                if header_key not in headers:
                    findings.append(self._make_finding(
                        vuln_type=info["vuln_type"],
                        severity=info["severity"],
                        url=self.target,
                        evidence=f"Header '{header_key}' not present. Available: {[k for i, k in enumerate(headers.keys()) if i < 8]}",
                        description=info["description"],
                        attack_worked=True,
                        owasp=info["owasp"],
                        tool_source="native_engine",
                        extra={
                            "attack_name": info["attack_name"],
                            "quick_fix": info["fix"],
                            "money_loss_min": info["money_loss_min"],
                            "money_loss_max": info["money_loss_max"],
                            "was_attempted": True,
                        }
                    ))
                else:
                    findings.append(self._make_finding(
                        vuln_type=info["vuln_type"],
                        severity="info",
                        url=self.target,
                        evidence=f"Header present: {''.join([c for i, c in enumerate(headers[header_key]) if i < 80])}",
                        description=f"Header is correctly set.",
                        attack_worked=False,
                        owasp=info["owasp"],
                        tool_source="native_engine",
                        extra={"was_attempted": True}
                    ))

        except Exception as e:
            findings.append(self._make_finding(
                vuln_type="Security Headers Check",
                severity="info",
                url=self.target,
                evidence=f"Could not connect: {''.join([c for i, c in enumerate(str(e)) if i < 100])}",
                description="Could not fetch headers — target may be unreachable",
                attack_worked=False,
                owasp="A05:2021",
                tool_source="native_engine",
                extra={"was_attempted": True}
            ))

        return findings

    # 2. COOKIE SECURITY CHECK
    def check_cookie_security(self) -> list:
        findings = []
        try:
            resp = self.session.get(
                self.target, timeout=self.timeout
            )

            raw_cookies = resp.headers.get('set-cookie', '')
            all_cookie_headers = resp.raw.headers.getlist('Set-Cookie') if hasattr(resp.raw, 'headers') else []

            if not all_cookie_headers and raw_cookies:
                all_cookie_headers = [raw_cookies]

            if not all_cookie_headers:
                findings.append(self._make_finding(
                    vuln_type="Cookie Without Secure Flag",
                    severity="info",
                    url=self.target,
                    evidence="No Set-Cookie headers found in response",
                    description="No cookies set on this response.",
                    attack_worked=False,
                    owasp="A02:2021 - Cryptographic Failures",
                    tool_source="native_engine",
                    extra={"was_attempted": True}
                ))
                return findings

            for cookie_str in all_cookie_headers:
                cookie_lower = cookie_str.lower()
                name = cookie_str.split('=')[0].strip()

                if 'secure' not in cookie_lower:
                    findings.append(self._make_finding(
                        vuln_type="Cookie Without Secure Flag",
                        severity="medium",
                        url=self.target,
                        evidence=f"Cookie '{name}' missing Secure flag. Raw: {''.join([c for i, c in enumerate(cookie_str) if i < 120])}",
                        description=f"Cookie '{name}' can be transmitted over unencrypted HTTP. An attacker on the same network can steal this cookie and hijack the user's session.",
                        attack_worked=True,
                        owasp="A02:2021 - Cryptographic Failures",
                        tool_source="native_engine",
                        extra={
                            "attack_name": "Session Hijacking via Cookie Theft",
                            "quick_fix": f"Set-Cookie: {name}=value; Secure; HttpOnly; SameSite=Strict",
                            "money_loss_min": 5000,
                            "money_loss_max": 100000,
                            "was_attempted": True,
                        }
                    ))

                if 'httponly' not in cookie_lower:
                    findings.append(self._make_finding(
                        vuln_type="Cookie No HttpOnly Flag",
                        severity="medium",
                        url=self.target,
                        evidence=f"Cookie '{name}' missing HttpOnly flag. Raw: {''.join([c for i, c in enumerate(cookie_str) if i < 120])}",
                        description=f"Cookie '{name}' accessible via JavaScript. Any XSS vulnerability allows attackers to steal this cookie with document.cookie and fully impersonate the user.",
                        attack_worked=True,
                        owasp="A02:2021 - Cryptographic Failures",
                        tool_source="native_engine",
                        extra={
                            "attack_name": "XSS Cookie Theft",
                            "quick_fix": f"Add HttpOnly flag: Set-Cookie: {name}=value; HttpOnly; Secure",
                            "money_loss_min": 5000,
                            "money_loss_max": 500000,
                            "was_attempted": True,
                        }
                    ))

        except Exception as e:
            pass

        return findings

    # 3. XSS TESTING (REFLECTED)
    def test_xss_reflected(self, urls_with_params: list) -> list:
        findings = []

        XSS_PAYLOADS = [
            '<script>alert(1)</script>',
            '"><script>alert(1)</script>',
            "'><script>alert(1)</script>",
            '<img src=x onerror=alert(1)>',
            '<svg onload=alert(1)>',
            '"><img src=x onerror=alert(1)>',
            "javascript:alert(1)",
            '<body onload=alert(1)>',
            '{{7*7}}',  # template injection indicator
        ]

        tested = set()

        for item in [x for i, x in enumerate(urls_with_params) if i < 15]:
            url = item.get('url', '')
            param = item.get('param', '')

            if not url or not param:
                continue

            key = f"{url}:{param}"
            if key in tested:
                continue
            tested.add(key)

            for payload in [p for i, p in enumerate(XSS_PAYLOADS) if i < 4]:
                try:
                    parsed = urlparse(url)
                    params = parse_qs(parsed.query)
                    params[param] = [payload]
                    new_query = urlencode(params, doseq=True)
                    test_url = urlunparse(parsed._replace(query=new_query))

                    resp = self.session.get(
                        test_url, timeout=self.timeout,
                        allow_redirects=True
                    )

                    body = resp.text
                    if payload in body or payload.lower() in body.lower():
                        findings.append(self._make_finding(
                            vuln_type="Cross Site Scripting (Reflected)",
                            severity="high",
                            url=test_url,
                            parameter=param,
                            evidence=f"Payload reflected unencoded: {payload}",
                            description=f"Reflected XSS confirmed. Parameter '{param}' reflects user input without encoding. An attacker sends a victim a crafted URL — when clicked, the malicious script runs in the victim's browser, stealing their session cookie and fully compromising their account.",
                            attack_worked=True,
                            owasp="A03:2021 - Injection",
                            tool_source="native_engine",
                            extra={
                                "attack_name": "Reflected Cross-Site Scripting",
                                "confirmed_payload": payload,
                                "quick_fix": f"Encode output: htmlspecialchars($_GET['{param}'])",
                                "money_loss_min": 10000,
                                "money_loss_max": 2000000,
                                "was_attempted": True,
                            }
                        ))
                        break

                except Exception:
                    continue

        if not findings and urls_with_params:
            findings.append(self._make_finding(
                vuln_type="Cross Site Scripting (Reflected)",
                severity="info",
                url=self.target,
                evidence=f"Tested {min(len(urls_with_params),15)} URLs with XSS payloads. No reflection detected.",
                description="XSS payloads were not reflected unencoded in responses. Encoding appears to be working.",
                attack_worked=False,
                owasp="A03:2021 - Injection",
                tool_source="native_engine",
                extra={"was_attempted": True}
            ))

        return findings

    # 4. CSRF DETECTION
    def test_csrf(self, forms: list) -> list:
        findings = []

        CSRF_TOKEN_NAMES = [
            'csrf', 'token', '_token', 'csrftoken',
            'csrf_token', 'xsrf', '_csrf', 'authenticity_token',
            'anti_csrf', 'nonce', 'verification_token'
        ]

        for form in [f for i, f in enumerate(forms) if i < 10]:
            form_params = [p.lower() for p in form.get('params', [])]
            url = form.get('url', self.target)
            method = form.get('type', 'POST')

            has_csrf = any(
                any(csrf_name in param for csrf_name in CSRF_TOKEN_NAMES)
                for param in form_params
            )

            if method == 'POST' and not has_csrf:
                findings.append(self._make_finding(
                    vuln_type="Cross-Site Request Forgery",
                    severity="high",
                    url=url,
                    evidence=f"POST form found with params {form_params} — no CSRF token field detected",
                    description=f"Form at {url} accepts POST requests without a CSRF token. An attacker can create a malicious webpage that silently submits this form as the logged-in victim. If the form handles money transfers, account changes, or deletions — the attacker can trigger these actions without the user knowing.",
                    attack_worked=True,
                    owasp="A01:2021 - Broken Access Control",
                    tool_source="native_engine",
                    extra={
                        "attack_name": "Cross-Site Request Forgery (CSRF)",
                        "quick_fix": "Add hidden CSRF token field: <input type='hidden' name='csrf_token' value='{{ csrf_token() }}'>",
                        "money_loss_min": 25000,
                        "money_loss_max": 5000000,
                        "was_attempted": True,
                    }
                ))
            elif method == 'POST' and has_csrf:
                findings.append(self._make_finding(
                    vuln_type="Cross-Site Request Forgery",
                    severity="info",
                    url=url,
                    evidence=f"CSRF token found in form params",
                    description="CSRF protection detected in form.",
                    attack_worked=False,
                    owasp="A01:2021 - Broken Access Control",
                    tool_source="native_engine",
                    extra={"was_attempted": True}
                ))

        return findings

    # 5. PATH TRAVERSAL
    def test_path_traversal(self, urls_with_params: list) -> list:
        findings = []

        PATH_PAYLOADS = [
            '../../../etc/passwd',
            '..%2F..%2F..%2Fetc%2Fpasswd',
            '....//....//....//etc/passwd',
            '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
            '../../../windows/win.ini',
            '..\\..\\..\\windows\\win.ini',
        ]

        LINUX_INDICATORS = [
            'root:x:', 'daemon:', '/bin/bash',
            '/etc/passwd', 'nobody:'
        ]
        WINDOWS_INDICATORS = [
            '[extensions]', '[fonts]', '[mci'
        ]

        for item in urls_with_params[:10]:
            url = item.get('url', '')
            param = item.get('param', '')

            if not any(k in param.lower() for k in ['file','path','page','doc','template','load','read','include','dir','folder']):
                continue

            for payload in PATH_PAYLOADS:
                try:
                    parsed = urlparse(url)
                    params = parse_qs(parsed.query)
                    params[param] = [payload]
                    new_query = urlencode(params, doseq=True)
                    test_url = urlunparse(parsed._replace(query=new_query))

                    resp = self.session.get(
                        test_url, timeout=self.timeout
                    )
                    body = resp.text

                    if any(ind in body for ind in LINUX_INDICATORS + WINDOWS_INDICATORS):
                        findings.append(self._make_finding(
                            vuln_type="Path Traversal",
                            severity="critical",
                            url=test_url,
                            parameter=param,
                            evidence=f"File contents leaked. Payload: {payload}. Response contains system file content.",
                            description=f"Path traversal confirmed in parameter '{param}'. Attacker can read ANY file on the server — including /etc/passwd (user list), SSH private keys, database credentials, and application source code.",
                            attack_worked=True,
                            owasp="A01:2021 - Broken Access Control",
                            tool_source="native_engine",
                            extra={
                                "attack_name": "Directory Traversal / Local File Inclusion",
                                "quick_fix": f"Validate and sanitize '{param}': use os.path.basename() and restrict to allowed directories only",
                                "money_loss_min": 100000,
                                "money_loss_max": 10000000,
                                "was_attempted": True,
                            }
                        ))
                        break

                except Exception:
                    continue

        if not findings:
            findings.append(self._make_finding(
                vuln_type="Path Traversal",
                severity="info",
                url=self.target,
                evidence="No file-path parameters detected or traversal payloads blocked",
                description="Path traversal test completed. No vulnerable file parameters found.",
                attack_worked=False,
                owasp="A01:2021 - Broken Access Control",
                tool_source="native_engine",
                extra={"was_attempted": True}
            ))

        return findings

    # 6. SSRF TESTING
    def test_ssrf(self, urls_with_params: list) -> list:
        findings = []

        SSRF_PAYLOADS = [
            'http://169.254.169.254/latest/meta-data/',
            'http://localhost:8080/',
            'http://127.0.0.1/admin',
            'http://0.0.0.0:22/',
            'http://[::]:80/',
        ]

        SSRF_INDICATORS = [
            'ami-id', 'instance-id', 'local-ipv4',
            'security-credentials', 'root:x:',
            'localhost', '127.0.0.1'
        ]

        URL_PARAMS = ['url', 'src', 'href', 'link',
                      'redirect', 'fetch', 'load',
                      'endpoint', 'proxy', 'callback',
                      'dest', 'target', 'uri']

        for item in urls_with_params[:10]:
            param = item.get('param', '')
            url = item.get('url', '')

            if not any(up in param.lower() for up in URL_PARAMS):
                continue

            for payload in [p for i, p in enumerate(SSRF_PAYLOADS) if i < 3]:
                try:
                    parsed = urlparse(url)
                    params = parse_qs(parsed.query)
                    params[param] = [payload]
                    new_query = urlencode(params, doseq=True)
                    test_url = urlunparse(parsed._replace(query=new_query))

                    resp = self.session.get(
                        test_url, timeout=8,
                        allow_redirects=False
                    )

                    if any(ind in resp.text for ind in SSRF_INDICATORS) or resp.status_code in [200, 301, 302]:
                        body_preview = resp.text[:200]
                        if any(ind in body_preview for ind in SSRF_INDICATORS):
                            findings.append(self._make_finding(
                                vuln_type="Server Side Request Forgery",
                                severity="critical",
                                url=test_url,
                                parameter=param,
                                evidence=f"SSRF payload {payload} triggered response: {body_preview[:100]}",
                                description=f"SSRF confirmed in '{param}'. Attacker can make your server fetch internal URLs — reading AWS credentials, internal admin panels, databases, and other services not exposed to the internet.",
                                attack_worked=True,
                                owasp="A10:2021 - SSRF",
                                tool_source="native_engine",
                                extra={
                                    "attack_name": "Server-Side Request Forgery",
                                    "quick_fix": f"Validate '{param}' against allowlist of trusted domains. Block all internal IPs (127.x.x.x, 10.x.x.x, 192.168.x.x, 169.254.x.x)",
                                    "money_loss_min": 200000,
                                    "money_loss_max": 50000000,
                                    "was_attempted": True,
                                }
                            ))
                            break

                except Exception:
                    continue

        if not findings:
            findings.append(self._make_finding(
                vuln_type="Server Side Request Forgery",
                severity="info",
                url=self.target,
                evidence="No URL-accepting parameters found or SSRF payloads blocked",
                description="SSRF test completed. No vulnerable URL parameters found.",
                attack_worked=False,
                owasp="A10:2021 - SSRF",
                tool_source="native_engine",
                extra={"was_attempted": True}
            ))

        return findings

    # 7. OPEN REDIRECT
    def test_open_redirect(self, urls_with_params: list) -> list:
        findings = []

        REDIRECT_PARAMS = ['redirect', 'url', 'next',
                           'return', 'goto', 'returnto',
                           'destination', 'redir', 'target']

        REDIRECT_PAYLOADS = [
            'https://evil.com',
            '//evil.com',
            '/\\evil.com',
            'https:evil.com',
        ]

        for item in urls_with_params[:10]:
            param = item.get('param', '')
            url = item.get('url', '')

            if not any(rp in param.lower() for rp in REDIRECT_PARAMS):
                continue

            for payload in REDIRECT_PAYLOADS:
                try:
                    parsed = urlparse(url)
                    params = parse_qs(parsed.query)
                    params[param] = [payload]
                    new_query = urlencode(params, doseq=True)
                    test_url = urlunparse(parsed._replace(query=new_query))

                    resp = self.session.get(
                        test_url, timeout=self.timeout,
                        allow_redirects=False
                    )

                    location = resp.headers.get('location','')
                    if resp.status_code in [301,302,303,307,308]:
                        if 'evil.com' in location:
                            findings.append(self._make_finding(
                                vuln_type="External Redirect",
                                severity="medium",
                                url=test_url,
                                parameter=param,
                                evidence=f"Server redirected to: {location}",
                                description=f"Open redirect in '{param}'. Attacker sends phishing link using your trusted domain (yoursite.com/login?redirect=https://evil.com) to steal credentials on a fake site.",
                                attack_worked=True,
                                owasp="A01:2021 - Broken Access Control",
                                tool_source="native_engine",
                                extra={
                                    "attack_name": "Open Redirect / Phishing Amplifier",
                                    "quick_fix": f"Validate '{param}' against allowlist of trusted domains before redirecting",
                                    "money_loss_min": 5000,
                                    "money_loss_max": 500000,
                                    "was_attempted": True,
                                }
                            ))
                            break

                except Exception:
                    continue

        if not findings:
            findings.append(self._make_finding(
                vuln_type="External Redirect",
                severity="info",
                url=self.target,
                evidence="No redirect parameters found or redirect validation is working",
                description="Open redirect test completed. No vulnerable redirect parameters found.",
                attack_worked=False,
                owasp="A01:2021 - Broken Access Control",
                tool_source="native_engine",
                extra={"was_attempted": True}
            ))

        return findings

    # 8. DIRECTORY BROWSING
    def test_directory_browsing(self) -> list:
        findings = []

        COMMON_DIRS = [
            '/uploads/', '/backup/', '/admin/',
            '/files/', '/data/', '/logs/', '/tmp/',
            '/assets/', '/media/', '/static/',
            '/config/', '/src/', '/app/',
        ]

        DIR_INDICATORS = [
            'Index of /', 'Directory listing',
            'Parent Directory', '[DIR]',
            'Last modified', 'Name</a>',
        ]

        for path in COMMON_DIRS:
            try:
                test_url = self.target + path
                resp = self.session.get(
                    test_url, timeout=self.timeout
                )

                if resp.status_code == 200 and any(ind in resp.text for ind in DIR_INDICATORS):
                    findings.append(self._make_finding(
                        vuln_type="Directory Browsing",
                        severity="high",
                        url=test_url,
                        evidence=f"Directory listing enabled at {path}",
                        description=f"Directory listing enabled at {test_url}. Anyone can browse all files in this directory — exposing config files, backups, uploaded files, and source code.",
                        attack_worked=True,
                        owasp="A05:2021 - Security Misconfiguration",
                        tool_source="native_engine",
                        extra={
                            "attack_name": "Directory Traversal / Information Disclosure",
                            "quick_fix": "Disable directory listing in your web server. Nginx: add 'autoindex off;'. Apache: add 'Options -Indexes'",
                            "money_loss_min": 50000,
                            "money_loss_max": 5000000,
                            "was_attempted": True,
                        }
                    ))

            except Exception:
                continue

        if not findings:
            findings.append(self._make_finding(
                vuln_type="Directory Browsing",
                severity="info",
                url=self.target,
                evidence="Directory listing disabled on all tested paths",
                description="Directory browsing test completed. Listing appears disabled.",
                attack_worked=False,
                owasp="A05:2021 - Security Misconfiguration",
                tool_source="native_engine",
                extra={"was_attempted": True}
            ))

        return findings

    # 9. INSECURE HTTP METHODS
    def test_insecure_http_methods(self) -> list:
        findings = []
        DANGEROUS_METHODS = ['PUT', 'DELETE', 'TRACE', 'CONNECT', 'OPTIONS']

        try:
            options_resp = self.session.options(
                self.target, timeout=self.timeout
            )
            allow_header = options_resp.headers.get('Allow', '')

            for method in DANGEROUS_METHODS:
                if method in allow_header:
                    severity = 'critical' if method in ['PUT','DELETE','TRACE'] else 'medium'
                    findings.append(self._make_finding(
                        vuln_type="Insecure HTTP Method",
                        severity=severity,
                        url=self.target,
                        evidence=f"Server allows {method} method. Allow header: {allow_header}",
                        description=f"HTTP {method} method enabled. {self._method_risk(method)}",
                        attack_worked=True,
                        owasp="A05:2021 - Security Misconfiguration",
                        tool_source="native_engine",
                        extra={
                            "attack_name": f"HTTP {method} Abuse",
                            "quick_fix": f"Disable {method} in your web server config. Only allow GET, POST, HEAD.",
                            "money_loss_min": 50000,
                            "money_loss_max": 10000000,
                            "was_attempted": True,
                        }
                    ))

            if not findings:
                findings.append(self._make_finding(
                    vuln_type="Insecure HTTP Method",
                    severity="info",
                    url=self.target,
                    evidence=f"Allowed methods: {allow_header or 'not disclosed'}",
                    description="Dangerous HTTP methods appear restricted.",
                    attack_worked=False,
                    owasp="A05:2021 - Security Misconfiguration",
                    tool_source="native_engine",
                    extra={"was_attempted": True}
                ))

        except Exception as e:
            findings.append(self._make_finding(
                vuln_type="Insecure HTTP Method",
                severity="info",
                url=self.target,
                evidence=f"Could not test: {str(e)[:80]}",
                description="HTTP method test could not complete.",
                attack_worked=False,
                owasp="A05:2021 - Security Misconfiguration",
                tool_source="native_engine",
                extra={"was_attempted": True}
            ))

        return findings

    # 10. APPLICATION ERROR DISCLOSURE
    def test_error_disclosure(self) -> list:
        findings = []

        ERROR_PAYLOADS = [
            "/?id='", "/?q=<", "/?p=../",
            "/nonexistent_page_12345",
            "/?id=1 AND 1=2--",
        ]

        ERROR_PATTERNS = [
            r'Exception in thread',
            r'Traceback \(most recent call last\)',
            r'SyntaxError:',
            r'Fatal error:.*on line',
            r'mysql_fetch_array\(\)',
            r'ORA-\d{5}',
            r'Microsoft OLE DB Provider',
            r'Stack trace:',
            r'at java\.lang\.',
            r'django\.core\.exceptions',
            r'ActiveRecord::',
            r'Warning: include\(',
            r'Parse error:',
            r'SQLSTATE\[',
        ]

        for payload in ERROR_PAYLOADS:
            try:
                test_url = self.target + payload
                resp = self.session.get(
                    test_url, timeout=self.timeout
                )

                for pattern in ERROR_PATTERNS:
                    if re.search(pattern, resp.text, re.IGNORECASE):
                        snippet = re.search(pattern, resp.text, re.IGNORECASE)
                        context_start = max(0, snippet.start()-50)
                        context = resp.text[context_start:context_start+200]

                        findings.append(self._make_finding(
                            vuln_type="Application Error Disclosure",
                            severity="medium",
                            url=test_url,
                            evidence=f"Error leaked: {context[:150]}",
                            description=f"Application exposes detailed error messages. Error messages reveal: stack traces, file paths, database queries, server technology, and framework internals. Attackers use this to map the system and craft targeted exploits.",
                            attack_worked=True,
                            owasp="A05:2021 - Security Misconfiguration",
                            tool_source="native_engine",
                            extra={
                                "attack_name": "Information Disclosure / Error Leakage",
                                "quick_fix": "Disable debug mode in production. Set: DEBUG=False (Django), display_errors=Off (PHP), NODE_ENV=production (Node.js)",
                                "money_loss_min": 10000,
                                "money_loss_max": 1000000,
                                "was_attempted": True,
                            }
                        ))
                        return findings

            except Exception:
                continue

        findings.append(self._make_finding(
            vuln_type="Application Error Disclosure",
            severity="info",
            url=self.target,
            evidence="Error payloads did not trigger verbose error messages",
            description="Error disclosure test completed. Application appears to handle errors gracefully.",
            attack_worked=False,
            owasp="A05:2021 - Security Misconfiguration",
            tool_source="native_engine",
            extra={"was_attempted": True}
        ))

        return findings

    # 11. AUTHENTICATION BYPASS
    def test_auth_bypass(self) -> list:
        findings = []

        AUTH_PATHS = [
            '/admin', '/admin/', '/admin/dashboard',
            '/dashboard', '/panel', '/cpanel',
            '/admin/login', '/administrator',
            '/wp-admin', '/admin/index.php',
            '/api/admin', '/api/users', '/api/v1/admin',
        ]

        BYPASS_HEADERS = {
            'X-Forwarded-For': '127.0.0.1',
            'X-Real-IP': '127.0.0.1',
            'X-Forwarded-Host': 'localhost',
            'X-Custom-IP-Authorization': '127.0.0.1',
        }

        for path in AUTH_PATHS:
            try:
                url = self.target + path

                normal = self.session.get(
                    url, timeout=self.timeout,
                    allow_redirects=False
                )

                if normal.status_code in [401, 403]:
                    bypass_resp = self.session.get(
                        url, timeout=self.timeout,
                        headers=BYPASS_HEADERS,
                        allow_redirects=False
                    )

                    if bypass_resp.status_code == 200:
                        findings.append(self._make_finding(
                            vuln_type="Authentication Bypass",
                            severity="critical",
                            url=url,
                            evidence=f"Normal request: {normal.status_code}. With bypass headers: {bypass_resp.status_code} 200 OK. Headers used: {BYPASS_HEADERS}",
                            description=f"Authentication bypass via header spoofing at {path}. Server trusts X-Forwarded-For header and grants access when set to 127.0.0.1. Attacker bypasses login completely and accesses protected admin areas.",
                            attack_worked=True,
                            owasp="A07:2021 - Identification Failures",
                            tool_source="native_engine",
                            extra={
                                "attack_name": "IP Spoofing Authentication Bypass",
                                "quick_fix": "Never trust X-Forwarded-For for authentication. Use server-side session validation only.",
                                "money_loss_min": 500000,
                                "money_loss_max": 100000000,
                                "was_attempted": True,
                            }
                        ))
                        break

                elif normal.status_code == 200:
                    findings.append(self._make_finding(
                        vuln_type="Authentication Bypass",
                        severity="critical",
                        url=url,
                        evidence=f"{path} returns 200 OK without any authentication",
                        description=f"Admin path {path} is publicly accessible without authentication. Complete admin takeover is trivial.",
                        attack_worked=True,
                        owasp="A07:2021 - Identification Failures",
                        tool_source="native_engine",
                        extra={
                            "attack_name": "Unauthenticated Admin Access",
                            "quick_fix": f"Protect {path} with proper authentication middleware",
                            "money_loss_min": 500000,
                            "money_loss_max": 100000000,
                            "was_attempted": True,
                        }
                    ))
                    break

            except Exception:
                continue

        if not findings:
            findings.append(self._make_finding(
                vuln_type="Authentication Bypass",
                severity="info",
                url=self.target,
                evidence="Admin paths returned 401/403 and header bypass failed",
                description="Authentication bypass test completed. Auth controls appear to be working.",
                attack_worked=False,
                owasp="A07:2021 - Identification Failures",
                tool_source="native_engine",
                extra={"was_attempted": True}
            ))

        return findings

    # HELPER METHODS
    def _make_finding(self, vuln_type, severity, url="",
                      parameter=None, evidence="",
                      description="", attack_worked=True,
                      owasp="", tool_source="native",
                      extra=None) -> dict:
        f = {
            "scan_id": self.scan_id,
            "vuln_type": vuln_type,
            "severity": severity,
            "url": url or self.target,
            "parameter": parameter,
            "evidence": evidence,
            "description": description,
            "attack_worked": attack_worked,
            "owasp_category": owasp,
            "tool_source": tool_source,
            "was_attempted": True,
        }
        if extra:
            f.update(extra)
        return f

    def _method_risk(self, method: str) -> str:
        risks = {
            "PUT": "Attackers can upload arbitrary files — including web shells — to the server.",
            "DELETE": "Attackers can delete files from the server.",
            "TRACE": "TRACE enables Cross-Site Tracing (XST) attacks that steal cookies even with HttpOnly flag.",
            "CONNECT": "Can be used as a proxy to reach internal services.",
            "OPTIONS": "Reveals all supported methods — useful reconnaissance for attackers.",
        }
        return risks.get(method, f"{method} can be abused.")

    def run_all_native_attacks(self, get_params=None, post_forms=None) -> list:
        all_findings = []
        params = get_params or []
        forms = post_forms or []

        all_findings += self.check_security_headers()
        all_findings += self.check_cookie_security()
        all_findings += self.test_xss_reflected(params)
        all_findings += self.test_csrf(forms)
        all_findings += self.test_path_traversal(params)
        all_findings += self.test_ssrf(params)
        all_findings += self.test_open_redirect(params)
        all_findings += self.test_directory_browsing()
        all_findings += self.test_insecure_http_methods()
        all_findings += self.test_error_disclosure()
        all_findings += self.test_auth_bypass()

        return all_findings
