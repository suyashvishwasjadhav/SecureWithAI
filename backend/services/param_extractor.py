import requests
import re
import logging
from urllib.parse import urlparse, parse_qs

logger = logging.getLogger(__name__)

class ParamExtractor:

    def extract(self, target_url: str, discovered_urls: list) -> dict:
        """
        Improved extractor that prioritizes high-value URLs and detects modern API patterns.
        """
        result = {"get_params": [], "post_params": [], "api_endpoints": []}
        seen = set()
        
        # Prioritize URLs that look like they have actions
        prioritized = sorted(discovered_urls, key=lambda u: ("?" in u or "api" in u.lower() or "login" in u.lower()), reverse=True)
        
        # If no URLs discovered, at least check the main target
        if not prioritized:
            prioritized = [target_url]
            
        for url in prioritized[:50]:
            if url in seen:
                continue
            seen.add(url)
            
            # Extract GET params
            parsed = urlparse(url)
            if parsed.query:
                params = list(parse_qs(parsed.query).keys())
                for p in params:
                    result["get_params"].append({"url": url, "param": p, "type": "GET"})
            
            # Extract common REST patterns (e.g. /api/user/123 -> id=123)
            # This is a 'maybe' but good for fuzzing
            path_parts = parsed.path.strip("/").split("/")
            if path_parts and path_parts[-1].isdigit():
                 result["get_params"].append({"url": url, "param": path_parts[-1], "type": "PATH_VAR"})

            try:
                resp = requests.get(url, timeout=10, allow_redirects=True, headers={"User-Agent": "ShieldSentinel/1.0"})
                
                # Check for forms
                forms = self._extract_forms(resp.text, url)
                result["post_params"].extend(forms)
                
                # Detect JSON API
                content = resp.text.strip()
                if (content.startswith("{") and content.endswith("}")) or "application/json" in resp.headers.get("Content-Type", "").lower():
                    result["api_endpoints"].append({"url": url, "method": "POST" if "api" in url.lower() else "GET"})

            except Exception as e:
                logger.debug(f"[ParamExtractor] Fetch failed for {url}: {e}")
        
        # If still nothing, add some common default targets for the scanner to 'try'
        if not result["get_params"] and not result["post_params"]:
             # Guessed parameters for common endpoints
             for common in ["/login", "/search", "/api/v1/auth", "/register"]:
                 full_url = target_url.rstrip("/") + common
                 result["get_params"].append({"url": full_url, "param": "id", "type": "GET_GUESSED"})
                 result["post_params"].append({"url": full_url, "params": ["user", "pass"], "type": "POST_GUESSED"})

        return result

    def _extract_forms(self, html: str, base_url: str) -> list:
        """Extract all form inputs from HTML using multiple patterns."""
        forms = []
        
        # pattern for form tags
        form_pattern = re.compile(r'<form[^>]*>(.*?)</form>', re.DOTALL | re.IGNORECASE)
        # pattern for name/id in input/select/textarea
        input_pattern = re.compile(r'<(input|select|textarea)[^>]*(?:name|id)=["\']?([^"\'>\s]+)["\']?', re.IGNORECASE)
        # pattern for action
        action_pattern = re.compile(r'action=["\']?([^"\'>\s]*)["\']?', re.IGNORECASE)
        
        for form_match in form_pattern.finditer(html):
            form_html = form_match.group(1)
            action_match = action_pattern.search(form_match.group(0))
            action = action_match.group(1) if action_match else base_url
            
            inputs = [m[1] for m in input_pattern.findall(form_html)]
            
            if inputs:
                if not action.startswith("http"):
                    parsed_base = urlparse(base_url)
                    if action.startswith("/"):
                        action = f"{parsed_base.scheme}://{parsed_base.netloc}{action}"
                    else:
                        path_parts = parsed_base.path.split("/")
                        path = "/".join(path_parts[:-1]) if path_parts else ""
                        action = f"{parsed_base.scheme}://{parsed_base.netloc}{path}/{action}"

                forms.append({"url": action, "params": list(set(inputs)), "type": "POST"})
        
        return forms
