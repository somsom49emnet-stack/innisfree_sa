[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==================================================" -ForegroundColor Green
Write-Host "🌿 이니스프리 SA 대시보드 원클릭 자동 업데이트" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Green

# 1. fast_generator.ps1 실행
$scriptPath = Join-Path $PSScriptRoot "fast_generator.ps1"
if (Test-Path $scriptPath) {
    Write-Host "`n[1/2] RAW2.xlsx 데이터 전처리 및 재집계 중..." -ForegroundColor Yellow
    try {
        & $scriptPath
    } catch {
        Write-Host "`n❌ 데이터 전처리 과정에서 오류가 발생했습니다: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n❌ fast_generator.ps1 파일을 찾을 수 없습니다." -ForegroundColor Red
    exit 1
}

# 2. Git 변경사항 확인 및 자동 Push
Write-Host "`n[2/2] GitHub 배포 웹사이트로 푸시 중..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"

git add dashboard_data.js dashboard_data.json index.html styles.css app.js fast_generator.ps1 update_and_push.ps1
$status = git status --porcelain

if ($status) {
    git commit -m "RAW2 데이터 수정사항 자동 반영 ($timestamp)"
    git push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n==================================================" -ForegroundColor Green
        Write-Host "✅ 성공적으로 최신 데이터가 GitHub에 업데이트되었습니다!" -ForegroundColor Green
        Write-Host "🚀 약 1~2분 뒤 배포된 웹사이트에서 새로고침하여 확인하세요." -ForegroundColor Cyan
        Write-Host "==================================================" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Git push 중 오류가 발생했습니다." -ForegroundColor Red
    }
} else {
    Write-Host "`nℹ️ 변경된 데이터가 없습니다. (RAW2.xlsx 파일에 수정사항이 없거나 이미 최신 상태입니다)" -ForegroundColor Cyan
}
