# build/build-windows.ps1
# Builds AVC.exe and places it in dist/beta/b{N}/windows/
# Run from the repo root: .\build\build-windows.ps1
# Optional -Bump flag increments the build number before building.

param(
    [switch]$Bump    # pass -Bump to increment BUILD_NUMBER
)

$Root = Split-Path $PSScriptRoot -Parent

# ── Read / bump build number ─────────────────────────────────────────────────
$NumFile = Join-Path $Root "BUILD_NUMBER"
$Num = [int](Get-Content $NumFile -Raw).Trim()

if ($Bump) {
    $Num++
    Set-Content $NumFile $Num
    Write-Host "Build number bumped to $Num" -ForegroundColor Cyan
}

$BuildTag = "b{0:D3}" -f $Num
$OutDir   = Join-Path $Root "dist\beta\$BuildTag\windows"
Write-Host "Building $BuildTag → $OutDir" -ForegroundColor Cyan

# ── Kill any running AVC / python processes ──────────────────────────────────
Write-Host "Killing AVC and python processes..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.Name -like 'AVC*' -or $_.Name -like 'python*' } |
    ForEach-Object { taskkill /F /PID $_.Id /T 2>$null }
Start-Sleep 1

# ── Build frontend ────────────────────────────────────────────────────────────
Write-Host "Building React frontend..." -ForegroundColor Yellow
Push-Location (Join-Path $Root "frontend")
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "Frontend build failed"; exit 1 }
Pop-Location

# ── PyInstaller ───────────────────────────────────────────────────────────────
Write-Host "Running PyInstaller..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$Venv = Join-Path $Root "backend\.venv\Scripts\pyinstaller.exe"
& $Venv (Join-Path $Root "build\avc.spec") `
    --distpath $OutDir `
    --workpath (Join-Path $Root "build\tmp") `
    --clean
if ($LASTEXITCODE -ne 0) { Write-Error "PyInstaller failed"; exit 1 }

Write-Host ""
Write-Host "Done: $OutDir\AVC.exe" -ForegroundColor Green
Write-Host "Build: $BuildTag  (use -Bump next time to increment)" -ForegroundColor Gray
