import subprocess
import logging
import os
from services.native_attack_service import NativeAttackService

logger = logging.getLogger(__name__)

class CommixService:

    COMMIX_PATH = "/opt/commix/commix.py"

    def scan(self, scan_id: str, post_params: list, on_progress) -> list:
        """
        Test POST forms for OS command injection.
        """
        findings = []
        native = NativeAttackService()
        
        for i, item in enumerate(post_params[:5]):
            on_progress(
                f"💻 Testing command injection on forms...",
                66 + i
            )
            
            tool_worked = False
            if os.path.exists(self.COMMIX_PATH):
                params_str = "&".join(
                    [f"{p}=INJECT" for p in item["params"]]
                )
                
                cmd = [
                    "python3", self.COMMIX_PATH,
                    "-u", item["url"],
                    "--data", params_str,
                    "--batch",
                    "--timeout=10",
                    "--output-dir", f"/tmp/{scan_id}_commix_{i}"
                ]
                
                try:
                    result = subprocess.run(
                        cmd, capture_output=True,
                        text=True, timeout=120
                    )
                    output = result.stdout + result.stderr
                    
                    if "is vulnerable" in output.lower() or \
                       "command injection" in output.lower():
                        tool_worked = True
                        findings.append({
                            "scan_id": scan_id,
                            "vuln_type": "Remote OS Command Injection",
                            "severity": "critical",
                            "url": item["url"],
                            "parameter": ", ".join(item["params"]),
                            "evidence": "Commix confirmed OS command execution",
                            "description": "Command injection confirmed. An attacker can execute arbitrary operating system commands.",
                            "attack_worked": True,
                            "was_attempted": True,
                            "owasp_category": "A03:2021 - Injection",
                            "tool_source": "commix"
                        })
                except Exception as e:
                    logger.debug(f"[Commix] Binary error on {item['url']}: {e}")

            # Fallback
            if not tool_worked:
                for p in item["params"]:
                    native_finding = native.test_command_injection(item["url"], p)
                    if native_finding:
                        native_finding["scan_id"] = scan_id
                        native_finding["was_attempted"] = True
                        findings.append(native_finding)
                        break

        return findings

