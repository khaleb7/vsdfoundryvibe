# Packages the vsd system for a GitHub Release (system.json + vsd.zip).
# Usage:
#   .\tools\package-release.ps1
#   .\tools\package-release.ps1 -GitHubRepo "yourname/vsd"

param(
  [string]$GitHubRepo = "khaleb7/vsdfoundryvibe"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$dist = Join-Path $root "dist"
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path $dist | Out-Null
$stage = Join-Path $dist "vsd"
New-Item -ItemType Directory -Path $stage | Out-Null

$exclude = @(
  ".git", ".vscode", "dist", "node_modules", "data-toolbox",
  "_gen_models.py", "V13-V14-INVENTORY.md", "template.json"
)

Get-ChildItem $root -Force | Where-Object {
  $exclude -notcontains $_.Name
} | ForEach-Object {
  Copy-Item $_.FullName -Destination $stage -Recurse -Force
}

# Point manifest URLs at this GitHub repo's latest release assets
$manifestPath = Join-Path $stage "system.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$base = "https://github.com/$GitHubRepo/releases/latest/download"
$manifest.url = "https://github.com/$GitHubRepo"
$manifest.manifest = "$base/system.json"
$manifest.download = "$base/vsd.zip"
$manifest.bugs = "https://github.com/$GitHubRepo/issues"
# UTF-8 without BOM — Foundry's JSON.parse rejects the EF BB BF prefix from Set-Content -Encoding utf8
$jsonPath = Join-Path $dist "system.json"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($jsonPath, ($manifest | ConvertTo-Json -Depth 20), $utf8NoBom)
Copy-Item $jsonPath $manifestPath -Force

$zip = Join-Path $dist "vsd.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path $stage -DestinationPath $zip -Force

Write-Host "Created:"
Write-Host "  $zip"
Write-Host "  $(Join-Path $dist 'system.json')"
Write-Host ""
Write-Host "Upload both files as GitHub Release assets, then install via:"
Write-Host "  $base/system.json"
