"""
Filter obvious false positives from SAST (especially Semgrep --config=auto on HTML/Jinja).
"""
import re
from typing import Any, Dict, List, Optional

# Lines that are normal static assets / templating — not actionable vulns by themselves.
_STYLESHEET = re.compile(r"""<link[^>]+rel\s*=\s*["']stylesheet["']""", re.I)
_URL_FOR_STATIC = re.compile(r"\{\{\s*url_for\s*\(\s*['\"]static['\"]", re.I)
_KNOWN_CDN_SCRIPT = re.compile(
    r"""<script[^>]+src\s*=\s*["']https?://[^"']*(cdnjs\.cloudflare|cdn\.socket\.io|unpkg\.com|jsdelivr\.net|googleapis\.com|gstatic\.com|bootstrapcdn\.com|jquery\.com|cdn\.jsdelivr)""",
    re.I,
)
_KNOWN_CDN_HREF = re.compile(
    r"""href\s*=\s*["']https?://[^"']*(cdnjs\.cloudflare|fonts\.googleapis|unpkg\.com|jsdelivr\.net|gstatic\.com|cdn\.jsdelivr)""",
    re.I,
)

# Semgrep rule ids that often fire on benign template/static lines (OWASP auto rules).
_NOISY_RULE_SUBSTRINGS = (
    "template.hbs.security.unknown-assistant",
    "template.autoescape",
    "missing-integrity",
    "subresource-integrity",
)


def _snippet_for_finding(finding: Dict[str, Any]) -> str:
    ev = (finding.get("evidence") or "").strip()
    if ev:
        return ev
    desc = finding.get("description") or ""
    return desc[:500]


def is_benign_static_line(snippet: str) -> bool:
    if not snippet or len(snippet.strip()) < 3:
        return False
    s = snippet.strip()
    if _STYLESHEET.search(s):
        return True
    if _URL_FOR_STATIC.search(s):
        return True
    if _KNOWN_CDN_SCRIPT.search(s):
        return True
    if _KNOWN_CDN_HREF.search(s):
        return True
    return False


def should_drop_semgrep_finding(result: Dict[str, Any], finding_dict: Dict[str, Any]) -> bool:
    """Drop Semgrep result that matched only benign boilerplate."""
    check_id = (result.get("check_id") or "").lower()
    for frag in _NOISY_RULE_SUBSTRINGS:
        if frag in check_id:
            if is_benign_static_line(_snippet_for_finding(finding_dict)):
                return True

    path = (finding_dict.get("file_path") or "").lower()
    if path.endswith((".html", ".htm", ".jinja", ".j2", ".jinja2")):
        if is_benign_static_line(_snippet_for_finding(finding_dict)):
            # Only drop low-confidence "Security Issue" style generic hits on static includes
            vt = (finding_dict.get("vuln_type") or "").lower()
            if vt in ("security issue", "cross-site scripting") or "security" in vt:
                return True

    return False


def filter_sast_findings(findings: List[Dict[str, Any]], raw_semgrep_results: Optional[List[Dict]] = None) -> List[Dict[str, Any]]:
    """
    If raw_semgrep_results is provided (same order as semgrep-only slice), use paired filtering.
    Otherwise apply heuristic filter on any finding with tool_source semgrep + html path.
    """
    if not findings:
        return findings

    out: List[Dict[str, Any]] = []
    for f in findings:
        if f.get("tool_source") != "semgrep":
            out.append(f)
            continue
        snippet = _snippet_for_finding(f)
        path = (f.get("file_path") or "").lower()
        if path.endswith((".html", ".htm", ".jinja", ".j2", ".jinja2")) and is_benign_static_line(snippet):
            continue
        out.append(f)
    return out


def enrich_finding_snippet_from_file(
    finding: Dict[str, Any], file_contents: Optional[Dict[str, str]], context_lines: int = 3
) -> None:
    """Mutate finding['evidence'] with a small code snapshot when missing or tiny."""
    if not file_contents:
        return
    fp = finding.get("file_path")
    ln = finding.get("line_number")
    if not fp or not ln or ln < 1:
        return
    raw = finding.get("evidence") or ""
    if len(raw.strip()) > 80:
        return

    # Resolve path keys (posix vs cloned layout)
    content = file_contents.get(fp)
    if content is None:
        for k, v in file_contents.items():
            if k.replace("\\", "/").endswith(fp.replace("\\", "/").lstrip("./")):
                content = v
                break
    if not content:
        return

    lines = content.split("\n")
    idx = ln - 1
    if idx >= len(lines):
        return
    start = max(0, idx - context_lines)
    end = min(len(lines), idx + context_lines + 1)
    numbered = [f"{i + 1:4d} | {lines[i]}" for i in range(start, end)]
    finding["evidence"] = "\n".join(numbered)
