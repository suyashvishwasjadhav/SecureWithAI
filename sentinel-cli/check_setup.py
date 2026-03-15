import subprocess
import sys
import importlib
import os
import urllib3
urllib3.disable_warnings()

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

console = Console()

def show_banner():
    banner = Text()
    banner.append("  SENTINEL AI — Setup Checker\n", style="bold cyan")
    banner.append("  Verifying your environment...\n", style="dim white")
    console.print(Panel(banner, border_style="cyan", width=52))

def check_python_package(display_name, import_name=None):
    try:
        importlib.import_module(import_name or display_name)
        return True, "Installed"
    except ImportError:
        return False, "NOT FOUND"

def check_docker_container(container_name):
    try:
        result = subprocess.run(
            ["docker", "inspect", "--format", "{{.State.Running}}", container_name],
            capture_output=True, text=True, timeout=10
        )
        if result.stdout.strip() == "true":
            return True, "Running"
        return False, "Not running"
    except Exception:
        return False, "Not found"

def check_url(url):
    import requests
    # Try multiple variations
    attempts = [
        url,
        url.replace("localhost", "127.0.0.1"),
        url.replace("127.0.0.1", "localhost"),
    ]
    for attempt in attempts:
        try:
            r = requests.get(attempt, timeout=8, verify=False)
            return True, f"Reachable (HTTP {r.status_code}) via {attempt}"
        except Exception:
            continue
    return False, "Not reachable"

def check_sqlmap():
    if os.path.exists("sqlmap/sqlmap.py"):
        return True, "Found (cloned)"
    return False, "NOT FOUND — run: git clone https://github.com/sqlmapproject/sqlmap"

def check_zap_process():
    try:
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True, text=True, timeout=10
        )
        if ":8080" in result.stdout:
            return True, "Running on port 8080"
        return False, "Not running — start ZAP manually"
    except:
        return False, "Could not check"

def check_zap_api():
    import requests
    urls = [
        "http://127.0.0.1:8080/JSON/core/view/version/",
        "http://localhost:8080/JSON/core/view/version/",
        "http://127.0.0.1:8080/JSON/core/view/version/?apikey=sentinel123",
        "http://localhost:8080/JSON/core/view/version/?apikey=sentinel123",
    ]
    for url in urls:
        try:
            r = requests.get(url, timeout=8, verify=False)
            if r.status_code == 200 and "version" in r.text:
                return True, f"OK — {r.text.strip()}"
        except Exception:
            continue
    return False, "API not responding"

# ── Run all checks ──────────────────────────────

show_banner()

# 1. Python version
console.print("\n[bold white][ Python ][/bold white]")
table = Table(show_header=True, header_style="bold cyan", width=60)
table.add_column("Check", style="white", width=30)
table.add_column("Status", width=30)
major, minor = sys.version_info.major, sys.version_info.minor
py_ok = major == 3 and minor >= 10
table.add_row(
    "Python version",
    f"[green]3.{minor} ✓[/green]" if py_ok else f"[red]3.{minor} — needs 3.10+[/red]"
)
console.print(table)

# 2. Python packages
console.print("\n[bold white][ Python Packages ][/bold white]")
table = Table(show_header=True, header_style="bold cyan", width=60)
table.add_column("Package", style="white", width=30)
table.add_column("Status", width=30)

packages = [
    ("rich", None),
    ("typer", None),
    ("python-owasp-zap-v2.4", "zapv2"),
    ("requests", None),
    ("python-dotenv", "dotenv"),
    ("python-nmap", "nmap"),
    ("sslyze", None),
]

all_packages_ok = True
for display_name, import_name in packages:
    ok, msg = check_python_package(display_name, import_name)
    color = "green" if ok else "red"
    table.add_row(display_name, f"[{color}]{msg}[/{color}]")
    if not ok:
        all_packages_ok = False
console.print(table)

# 3. SQLMap
console.print("\n[bold white][ SQLMap ][/bold white]")
table = Table(show_header=True, header_style="bold cyan", width=60)
table.add_column("Check", style="white", width=30)
table.add_column("Status", width=30)
ok, msg = check_sqlmap()
table.add_row("sqlmap", f"[green]{msg}[/green]" if ok else f"[red]{msg}[/red]")
console.print(table)

# 4. Docker containers
console.print("\n[bold white][ Docker Containers ][/bold white]")
table = Table(show_header=True, header_style="bold cyan", width=60)
table.add_column("Container", style="white", width=30)
table.add_column("Status", width=30)
for c in ["juiceshop"]:
    ok, msg = check_docker_container(c)
    table.add_row(c, f"[green]{msg}[/green]" if ok else f"[yellow]{msg}[/yellow]")
console.print(table)

# 5. ZAP process
console.print("\n[bold white][ ZAP (Native Windows) ][/bold white]")
table = Table(show_header=True, header_style="bold cyan", width=60)
table.add_column("Check", style="white", width=30)
table.add_column("Status", width=30)
ok, msg = check_zap_process()
table.add_row("ZAP process", f"[green]{msg}[/green]" if ok else f"[red]{msg}[/red]")
ok, msg = check_zap_api()
table.add_row("ZAP API", f"[green]{msg}[/green]" if ok else f"[red]{msg}[/red]")
console.print(table)

# 6. Juice Shop
console.print("\n[bold white][ Live Services ][/bold white]")
table = Table(show_header=True, header_style="bold cyan", width=60)
table.add_column("Service", style="white", width=30)
table.add_column("Status", width=30)
ok, msg = check_url("http://localhost:3000")
table.add_row("Juice Shop", f"[green]{msg}[/green]" if ok else f"[red]{msg}[/red]")
console.print(table)

# 7. Final verdict
console.print()
console.print(Panel(
    "[bold green]  All systems go!\n  Run: python main.py scan --url http://localhost:3000[/bold green]"
    if all_packages_ok else
    "[bold yellow]  Fix red items above.\n  pip install <package> for missing packages.[/bold yellow]",
    border_style="green" if all_packages_ok else "yellow",
    width=52
))