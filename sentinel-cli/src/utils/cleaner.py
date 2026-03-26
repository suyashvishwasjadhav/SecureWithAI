def build_clean_report(raw_results):
    """
    Cleans and deduplicates the raw results from various scanners.
    """
    seen = set()
    cleaned_findings = []
    
    for finding in raw_results.get("findings", []):
        vuln_type = finding.get("vuln_type", "")
        endpoint = finding.get("endpoint", "")
        parameter = finding.get("parameter", "")
        
        # Create a unique key for deduplication
        key = f"{vuln_type}_{endpoint}_{parameter}"
        
        if key not in seen:
            seen.add(key)
            cleaned_findings.append(finding)
            
    # Update total findings and summary based on cleaned results
    summary = {"High": 0, "Medium": 0, "Low": 0, "Informational": 0}
    for f in cleaned_findings:
        sev = f.get("severity", "Informational")
        if sev in summary:
            summary[sev] += 1
        else:
            summary[sev] = 1
            
    raw_results["findings"] = cleaned_findings
    raw_results["total_findings"] = len(cleaned_findings)
    raw_results["summary"] = summary
    
    return raw_results
