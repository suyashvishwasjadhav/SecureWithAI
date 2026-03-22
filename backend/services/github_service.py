import subprocess, os, shutil, json
from pathlib import Path

SUPPORTED_EXTENSIONS = {
    '.py', '.js', '.ts', '.jsx', '.tsx', '.java',
    '.php', '.go', '.rb', '.cs', '.cpp', '.c',
    '.rs', '.kt', '.swift', '.html', '.css',
    '.json', '.yaml', '.yml', '.env', '.md',
    '.sh', '.bash', '.dockerfile', '.tf',
    '.toml', '.ini', '.cfg', '.conf',
    'Dockerfile', '.gitignore', 'requirements.txt',
    'package.json', 'pom.xml', 'build.gradle',
}

MAX_FILE_SIZE = 1000 * 1024  # 1MB per file
MAX_FILES = 1000  # max files to index

class GitHubService:

    def clone_repo(self, repo_url: str,
                   session_id: str) -> dict:
        """
        Clone a public GitHub repo to /tmp/ide/{session_id}/
        Returns file tree + file contents.
        """
        clone_path = f"/tmp/ide/{session_id}"
        if os.path.exists(clone_path):
            shutil.rmtree(clone_path)
        os.makedirs(clone_path, exist_ok=True)

        # Sanitize URL — only allow github.com
        if 'github.com' not in repo_url:
            raise ValueError("Only GitHub repos supported")

        # Convert web URL to git URL if needed
        git_url = repo_url.strip()
        if not git_url.endswith('.git'):
            git_url += '.git'

        # Clone with depth=1 (no history, faster)
        result = subprocess.run(
            ['git', 'clone', '--depth=1',
             '--single-branch', git_url, clone_path],
            capture_output=True, text=True, timeout=120
        )

        if result.returncode != 0:
            raise Exception(f"Clone failed: {result.stderr[:200]}")

        return {
            "clone_path": clone_path,
            "file_tree": self.build_file_tree(clone_path),
            "file_contents": self.index_files(clone_path),
        }

    def build_file_tree(self, root: str) -> list:
        """
        Build a nested file tree structure for the sidebar.
        Format: [{name, path, type, children?}]
        """
        tree = []
        root_path = Path(root)

        def build_node(path: Path, relative_to: Path) -> dict:
            rel_path = str(path.relative_to(relative_to))
            node = {
                "name": path.name,
                "path": rel_path,
                "type": "directory" if path.is_dir() else "file",
                "extension": path.suffix.lower() if path.is_file() else None,
            }
            if path.is_dir():
                children = []
                try:
                    items = sorted(path.iterdir(),
                                  key=lambda p: (p.is_file(), p.name))
                    for item in items:
                        # Skip hidden dirs and node_modules
                        if item.name.startswith('.') and \
                           item.name not in ['.env','.gitignore','.env.example']:
                            continue
                        if item.name in ['node_modules',
                                          '__pycache__',
                                          '.git', 'venv',
                                          '.venv', 'dist',
                                          'build', 'target']:
                            continue
                        children.append(
                            build_node(item, relative_to)
                        )
                except PermissionError:
                    pass
                node["children"] = children

            return node

        try:
            for item in sorted(root_path.iterdir(),
                               key=lambda p: (p.is_file(), p.name)):
                if item.name in ['.git', 'node_modules',
                                  '__pycache__']:
                    continue
                tree.append(build_node(item, root_path))
        except Exception as e:
            pass

        return tree

    def index_files(self, root: str) -> dict:
        """
        Read all indexable source files.
        Returns {relative_path: file_content}
        """
        root_path = Path(root)
        contents = {}
        count = 0

        for f in root_path.rglob('*'):
            if count >= MAX_FILES:
                break
            if not f.is_file():
                continue
            if any(skip in str(f) for skip in
                   ['.git/', 'node_modules/', '__pycache__/',
                    'venv/', '.venv/', 'dist/', 'build/']):
                continue
            if f.suffix.lower() not in SUPPORTED_EXTENSIONS and \
               f.name not in SUPPORTED_EXTENSIONS:
                continue

            try:
                size = f.stat().st_size
                if size > MAX_FILE_SIZE:
                    continue
                content = f.read_text(encoding='utf-8',
                                      errors='replace')
                rel_path = str(f.relative_to(root_path))
                contents[rel_path] = content
                count += 1
            except Exception:
                continue

        return contents
