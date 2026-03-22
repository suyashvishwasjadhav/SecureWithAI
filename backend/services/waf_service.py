from services.smart_llm_router import smart_router

MODSECURITY_TEMPLATES = {
    "SQL Injection": 'SecRule ARGS "@detectSQLi" "id:10001,phase:2,deny,status:403,log,msg:\'ShieldSentinel: SQL Injection Blocked\',tag:\'OWASP_CRS/WEB_ATTACK/SQL_INJECTION\'"',
    "Cross-Site Scripting": 'SecRule ARGS "@detectXSS" "id:10002,phase:2,deny,status:403,log,msg:\'ShieldSentinel: XSS Blocked\',tag:\'OWASP_CRS/WEB_ATTACK/XSS\'"',
    "Path Traversal": r'SecRule ARGS "@rx (?i)(\.\./|\.\.\\|%2e%2e%2f)" "id:10003,phase:2,deny,status:403,log,msg:\'ShieldSentinel: Path Traversal Blocked\'"',
    "Server-Side Request Forgery": r'SecRule ARGS "@rx (?i)(localhost|127\.0\.0\.1|169\.254\.|10\.|192\.168\.)" "id:10004,phase:2,deny,status:403,log,msg:\'ShieldSentinel: SSRF Blocked\'"',
    "Remote OS Command Injection": r'SecRule ARGS "@rx (?i)(;|\||\`|\$\(|&&|\|\|)(ls|cat|id|whoami|wget|curl)" "id:10005,phase:2,deny,status:403,log,msg:\'ShieldSentinel: Command Injection Blocked\'"',
}

class WAFService:
    
    def __init__(self):
        self.llm = smart_router
    
    def generate_rules(self, finding: dict) -> dict:
        vuln_type = finding.get("vuln_type", "")
        url = finding.get("url", "")
        parameter = finding.get("parameter", "")
        evidence = (finding.get("evidence") or "")[:200]
        
        # Use template if available, otherwise generate with LLM
        base_modsec = MODSECURITY_TEMPLATES.get(vuln_type, "")
        
        system = """You are a WAF security expert. Generate production-ready WAF rules.
Respond ONLY with valid JSON. No markdown. No text outside JSON."""
        
        prompt = f"""Generate WAF rules for this vulnerability:
Type: {vuln_type}
URL: {url}
Parameter: {parameter}
Evidence: {evidence}
Base ModSecurity rule available: {base_modsec or 'none'}

Respond with ONLY this exact JSON structure:
{{
  "modsecurity": "complete SecRule line(s) ready to add to modsecurity.conf. Use the base rule if provided, customize if needed.",
  "aws_waf": {{
    "Name": "ShieldSentinel-Block-Pattern",
    "Priority": 100,
    "Statement": {{
      "ByteMatchStatement": {{
        "SearchString": "detected pattern",
        "FieldToMatch": {{"AllQueryArguments": {{}}}},
        "TextTransformations": [{{"Priority": 0, "Type": "URL_DECODE"}}],
        "PositionalConstraint": "CONTAINS"
      }}
    }},
    "Action": {{"Block": {{}}}},
    "VisibilityConfig": {{
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "ShieldSentinel-Block"
    }}
  }},
  "cloudflare": "(http.request.uri.query contains \\\"pattern\\\") and (http.request.method eq \\\"GET\\\")",
  "nginx_config": "# Add to nginx.conf server block:\\nlocation ~ vulnerable-pattern {{\\n    return 403;\\n}}",
  "description": "This rule blocks attack patterns by detecting malicious variables in request parameters."
}}"""
        
        try:
            result = self.llm.chat_json(
                [{"role": "user", "content": prompt}],
                system,
                max_tokens=800
            )
            # Ensure modsecurity uses template if available
            if base_modsec and (not result.get("modsecurity") or "id:" not in result.get("modsecurity","")):
                result["modsecurity"] = base_modsec
            return result
        except Exception as e:
            return self._fallback_rules(vuln_type, base_modsec)
    
    def _fallback_rules(self, vuln_type: str, base_modsec: str) -> dict:
        return {
            "modsecurity": base_modsec or f'# No rule template for {vuln_type}',
            "aws_waf": {"Name": f"Block-{vuln_type}", "note": "Configure manually in AWS WAF console"},
            "cloudflare": f"# Configure manually in Cloudflare Firewall Rules for {vuln_type}",
            "nginx_config": f"# Configure manually in nginx for {vuln_type}",
            "description": f"Manual WAF rule configuration required for {vuln_type}"
        }
