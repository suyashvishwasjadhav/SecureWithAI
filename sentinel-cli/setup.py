from setuptools import setup, find_packages

setup(
    name="sentinel",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "rich",
        "typer",
        "requests",
        "python-owasp-zap-v2.4",
        "python-dotenv",
        "python-nmap",
        "sslyze",
    ],
    entry_points={
        "console_scripts": [
            "sentinel=src.cli.app:main",
        ],
    },
)