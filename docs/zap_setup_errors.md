# ZAP Setup Error Log — Sentinel AI
**Date:** 15 March 2026  
**OS:** Windows 11  
**ZAP Version:** 2.17.0  
**Environment:** Conda (sentinel), Python 3.11

---

## Summary
Getting ZAP 2.17.0 to accept API connections from Python on Windows required bypassing multiple layers of security restrictions. This document logs every error encountered and the final working solution.

---

## Error 1 — Docker ZAP API Blocked (172.17.0.1)

**Command used:**
```bash
docker run -d --name zap -p 8080:8080 ghcr.io/zaproxy/zaproxy:stable \
  zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.key=sentinel123
```

**Error in ZAP logs:**
```
Request to API URL http://localhost:8080/JSON/core/view/version/?apikey=sentinel123 
from 172.17.0.1 not permitted
```

**Cause:**  
ZAP 2.17.0 has strict API address whitelisting. When running inside Docker on Windows, Python connects from the host IP `172.17.0.1` (Docker bridge network), which is not on ZAP's allowed list by default.

**Attempted fixes that did NOT work:**
- `-config api.addrs.addr.name=.*` — flag ignored at runtime
- `-config api.addrs.addr(1).name=127.0.0.1` — syntax not supported
- Mounting a custom `config.xml` — caused `Device or resource busy` error
- `-config api.disablekey=true` — disables key check but not address check

**Resolution:**  
Abandoned Docker for ZAP. Installed ZAP natively on Windows instead.

---

## Error 2 — Custom config.xml Mount Failed

**Command used:**
```bash
docker run -d --name zap -p 8080:8080 \
  -v D:\Academia\Major_project\zap.config:/home/zap/.ZAP/config.xml \
  ghcr.io/zaproxy/zaproxy:stable zap.sh -daemon -host 0.0.0.0 -port 8080
```

**Error in ZAP logs:**
```
java.util.NoSuchElementException: 'version' doesn't map to an existing object
Unable to upgrade config file /home/zap/.ZAP/config.xml: Device or resource busy
```

**Cause:**  
ZAP's `config.xml` requires a complete schema including a `<version>` field. A partial config file (API section only) causes ZAP to reject and attempt to replace it, but the mounted file is read-only, causing the `Device or resource busy` error.

**Resolution:**  
Do not mount partial config files. Either mount a complete config or use command-line flags only.

---

## Error 3 — PowerShell Argument Parsing

**Command used (in PowerShell):**
```powershell
"C:\Program Files\ZAP\Zed Attack Proxy\zap.bat" -daemon -port 8080 -config api.key=sentinel123
```

**Error:**
```
Unexpected token '-daemon' in expression or statement.
Unexpected token '-port' in expression or statement.
```

**Cause:**  
PowerShell treats quoted executable paths followed by arguments differently from CMD. Arguments after a quoted path are parsed as expressions, not command arguments.

**Fix:**  
Use the `&` call operator in PowerShell:
```powershell
& "C:\Program Files\ZAP\Zed Attack Proxy\zap.bat" -daemon -port 8080
```
Or switch to CMD entirely.

---

## Error 4 — Wrong Working Directory for zap.bat

**Error:**
```
Error: Unable to access jarfile zap-2.17.0.jar
```

**Cause:**  
`zap.bat` looks for `zap-2.17.0.jar` in the current working directory. Running it from any other directory fails.

**Fix:**  
Always `cd` into the ZAP installation directory first:
```cmd
cd "C:\Program Files\ZAP\Zed Attack Proxy"
java -Xmx512m -jar zap-2.17.0.jar -daemon -port 8080 ...
```

---

## Error 5 — Native ZAP Listening on localhost Only

**ZAP log line:**
```
ZAP is now listening on localhost:8080
```

**Problem:**  
Even with `-host 0.0.0.0` flag, ZAP 2.17.0 native on Windows bound to `localhost` only. Additionally, even requests from `127.0.0.1` were being rejected:
```
Request to API URL http://localhost:8080/JSON/core/view/version/ 
from 127.0.0.1 not permitted
```

**Cause:**  
`api.disablekey=true` disables the API key requirement but does NOT disable the address whitelist. These are two separate security layers in ZAP 2.17.0.

---

## Error 6 — Python requests Connection Aborted

**Python error:**
```
('Connection aborted.', RemoteDisconnected('Remote end closed connection without response'))
```

**Cause:**  
ZAP receives the TCP connection, checks the request against its address whitelist, and immediately closes the connection if the address is not permitted. This manifests as a connection abort rather than a 403 response.

---

## ✅ Final Working Solution

**Start command (run from ZAP install directory in CMD as Administrator):**
```cmd
cd "C:\Program Files\ZAP\Zed Attack Proxy"
.\zap.bat -daemon -port 8080 -config api.disablekey=true -config api.addrs.addr.name=127.0.0.1 -config api.addrs.addr.regex=true
```

**Key flags:**
| Flag | Purpose |
|------|---------|
| `api.disablekey=true` | Removes API key requirement |
| `api.addrs.addr.name=127.0.0.1` | Explicitly whitelists 127.0.0.1 |
| `api.addrs.addr.regex=true` | Enables regex matching for the address |

**Python connection code:**
```python
from zapv2 import ZAPv2

zap = ZAPv2(apikey="", proxies={
    "http": "http://127.0.0.1:8080",
    "https": "http://127.0.0.1:8080"
})

print(zap.core.version)  # Should print 2.17.0
```

**Verification:**
```
http://127.0.0.1:8080/JSON/core/view/version/
→ {"version":"2.17.0"}
```

---

## Key Lessons

1. ZAP 2.17.0 has TWO separate API security layers — key auth AND address whitelist. Disabling one does not disable the other.
2. Docker networking on Windows adds complexity — the host appears as `172.17.0.1` inside containers, not `127.0.0.1`.
3. Always run ZAP from its own install directory, not from your project folder.
4. Use CMD not PowerShell for running `.bat` files with arguments, unless using the `&` operator.
5. `api.addrs.addr.regex=true` is required for the address whitelist to work correctly.
