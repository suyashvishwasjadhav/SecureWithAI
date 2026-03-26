@echo off
echo Stopping ZAP...
taskkill /fi "WINDOWTITLE eq ZAP Daemon" /f > nul 2>&1
taskkill /f /im java.exe > nul 2>&1
echo Done.
```

So your workflow becomes:
```
start.bat --url https://target.com   ← start everything + scan
stop.bat                              ← kill ZAP when done