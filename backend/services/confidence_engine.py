import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class ConfidenceEngine:
    """
    Analyzes findings and assigns confidence scores based on:
    - Multiple tool correlation
    - Verification results
    - Response patterns (Soft-404, etc.)
    - Evidence quality
    """

    def analyze(self, findings: List[Dict]) -> List[Dict]:
        """
        Processes a list of findings and updates them with:
        - confidence_score (0-100)
        - verification_status (unverified, verified, suspicious)
        - severity (re-calculated based on confidence)
        """
        for finding in findings:
            # Skip findings that already have a score and are clearly valid
            if finding.get("confidence_score") and finding.get("confidence_score") > 90:
                continue

            # Initial base confidence based on source
            score = self._get_base_confidence(finding)
            
            # Apply rules
            score = self._apply_evidence_rules(finding, score)
            score = self._apply_correlation_rules(finding, findings, score)
            
            # Update finding
            finding["confidence_score"] = int(min(100, max(0, score)))
            
            # Update severity based on confidence
            # If confidence is low, we don't want to scream HIGH/CRITICAL
            if finding["confidence_score"] < 30:
                finding["severity"] = "info"
                finding["attack_worked"] = False
            elif finding["confidence_score"] < 60:
                if finding["severity"] in ["high", "critical"]:
                    finding["severity"] = "medium"
            
            # Add verification status
            if finding["confidence_score"] > 85:
                finding["verification_status"] = "verified"
            elif finding["confidence_score"] > 40:
                finding["verification_status"] = "unverified"
            else:
                finding["verification_status"] = "suspicious"

        return findings

    def _get_base_confidence(self, finding: Dict) -> int:
        source = finding.get("tool_source", "").lower()
        vuln_type = finding.get("vuln_type", "").lower()
        
        # SQLMap and Nuclei are usually very high confidence if they report a hit
        if source in ["sqlmap", "nuclei"]:
            return 90
        # ZAP Active scan is good but can have noise
        if source == "zap":
            return 80
        # FFUF is noise-prone
        if source == "ffuf":
            return 50
        # Static analysis is medium
        if source in ["semgrep", "bandit"]:
            return 70
        
        return 50

    def _apply_evidence_rules(self, finding: Dict, current_score: int) -> int:
        evidence = finding.get("evidence", "").lower()
        description = finding.get("description", "").lower()
        
        # Positive indicators
        if "verified" in evidence or "confirmed" in evidence:
            current_score += 20
        if "payload:" in evidence or "curl" in evidence:
            current_score += 10
            
        # Negative indicators
        if "similar response pattern" in description or "soft-404" in description:
            current_score -= 30
        if "low confidence" in evidence:
            current_score -= 20
        if "could not reach path" in evidence:
            current_score -= 40
            
        return current_score

    def _apply_correlation_rules(self, finding: Dict, all_findings: List[Dict], current_score: int) -> int:
        url = finding.get("url")
        vuln_type = finding.get("vuln_type")
        
        if not url or not vuln_type:
            return current_score
            
        # Check if other tools found the SAME vulnerability at the SAME URL
        others = [
            f for f in all_findings 
            if f != finding 
            and f.get("url") == url 
            and f.get("vuln_type") == vuln_type
        ]
        
        if others:
            # Boost corellated findings
            current_score += 15 * len(others)
            
        return current_score
