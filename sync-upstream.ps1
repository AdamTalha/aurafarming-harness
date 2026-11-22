<#
.SYNOPSIS
  Synchronise AuraFarming avec la dernière version officielle de T3 Code (upstream/main)
  et recompile l'application desktop.
#>
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "==> 1/4 Récupération de upstream (pingdotgg/t3code)..." -ForegroundColor Cyan
git fetch upstream --tags

Write-Host "==> 2/4 Rebase de la branche aurafarming sur upstream/main..." -ForegroundColor Cyan
git rebase upstream/main

Write-Host "==> 3/4 Installation des dépendances..." -ForegroundColor Cyan
corepack pnpm install --frozen-lockfile --filter "!./apps/mobile" --filter "!./apps/marketing"

Write-Host "==> 4/4 Build desktop + web + server..." -ForegroundColor Cyan
corepack pnpm run build:desktop

Write-Host "Terminé ! Tu peux relancer AuraFarming." -ForegroundColor Green
