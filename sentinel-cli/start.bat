@echo off
title Sentinel AI

echo.
echo  Starting Sentinel AI...
echo.

REM Start ZAP in background
echo  [1/2] Starting ZAP daemon...
start "ZAP Daemon" /min cmd /c "cd /d "C:\Program Files\ZAP\Zed Attack Proxy" && zap.bat -daemon -port 8080 -config api.disablekey=true -config api.addrs.addr.name=127.0.0.1 -config api.addrs.addr.regex=true"

REM Wait for ZAP to boot
echo  [2/2] Waiting for ZAP to boot (40 seconds)...
timeout /t 40 /nobreak > nul

REM Activate conda and launch Sentinel
echo  ZAP ready. Launching Sentinel...
echo.
call conda activate sentinel
cd /d D:\Academia\Major_project\sentinel-cli\src
python main.py %*