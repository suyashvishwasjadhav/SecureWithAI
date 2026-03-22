import urllib.parse
from typing import Dict, List, Any

def build_attack_surface(scan_id: str, discovered_urls: List[str], findings: List[Any], 
                         tech_stack: Any = None, open_ports: List[Any] = None, 
                         os_guess: str = "Unknown", api_endpoints: List[Any] = None) -> Dict[str, Any]:
    """Build a comprehensive representation of the attack surface."""
    
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    
    # Tree: path -> {label, vuln_count, risk, vulns[], attacks_succeeded[]}
    tree: Dict[str, Dict[str, Any]] = {}
    
    # 1. Map findings to URLs
    url_to_vulns: Dict[str, List[str]] = {}
    url_to_attacks: Dict[str, List[str]] = {}
    for f in findings:
        f_url = f.get("url") if isinstance(f, dict) else getattr(f, "url", None)
        if not f_url: continue
        parsed = urllib.parse.urlparse(f_url)
        path = parsed.path or "/"
        
        if path not in url_to_vulns: url_to_vulns[path] = []
        if path not in url_to_attacks: url_to_attacks[path] = []
        
        f_attack_worked = f.get("attack_worked", False) if isinstance(f, dict) else getattr(f, "attack_worked", False)
        f_vuln_type = f.get("vuln_type", "Unknown") if isinstance(f, dict) else getattr(f, "vuln_type", "Unknown")
        f_attack_payload = f.get("attack_payload") if isinstance(f, dict) else getattr(f, "attack_payload", None)

        if f_attack_worked:
            url_to_vulns[path].append(f_vuln_type)
            if f_attack_payload:
                url_to_attacks[path].append(f_attack_payload)

    # 2. Process discovered URLs into a tree structure
    base_node = {"id": "/", "label": "/", "vuln_count": 0, "risk": "safe", "vulns": [], "attacks_succeeded": []}
    tree["/"] = base_node

    for raw_url in discovered_urls:
        parsed = urllib.parse.urlparse(raw_url)
        full_path = parsed.path or "/"
        parts = [p for p in full_path.split("/") if p]
        
        current = ""
        for part in parts:
            prev = current or "/"
            current += "/" + part
            
            if current not in tree:
                new_node = {
                    "id": current,
                    "label": part,
                    "full_url": raw_url,
                    "vuln_count": 0,
                    "risk": "safe",
                    "vulns": [],
                    "attacks_succeeded": []
                }
                tree[current] = new_node
                edges.append({"source": prev, "target": current})

    # 3. Inject findings data into tree
    for path, vulns in url_to_vulns.items():
        if path in tree:
            tree[path]["vulns"] = list(set(vulns))
            tree[path]["vuln_count"] = len(tree[path]["vulns"])
            tree[path]["attacks_succeeded"] = list(set(url_to_attacks.get(path, [])))
            
            # Determine Risk
            if any(v.lower() in ["critical", "rce", "sqli"] for v in vulns):
                tree[path]["risk"] = "critical"
            elif tree[path]["vuln_count"] > 0:
                tree[path]["risk"] = "high"

    nodes = list(tree.values())

    return {
        "nodes": nodes,
        "edges": edges,
        "tech_stack": tech_stack,
        "open_ports": open_ports or [],
        "os_guess": os_guess,
        "api_endpoints": api_endpoints or [],
        "subdomains": [] # Placeholder for future theHarvester integration
    }
