def calculate_file_score(file_path: str,
                          all_findings: list) -> int:
    """
    Calculate security score (0-100) for a specific file.
    100 = clean, 0 = catastrophic.
    """
    file_findings = [
        f
        for f in all_findings
        if f.get("file_path") == file_path and f.get("attack_worked", True)
    ]

    if not file_findings:
        return 100

    deductions = 0
    for f in file_findings:
        sev = f.get("severity", "low")
        deductions += {
            "critical": 30,
            "high": 15,
            "medium": 7,
            "low": 3,
        }.get(sev, 1)

    return max(0, 100 - deductions)

def get_score_color(score: int) -> str:
    if score >= 80: return "green"
    if score >= 60: return "yellow"
    if score >= 40: return "orange"
    return "red"
