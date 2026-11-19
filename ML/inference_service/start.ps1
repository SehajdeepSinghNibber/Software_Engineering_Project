$ErrorActionPreference = "Stop"
$serviceRoot = $PSScriptRoot
Set-Location $serviceRoot

$venvRoot = Join-Path $serviceRoot ".venv"
$sitePackages = @(
    (Join-Path $venvRoot "drnet-test-site"),
    (Join-Path $venvRoot "Lib\site-packages")
) | Where-Object { Test-Path $_ }

$pythonPathParts = @($sitePackages)
if ($env:PYTHONPATH) { $pythonPathParts += $env:PYTHONPATH }
$env:PYTHONPATH = $pythonPathParts -join ";"

$candidates = @()
$venvPython = Join-Path $venvRoot "Scripts\python.exe"
if (Test-Path $venvPython) { $candidates += $venvPython }

# Some Windows installs expose a WindowsApps alias that cannot launch a venv.
# Prefer the regular per-user installation when that alias is the venv base.
if ($env:LOCALAPPDATA) {
    $candidates += Join-Path $env:LOCALAPPDATA "Programs\Python\Python313\python.exe"
}

foreach ($line in (& py -0p 2>$null)) {
    if ($line -match "^\s*-V:[^\s]+\s+(.+python(?:\d+)?\.exe)\s*$") {
        $candidates += $Matches[1].Trim()
    }
}

$python = $null
foreach ($candidate in ($candidates | Select-Object -Unique)) {
    if (-not (Test-Path $candidate)) { continue }
    try {
        $smokeOutput = & $candidate -c "import torch, fastapi, uvicorn, PIL" 2>&1
        if ($LASTEXITCODE -eq 0) {
            $python = $candidate
            break
        }
    } catch {
        # Ignore stale venv launchers and continue to the installed interpreters.
    }
}

if (-not $python) {
    Write-Error "No usable Python interpreter with the installed ML dependencies was found. Repair ML/inference_service/.venv or set ML_PYTHON to a compatible interpreter."
    exit 1
}

Write-Host "Starting inference service with $python"
& $python "app.py"
exit $LASTEXITCODE
