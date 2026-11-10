# NAVRIX Quick Tunnel Launcher
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  NAVRIX - Share Localhost to Remote Client via Cloudflare HTTPS" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

try {
  $res = Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -TimeoutSec 3
  Write-Host "  -> Local server is RUNNING (HTTP $($res.StatusCode))" -ForegroundColor Green
} catch {
  Write-Host "  -> WARNING: Local server is not responding on port 3000. Start it with 'pnpm run dev' first." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Launching secure Cloudflare HTTPS quick tunnel on port 3000..." -ForegroundColor Cyan
Write-Host "Copy and share the generated https://*.trycloudflare.com URL with your client." -ForegroundColor Gray
Write-Host "Press Ctrl+C anytime to stop sharing." -ForegroundColor DarkGray
Write-Host "----------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

cloudflared tunnel --url http://localhost:3000
