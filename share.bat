@echo off
title NAVRIX Tunnel - Share Localhost with Client
cls
echo ================================================================
echo   NAVRIX - Share Localhost to Remote Client via Cloudflare HTTPS
echo ================================================================
echo.
echo [1/2] Checking local server on http://localhost:3000 ...
powershell -Command "try { $res = Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -TimeoutSec 3; Write-Host '  -> Local server is RUNNING (HTTP ' $res.StatusCode ')' -ForegroundColor Green } catch { Write-Host '  -> WARNING: Local server is not responding yet on port 3000. Make sure your server is running (npm run dev).' -ForegroundColor Yellow }"
echo.
echo [2/2] Launching secure Cloudflare HTTPS quick tunnel...
echo.
echo Look for the public URL ending in .trycloudflare.com below:
echo (Copy and send that URL to your client)
echo.
echo Press Ctrl+C anytime to stop sharing.
echo ----------------------------------------------------------------
cloudflared tunnel --url http://localhost:3000
pause
