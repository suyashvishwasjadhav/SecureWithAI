import subprocess
import xml.etree.ElementTree as ET
import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

class NmapService:

    def scan(self, target_url: str, scan_id: str, on_progress) -> dict:
        """
        Run Nmap against the target domain.
        Returns: open ports, services, OS guess, tech stack hints.
        """
        domain = urlparse(target_url).netloc
        if not domain:
            domain = target_url # Fallback if URL is already a domain
        
        on_progress("🗺️ Running Nmap port scan...", 3)
        
        # Service version detection + top 1000 ports + script scan
        cmd = [
            "nmap",
            "-sV",          # service version detection
            "-sC",          # default scripts
            "--top-ports", "1000",
            "-T4",          # aggressive timing (faster)
            "-oX", f"/tmp/{scan_id}_nmap.xml",  # XML output
            "--host-timeout", "120s",
            domain
        ]
        
        try:
            subprocess.run(cmd, capture_output=True, text=True, timeout=150)
        except subprocess.TimeoutExpired:
            logger.warning(f"[Nmap] Timeout for {domain}")
            return {}
        except FileNotFoundError:
            on_progress("⚠️ Nmap not available", 5)
            logger.error("[Nmap] Binary not found")
            return {}
        
        return self.parse_nmap_xml(f"/tmp/{scan_id}_nmap.xml", scan_id, on_progress)

    def parse_nmap_xml(self, xml_file: str, scan_id: str, on_progress) -> dict:
        """
        Parse nmap XML output.
        Returns structured dict of ports, services, OS.
        """
        try:
            tree = ET.parse(xml_file)
            root = tree.getroot()
        except Exception as e:
            logger.error(f"[Nmap] Parse error for {xml_file}: {e}")
            return {}
        
        result = {
            "open_ports": [],
            "os_guess": "Unknown",
            "findings": []
        }
        
        for host in root.findall("host"):
            # OS detection
            for osmatch in host.findall(".//osmatch"):
                result["os_guess"] = osmatch.get("name", "Unknown")
                break
            
            # Port + service info
            for port in host.findall(".//port"):
                state = port.find("state")
                if state is None or state.get("state") != "open":
                    continue
                
                portid = port.get("portid")
                service = port.find("service")
                svc_name = service.get("name", "unknown") if service is not None else "unknown"
                svc_version = service.get("version", "") if service is not None else ""
                svc_product = service.get("product", "") if service is not None else ""
                
                port_info = {
                    "port": portid,
                    "service": svc_name,
                    "version": f"{svc_product} {svc_version}".strip(),
                }
                result["open_ports"].append(port_info)
                
                # Flag dangerous open ports as findings
                DANGEROUS_PORTS = {
                    "21": ("FTP Open", "high",
                           "FTP transmits credentials in plaintext"),
                    "23": ("Telnet Open", "critical",
                           "Telnet is unencrypted — credentials exposed"),
                    "3306": ("MySQL Exposed", "critical",
                              "Database port exposed to internet"),
                    "5432": ("PostgreSQL Exposed", "critical",
                              "Database port exposed to internet"),
                    "27017": ("MongoDB Exposed", "critical",
                               "MongoDB port exposed — often no auth"),
                    "6379": ("Redis Exposed", "critical",
                              "Redis exposed — no auth by default"),
                    "9200": ("Elasticsearch Exposed", "critical",
                              "Elasticsearch often has no auth"),
                    "8080": ("Alt HTTP Port Open", "medium",
                              "Secondary HTTP port may bypass WAF"),
                    "8443": ("Alt HTTPS Port Open", "medium",
                              "Secondary HTTPS port"),
                    "2222": ("Alt SSH Port", "low",
                              "SSH on non-standard port"),
                    "22": ("SSH Open", "info",
                            "SSH port accessible"),
                }
                
                if portid in DANGEROUS_PORTS:
                    name, severity, desc = DANGEROUS_PORTS[portid]
                    result["findings"].append({
                        "scan_id": scan_id,
                        "vuln_type": name,
                        "severity": severity,
                        "url": f"Port {portid}/{svc_name}",
                        "evidence": f"Port {portid} open running {svc_product} {svc_version}",
                        "description": desc,
                        "attack_worked": severity in ["critical","high","medium"],
                        "owasp_category": "A05:2021 - Security Misconfiguration",
                        "tool_source": "nmap"
                    })
        
        on_progress(f"🗺️ Nmap: {len(result['open_ports'])} open ports found", 8)
        return result
