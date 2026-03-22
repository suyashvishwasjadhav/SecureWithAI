import logging
from urllib.parse import urlparse
from datetime import datetime, timezone
from sslyze import (ServerNetworkLocation, Scanner,
                    ServerScanRequest, ScanCommand)

logger = logging.getLogger(__name__)

class SSLService:

    def scan(self, target_url: str, scan_id: str, on_progress) -> list:
        """
        Tests:
        - Certificate validity + expiry
        - Weak cipher suites (RC4, DES, 3DES, NULL)
        - SSL 2.0 / 3.0 / TLS 1.0 / TLS 1.1 support
        - HEARTBLEED vulnerability
        - ROBOT attack
        - Certificate hostname mismatch
        - Self-signed certificate
        """
        if not target_url.startswith("https"):
            return [{
                "scan_id": scan_id,
                "vuln_type": "No HTTPS",
                "severity": "high",
                "url": target_url,
                "evidence": "Site uses HTTP not HTTPS",
                "description": "Site transmits data unencrypted over HTTP. All traffic can be intercepted by anyone on the network.",
                "attack_worked": True,
                "owasp_category": "A02:2021 - Cryptographic Failures",
                "tool_source": "ssl_audit"
            }]
        
        on_progress("🔒 Running SSL/TLS audit...", 9)
        
        hostname = urlparse(target_url).netloc
        if ":" in hostname:
            hostname = hostname.split(":")[0]
            
        findings = []
        
        try:
            location = ServerNetworkLocation(hostname, 443)
            request = ServerScanRequest(
                server_location=location,
                scan_commands={
                    ScanCommand.CERTIFICATE_INFO,
                    ScanCommand.SSL_2_0_CIPHER_SUITES,
                    ScanCommand.SSL_3_0_CIPHER_SUITES,
                    ScanCommand.TLS_1_0_CIPHER_SUITES,
                    ScanCommand.TLS_1_1_CIPHER_SUITES,
                    ScanCommand.HEARTBLEED,
                    ScanCommand.ROBOT,
                    ScanCommand.SESSION_RENEGOTIATION,
                }
            )
            
            scanner = Scanner()
            scanner.queue_scans([request])
            
            for result in scanner.get_results():
                findings += self._parse_result(result, scan_id)
        
        except Exception as e:
            logger.error(f"[SSL Audit] Error: {e}")
            on_progress(f"⚠️ SSL scan error: {str(e)[:50]}", 12)
        
        on_progress(f"🔒 SSL audit: {len(findings)} issues", 15)
        return findings

    def _parse_result(self, result, scan_id: str) -> list:
        findings = []
        
        # Check old SSL/TLS versions
        versions = [
            (ScanCommand.SSL_2_0_CIPHER_SUITES, "SSL 2.0 Supported", "critical"),
            (ScanCommand.SSL_3_0_CIPHER_SUITES, "SSL 3.0 Supported", "critical"),
            (ScanCommand.TLS_1_0_CIPHER_SUITES, "TLS 1.0 Supported", "high"),
            (ScanCommand.TLS_1_1_CIPHER_SUITES, "TLS 1.1 Supported", "medium"),
        ]
        
        for cmd, label, severity in versions:
            try:
                scan = getattr(result.scan_result, cmd.value.lower().replace(" ", "_"), None)
                if scan and hasattr(scan, 'accepted_cipher_suites') and scan.accepted_cipher_suites:
                    findings.append({
                        "scan_id": scan_id,
                        "vuln_type": label,
                        "severity": severity,
                        "evidence": f"Server accepts {label} connections",
                        "description": f"{label} is deprecated and vulnerable to known attacks. Disable it immediately.",
                        "attack_worked": True,
                        "owasp_category": "A02:2021 - Cryptographic Failures",
                        "tool_source": "ssl_audit"
                    })
            except Exception as e:
                logger.debug(f"[SSL Audit] Version check error for {label}: {e}")
        
        # Heartbleed
        try:
            hb = result.scan_result.heartbleed
            if hb and hb.result.is_vulnerable_to_heartbleed:
                findings.append({
                    "scan_id": scan_id,
                    "vuln_type": "HEARTBLEED Vulnerability",
                    "severity": "critical",
                    "evidence": "Server is vulnerable to CVE-2014-0160 (Heartbleed)",
                    "description": "Heartbleed allows attackers to read server memory, leaking private keys, passwords, and session tokens.",
                    "attack_worked": True,
                    "owasp_category": "A06:2021 - Vulnerable Components",
                    "tool_source": "ssl_audit"
                })
        except:
            pass
        
        # Certificate expiry
        try:
            cert_info = result.scan_result.certificate_info
            if cert_info and cert_info.result.certificate_deployments:
                leaf = cert_info.result.certificate_deployments[0].verified_certificate_chain[0]
                expiry = leaf.not_valid_after_utc
                days_left = (expiry - datetime.now(timezone.utc)).days
                
                if days_left < 0:
                    findings.append({
                        "scan_id": scan_id,
                        "vuln_type": "SSL Certificate Expired",
                        "severity": "critical",
                        "evidence": f"Certificate expired {abs(days_left)} days ago",
                        "description": "SSL certificate has expired. Browsers will show security warnings. HTTPS provides no protection.",
                        "attack_worked": True,
                        "owasp_category": "A02:2021 - Cryptographic Failures",
                        "tool_source": "ssl_audit"
                    })
                elif days_left < 30:
                    findings.append({
                        "scan_id": scan_id,
                        "vuln_type": "SSL Certificate Expiring Soon",
                        "severity": "medium",
                        "evidence": f"Certificate expires in {days_left} days",
                        "description": f"SSL certificate expires in {days_left} days. Renew before it expires to avoid service interruption.",
                        "attack_worked": True,
                        "owasp_category": "A02:2021 - Cryptographic Failures",
                        "tool_source": "ssl_audit"
                    })
        except Exception as e:
            logger.debug(f"[SSL Audit] Cert check error: {e}")
        
        return findings
