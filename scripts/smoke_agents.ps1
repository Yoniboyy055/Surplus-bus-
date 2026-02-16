# Smoke test for agent endpoints. Requires CRON_SECRET in env.
$secret = $env:CRON_SECRET
if (-not $secret) {
  Write-Host "ERROR: Set CRON_SECRET in env first." -ForegroundColor Red
  exit 1
}

$base = "https://surplus-bus.vercel.app/api/agents/run"
$keys = @("gc_buyandsell", "canadabuys", "ab_surplus", "on_surplus", "city_toronto_surplus")

foreach ($key in $keys) {
  Write-Host "`n--- $key ---" -ForegroundColor Cyan
  try {
    $r = Invoke-WebRequest -Uri "$base`?parser_key=$key" -Headers @{ Authorization = "Bearer $secret" } -UseBasicParsing
    $r.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
  } catch {
    Write-Host "FAIL: $_" -ForegroundColor Red
  }
}
