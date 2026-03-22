from pathlib import Path

def detect_languages(code_path: str) -> list:
    """
    Detect languages present in the source code based on file extensions.
    """
    extensions = {f.suffix.lower() for f in Path(code_path).rglob("*") if f.is_file()}
    lang_map = {
        ".py": "python", ".js": "javascript", ".ts": "typescript",
        ".jsx": "javascript", ".tsx": "typescript", ".java": "java",
        ".php": "php", ".go": "go", ".rb": "ruby", ".cs": "csharp",
        ".cpp": "cpp", ".c": "c", ".rs": "rust", ".kt": "kotlin",
        ".swift": "swift", ".scala": "scala"
    }
    return list({lang_map[ext] for ext in extensions if ext in lang_map})

def has_language(code_path: str, lang: str) -> bool:
    """
    Check if a specific language is present in the source code.
    """
    return lang in detect_languages(code_path)
