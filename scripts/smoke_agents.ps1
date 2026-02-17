# Smoke test for agent endpoints. Requires CRON_SECRET in env.
$secret = $env:CRON_SECRET
$hostBase = if ($env:BASE_URL) { $env:BASE_URL.TrimEnd("/") } else { "https://surplus-bus.vercel.app" }
$base = "$hostBase/api/agents/run"

if (-not $secret) {
  Write-Host "FAIL: Set CRON_SECRET in env first." -ForegroundColor Red
  exit 1
}

$keys = @("gc_buyandsell", "canadabuys", "ab_surplus", "on_surplus", "city_toronto_surplus", "city_ottawa_surplus", "city_calgary_surplus", "city_edmonton_surplus")
$passed = 0
$failed = 0

foreach ($key in $keys) {
  try {
    $r = Invoke-WebRequest -Uri "$base`?parser_key=$key" -Headers @{ Authorization = "Bearer $secret" } -UseBasicParsing
    $json = $r.Content | ConvertFrom-Json
    if ($json.ok -eq $true) {
      Write-Host "PASS: $key" -ForegroundColor Green
      $passed++
    } else {
      Write-Host "FAIL: $key (ok=$($json.ok))" -ForegroundColor Red
      $failed++
    }
  } catch {
    Write-Host "FAIL: $key - $_" -ForegroundColor Red
    $failed++
  }
}

Write-Host "`n--- Result: $passed passed, $failed failed ---" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
exit $failed
