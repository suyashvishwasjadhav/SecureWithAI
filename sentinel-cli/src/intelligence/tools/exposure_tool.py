from src.intelligence.tools.base import BaseTool
from src.attack.exposure import check_exposure

class ExposureTool(BaseTool):
    name = "run_exposure_check"
    description = "Hunts for exposed sensitive files (like .env, .git, config backups, SQL dumps, and Spring Boot actuators) and extracts hidden API routes from JavaScript bundles."

    def execute(self, target_url: str) -> list:
        print(f"\n[Brain -> Tool] Triggering Exposure Checks on {target_url}...")
        try:
            return check_exposure(target_url, console=None)
        except Exception as e:
            return [{"error": f"Exposure check failed: {str(e)}"}]
