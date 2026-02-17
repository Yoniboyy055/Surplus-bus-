# Fail if SERVICE_ROLE or serviceRole appears in client components.
# app/api/* are server routes (OK). Check app/ (non-api) and components/.
$bad = @()
Get-ChildItem -Path "app", "components" -Recurse -Include "*.tsx","*.ts" -File -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch "\\app\\api\\" } |
  ForEach-Object {
    $content = (Get-Content $_.FullName -ErrorAction SilentlyContinue) -join "`n"
    if ($content -match "SERVICE_ROLE|serviceRole|service_role") {
      $bad += $_.FullName
    }
  }

if ($bad.Count -gt 0) {
  Write-Host "FAIL: SERVICE_ROLE/serviceRole in client bundle:" -ForegroundColor Red
  $bad | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  exit 1
}
Write-Host "PASS: No SERVICE_ROLE in client components" -ForegroundColor Green
exit 0
