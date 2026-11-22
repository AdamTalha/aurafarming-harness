@echo off
setlocal
set "ELECTRON_RUN_AS_NODE="
cd /d "%~dp0apps\desktop"
start "" "%~dp0apps\desktop\node_modules\electron\dist\electron.exe" "dist-electron\boot.cjs"
