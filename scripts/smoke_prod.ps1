# Production smoke test. Run from project root.
# Set BASE_URL and CRON_SECRET for full test.
$base = if ($env:BASE_URL) { $env:BASE_URL.TrimEnd("/") } else { "https://surplus-bus.vercel.app" }
$secret = $env:CRON_SECRET

$passed = 0
$failed = 0

function Test-Endpoint {
  param($Name, $Uri, $Headers = @{}, $ExpectStatus = 200)
  try {
    $r = Invoke-WebRequest -Uri $Uri -Headers $Headers -UseBasicParsing -ErrorAction Stop
    if ($r.StatusCode -eq $ExpectStatus) {
      Write-Host "PASS: $Name" -ForegroundColor Green
      $script:passed++
      return $true
    }
    Write-Host "FAIL: $Name (expected $ExpectStatus, got $($r.StatusCode))" -ForegroundColor Red
    $script:failed++
    return $false
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq $ExpectStatus) {
      Write-Host "PASS: $Name (got expected $ExpectStatus)" -ForegroundColor Green
      $script:passed++
      return $true
    }
    Write-Host "FAIL: $Name ($_)" -ForegroundColor Red
    $script:failed++
    return $false
  }
}

Write-Host "`n=== Smoke: $base ===`n" -ForegroundColor Cyan

Test-Endpoint -Name "/api/_ping" -Uri "$base/api/_ping" | Out-Null

Test-Endpoint -Name "/api/health" -Uri "$base/api/health" | Out-Null

# /api/status requires auth - expect 401 when not logged in
Test-Endpoint -Name "/api/status (expect 401)" -Uri "$base/api/status" -ExpectStatus 401 | Out-Null

if ($secret) {
  Test-Endpoint -Name "agent run (gc_buyandsell)" -Uri "$base/api/agents/run?parser_key=gc_buyandsell" -Headers @{ Authorization = "Bearer $secret" } | Out-Null
} else {
  Write-Host "SKIP: agent run (CRON_SECRET not set)" -ForegroundColor Yellow
}

Write-Host "`n--- Result: $passed passed, $failed failed ---`n" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
exit $failed
