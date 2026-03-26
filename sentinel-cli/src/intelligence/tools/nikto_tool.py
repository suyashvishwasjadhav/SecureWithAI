from src.intelligence.tools.base import BaseTool
from src.attack.nikto_scanner import run_nikto

class NiktoTool(BaseTool):
    name = "run_nikto_scan"
    description = "Runs Nikto, a comprehensive web server scanner that checks for over 6700 potentially dangerous files/programs, outdated application versions, checks for version specific problems, and server configuration items like the presence of multiple index files, HTTP server options, and more."

    def execute(self, target_url: str) -> list:
        print(f"\n[Brain -> Tool] Triggering Nikto on {target_url} (this may take up to 2 minutes)...")
        try:
            return run_nikto(target_url, console=None)
        except Exception as e:
            return [{"error": f"Nikto scan failed: {str(e)}"}]
