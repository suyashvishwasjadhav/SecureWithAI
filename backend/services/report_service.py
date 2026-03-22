import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, 
                                  TableStyle, PageBreak, HRFlowable)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# Custom Colors for the report
INDIGO = HexColor('#6366f1')
DARK_BG = HexColor('#0a0a0a')  
CARD_BG = HexColor('#111111')
WHITE = HexColor('#ffffff')
GRAY = HexColor('#9ca3af')
RED = HexColor('#ef4444')
ORANGE = HexColor('#f97316')
YELLOW = HexColor('#eab308')
GREEN = HexColor('#22c55e')
DARK_RED_BG = HexColor('#fef2f2')
DARK_ORANGE_BG = HexColor('#fff7ed')

def format_duration(seconds: int) -> str:
    if seconds < 60:
        return f"{seconds}s"
    return f"{seconds // 60}m {seconds % 60}s"

class ReportService:

    def generate_pdf(self, scan, findings, output_path: str) -> str:
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=2*cm, leftMargin=2*cm,
            topMargin=2*cm, bottomMargin=2*cm
        )
        
        story = []
        styles = self._build_styles()
        
        # 1. Cover
        story += self._build_cover(scan, styles)
        story.append(PageBreak())
        
        # 2. Executive Summary
        story += self._build_executive_summary(scan, findings, styles)
        story.append(PageBreak())
        
        # 3. Technology Stack (Enhanced Phase 16)
        story += self._build_tech_stack_section(scan, styles)
        story.append(PageBreak())
        
        # 4. Vulnerability Findings (with real evidence & CVSS)
        story += self._build_findings_section(findings, styles)
        story.append(PageBreak())

        # 5. Compliance Gaps (Enhanced Phase 16)
        story += self._build_compliance_gaps_section(str(scan.id), findings, styles)
        story.append(PageBreak())

        # 6. Attack Timeline (Enhanced Phase 16)
        story += self._build_timeline_section(scan, styles)
        story.append(PageBreak())

        # 7. Security Resistance (Protected)
        story += self._build_protected_section(findings, styles)
        
        doc.build(story, onFirstPage=self._header_footer, onLaterPages=self._header_footer)
        return output_path

    def _build_tech_stack_section(self, scan, styles) -> list:
        elements = []
        elements.append(Paragraph("Technology Stack & Infrastructure", styles["section_heading"]))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=INDIGO))
        elements.append(Spacer(1, 0.5*cm))
        
        tech = scan.tech_stack or {}
        technologies = tech.get("technologies", [])
        
        elements.append(Paragraph("Detected Technologies", styles["finding_heading"]))
        if technologies:
            elements.append(Paragraph(", ".join(technologies), styles["body"]))
        else:
            elements.append(Paragraph("No specific technologies fingerprints detected.", styles["body"]))
        
        elements.append(Spacer(1, 0.5*cm))
        elements.append(Paragraph("Host Intelligence", styles["finding_heading"]))
        
        host_data = [
            ["Attribute", "Verified Value"],
            ["Operating System", scan.os_guess or "Unknown"],
            ["Open Ports", ", ".join(map(str, scan.open_ports)) if scan.open_ports else "None Detected"],
            ["Web Server", next((t for t in technologies if "Server" in t), "Unknown")],
            ["WAF/CDN", "Detected" if tech.get("waf") else "No Perimeter Shield Detected"],
        ]
        
        t = Table(host_data, colWidths=[6*cm, 10*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), INDIGO),
            ('TEXTCOLOR', (0,0), (-1,0), WHITE),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 8),
        ]))
        elements.append(t)
        return elements

    def _build_compliance_gaps_section(self, scan_id: str, findings: list, styles) -> list:
        elements = []
        elements.append(Paragraph("Compliance Gaps Analysis", styles["section_heading"]))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=RED))
        elements.append(Spacer(1, 0.5*cm))
        
        from services.compliance_service import calculate_compliance, OWASP_EXPLANATIONS
        comp = calculate_compliance(scan_id, findings)
        
        for cat_id, data in comp['owasp']['categories'].items():
            if data['findings'] > 0:
                expl = OWASP_EXPLANATIONS.get(cat_id, {})
                elements.append(Paragraph(f"{cat_id}: {expl.get('name', 'Violation')}", styles["finding_heading"]))
                elements.append(Paragraph(f"<b>What it means:</b> {expl.get('what_it_means', 'N/A')}", styles["body_small"]))
                elements.append(Paragraph(f"<b>Business Impact:</b> {expl.get('business_impact', 'N/A')}", styles["body_small"]))
                elements.append(Paragraph(f"<b>Quick Fix:</b> {expl.get('quick_fix', 'N/A')}", styles["body_small"]))
                elements.append(Spacer(1, 0.3*cm))
        
        return elements

    def _build_timeline_section(self, scan, styles) -> list:
        elements = []
        elements.append(Paragraph("Attack Timeline & Internal Audit", styles["section_heading"]))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=GRAY))
        elements.append(Spacer(1, 0.5*cm))
        
        timeline = scan.attack_timeline or []
        if not timeline:
            elements.append(Paragraph("No timeline data available for this scan type.", styles["body"]))
            return elements
            
        data = [["Tool / Engine", "Action Performed", "Timestamp"]]
        for entry in timeline:
            data.append([
                entry.get("tool", "Unknown"),
                entry.get("action", "Scanning"),
                entry.get("time", "").split("T")[-1][:8] if "T" in entry.get("time","") else "N/A"
            ])
            
        t = Table(data, colWidths=[4*cm, 8*cm, 4*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), GRAY),
            ('TEXTCOLOR', (0,0), (-1,0), WHITE),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(t)
        return elements

    def _build_cover(self, scan, styles) -> list:
        elements = []
        elements.append(Spacer(1, 3*cm))
        
        # Shield logo (text based)
        elements.append(Paragraph("🛡️", ParagraphStyle("logo", fontSize=60, alignment=TA_CENTER)))
        elements.append(Spacer(1, 0.5*cm))
        elements.append(Paragraph("ShieldSentinel", styles["title_large"]))
        elements.append(Paragraph("SECURITY ASSESSMENT REPORT", styles["subtitle"]))
        elements.append(HRFlowable(width="100%", thickness=1, color=INDIGO))
        elements.append(Spacer(1, 1*cm))
        
        # Scan details table
        details = [
            ["Target Identifier:", scan.target],
            ["Methodology:", scan.scan_type.upper() + " Analysis"],
            ["Execution Timestamp:", scan.created_at.strftime("%B %d, %Y %H:%M UTC")],
            ["Operational Duration:", format_duration(scan.duration_seconds or 0)],
            ["Aggregate Risk Score:", f"{scan.risk_score}/100"],
        ]
        
        t = Table(details, colWidths=[5*cm, 11*cm])
        t.setStyle(TableStyle([
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 11),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0,0), (0,-1), INDIGO),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 2*cm))
        
        # Risk score big display
        score = scan.risk_score or 0
        risk_color = RED if score < 31 else (ORANGE if score < 61 else (YELLOW if score < 81 else GREEN))
        elements.append(Paragraph(f"<font color='#{risk_color.hexval()}'>Risk Factor: {score}/100</font>", styles["risk_score"]))
        
        elements.append(Spacer(1, 3*cm))
        elements.append(Paragraph("STRICTLY CONFIDENTIAL — FOR INTERNAL USE ONLY", styles["confidential"]))
        
        return elements

    def _build_executive_summary(self, scan, findings, styles) -> list:
        elements = []
        elements.append(Paragraph("Executive Summary", styles["section_heading"]))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=INDIGO))
        elements.append(Spacer(1, 0.5*cm))
        
        # AI-generated summary (fallback to generic if AI fails)
        summary_text = self._generate_ai_summary(scan, findings)
        elements.append(Paragraph(summary_text, styles["body"]))
        elements.append(Spacer(1, 1*cm))
        
        # Stats table
        critical = sum(1 for f in findings if f.severity == "critical" and f.attack_worked)
        high = sum(1 for f in findings if f.severity == "high" and f.attack_worked)
        medium = sum(1 for f in findings if f.severity == "medium" and f.attack_worked)
        low = sum(1 for f in findings if f.severity == "low" and f.attack_worked)
        blocked = sum(1 for f in findings if not f.attack_worked)
        
        stats_data = [
            ["Severity Category", "Findings", "Operational Impact"],
            ["Critical", str(critical), "Immediate risk to organizational stability"],
            ["High", str(high), "Significant compromise of security controls"],
            ["Medium", str(medium), "Moderate exposure of internal resources"],
            ["Low / Info", str(low), "Minimal exposure or informational discovery"],
            ["Blocked / Safe", str(blocked), "Tested perimeter defended successfully"],
        ]
        
        t = Table(stats_data, colWidths=[5*cm, 3*cm, 9*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), INDIGO),
            ('TEXTCOLOR', (0,0), (-1,0), WHITE),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('BACKGROUND', (0,1), (-1,1), DARK_RED_BG),
            ('BACKGROUND', (0,2), (-1,2), DARK_ORANGE_BG),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
            ('ROWBACKGROUNDS', (0,5), (-1,5), [colors.HexColor('#f0fdf4')]),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 8),
        ]))
        elements.append(t)
        
        return elements

    def _build_findings_section(self, findings, styles) -> list:
        elements = []
        elements.append(Paragraph("Technical Vulnerability Findings", styles["section_heading"]))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=INDIGO))
        elements.append(Spacer(1, 0.3*cm))
        
        active_findings = sorted(
            [f for f in findings if f.attack_worked],
            key=lambda f: {"critical":0,"high":1,"medium":2,"low":3}.get(f.severity, 4)
        )
        
        if not active_findings:
            elements.append(Paragraph("No major technical vulnerabilities were detected during this operation cycle.", styles["body"]))
            return elements

        SEV_COLORS = {
            "critical": (RED, colors.HexColor('#fef2f2')),
            "high": (ORANGE, colors.HexColor('#fff7ed')),
            "medium": (YELLOW, colors.HexColor('#fefce8')),
            "low": (colors.HexColor('#3b82f6'), colors.HexColor('#eff6ff')),
        }
        
        for i, finding in enumerate(active_findings, 1):
            sev_color, sev_bg = SEV_COLORS.get(finding.severity, (GRAY, WHITE))
            
            elements.append(Spacer(1, 0.4*cm))
            elements.append(Paragraph(
                f"<font color='#6366f1'>FINDING #{i}</font> | <font color='#{sev_color.hexval()}'>[{finding.severity.upper()}]</font> {finding.vuln_type}",
                styles["finding_heading"]
            ))
            
            location = finding.url or f"{finding.file_path}:{finding.line_number}" or "Global / Unknown"
            detail_data = [
                ["Vulnerable Point:", location],
                ["OWASP Catalog:", finding.owasp_category or "A00:2021 General Issue"],
                ["CVSS Score:", f"{finding.cvss_score or 'N/A'}"],
                ["Detection Engine:", finding.tool_source.upper() if finding.tool_source else "SENTINEL CORE"],
            ]
            
            t = Table(detail_data, colWidths=[4*cm, 12*cm])
            t.setStyle(TableStyle([
                ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 9),
                ('TEXTCOLOR', (0,0), (0,-1), INDIGO),
                ('BOTTOMPADDING', (0,0), (-1,-1), 5),
                ('BACKGROUND', (0,0), (-1,-1), sev_bg),
                ('BOX', (0,0), (-1,-1), 0.25, colors.HexColor('#e5e7eb')),
            ]))
            elements.append(t)
            
            # Use layman explanation if exists
            desc = finding.layman_explanation if finding.layman_explanation else finding.description
            if desc:
                elements.append(Spacer(1, 0.1*cm))
                elements.append(Paragraph(desc, styles["body_small"]))
            
            # REAL EVIDENCE
            if finding.evidence:
                elements.append(Spacer(1, 0.1*cm))
                elements.append(Paragraph(f"Capture Evidence: {finding.evidence[:500]}", styles["evidence"]))
            
            # ATTACK EXAMPLES
            if finding.attack_examples:
                elements.append(Paragraph("Real-World Attack Payload:", styles["finding_heading"]))
                # Convert to string if it's not
                payload = finding.attack_examples
                if isinstance(payload, dict):
                    payload = payload.get('payload', str(payload))
                elements.append(Paragraph(f"<code>{payload}</code>", styles["evidence"]))

            # DEFENSE EXAMPLES
            if finding.defense_examples:
                 elements.append(Paragraph("Recommended Secure Implementation:", styles["finding_heading"]))
                 fix = finding.defense_examples
                 if isinstance(fix, dict):
                     fix = fix.get('fix', str(fix))
                 elements.append(Paragraph(f"<code>{fix}</code>", styles["evidence"]))

            elements.append(HRFlowable(width="100%", thickness=0.5, 
                                        color=colors.HexColor('#e5e7eb'), spaceBefore=8))
        
        return elements

    def _build_protected_section(self, findings, styles) -> list:
        elements = []
        elements.append(Paragraph("Security Resistance Verification", styles["section_heading"]))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=GREEN))
        elements.append(Spacer(1, 0.3*cm))
        elements.append(Paragraph(
            "The following attack vectors were analyzed against the target perimeter. No active compromises were identified, indicating effective security controls for these patterns.",
            styles["body"]
        ))
        elements.append(Spacer(1, 0.5*cm))
        
        blocked = [f for f in findings if not f.attack_worked]
        
        if blocked:
            table_data = [["Vector Analysis", "Verification Status"]]
            for b in blocked:
                table_data.append([b.vuln_type, "✅ PERIMETER SECURE"])
            
            t = Table(table_data, colWidths=[11*cm, 5*cm])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), GREEN),
                ('TEXTCOLOR', (0,0), (-1,0), WHITE),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 10),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, colors.HexColor('#f0fdf4')]),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ('TOPPADDING', (0,0), (-1,-1), 6),
            ]))
            elements.append(t)
        
        return elements

    def _generate_ai_summary(self, scan, findings) -> str:
        """Call LLM service to generate executive summary."""
        try:
            from services.smart_llm_router import smart_router
            critical = sum(1 for f in findings if f.severity == "critical" and f.attack_worked)
            high = sum(1 for f in findings if f.severity == "high" and f.attack_worked)
            top_vulns = [f.vuln_type for f in findings if f.severity in ["critical","high"] and f.attack_worked][:5]
            
            prompt = f"""Generate a high-level executive security summary for a professional report.
Target: {scan.target}
Risk Score: {scan.risk_score}/100
Findings: {critical} critical, {high} high.
Vulnerability types: {', '.join(top_vulns) or 'None identified'}

Write 3 paragraphs:
1. Overall summary of the scan results and security posture.
2. Business impact of the key vulnerabilities found.
3. Strategic recommendations for remediation.
Keep it strictly professional and technical. No markdown headers."""
            
            return smart_router.chat([{"role": "user", "content": prompt}])
        except Exception:
            # High-quality fallback summary
            critical_count = sum(1 for f in findings if f.severity == "critical" and f.attack_worked)
            return f"Strategic evaluation of {scan.target} reveals a risk posture of {scan.risk_score}/100. The assessment identified {critical_count} critical deficiencies in the application perimeter. Immediate remediation of highlighted critical paths is required to maintain operational stability and data integrity. Continuous monitoring and patch cycles are recommended for all identified medium-high risk components."

    def _header_footer(self, canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(GRAY)
        canvas.drawString(2*cm, 1*cm, "ShieldSentinel Internal Assessment — CONFIDENTIAL PROPRIETARY DATA")
        canvas.drawRightString(A4[0]-2*cm, 1*cm, f"Page {doc.page} | Generated: {datetime.now().strftime('%Y-%m-%d')}")
        canvas.restoreState()

    def _build_styles(self):
        styles = getSampleStyleSheet()
        custom = {
            "title_large": ParagraphStyle("title_large", fontSize=32, fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=15),
            "subtitle": ParagraphStyle("subtitle", fontSize=14, fontName="Helvetica", alignment=TA_CENTER, textColor=GRAY, spaceAfter=30),
            "section_heading": ParagraphStyle("section_heading", fontSize=18, fontName="Helvetica-Bold", textColor=INDIGO, spaceBefore=20, spaceAfter=8),
            "finding_heading": ParagraphStyle("finding_heading", fontSize=13, fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=6),
            "body": ParagraphStyle("body", fontSize=10, fontName="Helvetica", leading=16, spaceAfter=8, alignment=TA_LEFT),
            "body_small": ParagraphStyle("body_small", fontSize=9, fontName="Helvetica", leading=14, textColor=colors.HexColor('#374151'), spaceAfter=5),
            "evidence": ParagraphStyle("evidence", fontSize=8, fontName="Courier", leading=10, textColor=colors.HexColor('#111827'), backgroundColor=colors.HexColor('#f3f4f6'), borderPadding=5, spaceBefore=5),
            "risk_score": ParagraphStyle("risk_score", fontSize=42, fontName="Helvetica-Bold", alignment=TA_CENTER),
            "confidential": ParagraphStyle("confidential", fontSize=10, fontName="Helvetica-Bold", alignment=TA_CENTER, textColor=RED),
        }
        return custom
