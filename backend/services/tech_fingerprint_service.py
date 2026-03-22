import requests
import logging

logger = logging.getLogger(__name__)

class TechFingerprintService:

    TECH_SIGNATURES = {
        "headers": {
            "X-Powered-By": {
                "php": "PHP",
                "asp.net": "ASP.NET",
                "express": "Express.js",
                "django": "Django",
            },
            "Server": {
                "nginx": "Nginx",
                "apache": "Apache",
                "iis": "Microsoft IIS",
                "cloudflare": "Cloudflare CDN",
                "vercel": "Vercel",
                "netlify": "Netlify",
            },
            "X-Generator": {
                "wordpress": "WordPress",
                "drupal": "Drupal",
                "joomla": "Joomla",
            }
        },
        "cookies": {
            "PHPSESSID": "PHP",
            "JSESSIONID": "Java/Tomcat",
            "ASP.NET_SessionId": "ASP.NET",
            "laravel_session": "Laravel",
            "django": "Django",
            "wp-": "WordPress",
        },
        "html_patterns": {
            "wp-content": "WordPress",
            "Drupal": "Drupal",
            "joomla": "Joomla",
            "react": "React.js",
            "ng-version": "Angular",
            "__nuxt": "Nuxt.js",
            "_next": "Next.js",
            "gatsby": "Gatsby",
        }
    }

    def detect(self, target_url: str) -> dict:
        tech_stack = []
        
        try:
            resp = requests.get(target_url, timeout=10, allow_redirects=True)
            headers = {k.lower(): v.lower() for k,v in resp.headers.items()}
            body = resp.text.lower()
            cookies = [c.lower() for c in resp.cookies.keys()]
            
            # Header-based detection
            for header, patterns in self.TECH_SIGNATURES["headers"].items():
                header_val = headers.get(header.lower(), "")
                for pattern, tech in patterns.items():
                    if pattern in header_val:
                        tech_stack.append(tech)
            
            # Cookie-based detection
            for cookie_name, tech in self.TECH_SIGNATURES["cookies"].items():
                if any(cookie_name.lower() in c for c in cookies):
                    tech_stack.append(tech)
            
            # HTML body detection
            for pattern, tech in self.TECH_SIGNATURES["html_patterns"].items():
                if pattern in body:
                    tech_stack.append(tech)
            
            # Version detection from headers
            server_header = headers.get("server", "")
            via_header = headers.get("via", "")
            powered_by = headers.get("x-powered-by", "")
            
            return {
                "technologies": list(set(tech_stack)),
                "server": server_header,
                "powered_by": powered_by,
                "cdn": "cloudflare" in server_header or "cloudfront" in via_header,
                "raw_headers": dict(list(resp.headers.items())[:20])
            }
        
        except Exception as e:
            logger.error(f"[Tech Fingerprint] Error: {e}")
            return {"technologies": [], "error": str(e)}
