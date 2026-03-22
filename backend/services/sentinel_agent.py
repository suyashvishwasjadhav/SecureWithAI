import logging
from services.smart_llm_router import smart_router

logger = logging.getLogger(__name__)

class SentinelAgent:
    """
    The 'Brain' of ShieldSentinel. 
    Analyzes all findings, tech stack, and attack surface to provide 
    strategic security insights and a 'Sentinel Verdict'.
    """

    def __init__(self):
        self.llm = smart_router

    def summarize_scan(self, scan_id: str, target_url: str, tech_stack: dict, all_findings: list) -> dict:
        """
        Generates a high-level summary of the scan results.
        """
        vulnerable = [f for f in all_findings if f.get("attack_worked") and f.get("confidence_score", 100) > 40]
        high_risk = [f for f in vulnerable if f.get("severity") in ["critical", "high"]]
        
        system_prompt = """You are Sentinel, an autonomous security AI agent.
Your goal is to analyze security scan results and provide a strategic 'Executive Verdict'.
Be professional, sharp, and provide actionable security engineering advice.
Keep your summary under 200 words but make it impactful."""

        prompt = f"""
Target: {target_url}
Tech Stack: {tech_stack.get('technologies', [])}
Total Findings: {len(all_findings)}
Confirmed Vulnerabilities: {len(vulnerable)}
High/Critical Risks: {len(high_risk)}

Findings Summary:
{self._get_findings_summary(vulnerable[:10])}

Based on this data, provide:
1. 'Executive Verdict': A one-sentence summary of the security posture.
2. 'Strategic Advice': 3-4 bullet points on what the engineering team should do immediately.
3. 'Sentience Note': A brief note on any patterns you see across the findings (e.g. 'Lack of input validation is a systemic issue across all API endpoints').
"""

        try:
            response = self.llm.chat_json(
                [{"role": "user", "content": prompt}],
                system_prompt
            )
            return response
        except Exception as e:
            logger.error(f"[SentinelAgent] AI analysis failed: {e}")
            return {
                "verdict": "Post-scan analysis failed. Security posture is likely compromised based on findings count.",
                "strategic_advice": ["Manually review all high-priority findings.", "Check for systemic input validation issues."],
                "sentience_note": "AI analysis was unavailable for this scan."
            }

    def _get_findings_summary(self, findings: list) -> str:
        summary = ""
        for f in findings:
            summary += f"- {f.get('vuln_type')} ({f.get('severity')}): {f.get('url')}\n"
        return summary
