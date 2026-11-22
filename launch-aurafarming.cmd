@echo off
setlocal
cd /d "D:\aurafarming-harness"
set "ELECTRON_RUN_AS_NODE="
call corepack pnpm run start:desktop
