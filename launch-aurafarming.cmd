@echo off
setlocal
cd /d "%~dp0"
set "ELECTRON_RUN_AS_NODE="
call corepack pnpm run start:desktop
