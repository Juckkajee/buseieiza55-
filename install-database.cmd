@echo off
cd /d "%~dp0server"
if exist ..\runtime\node.exe (
  ..\runtime\node.exe --env-file=.env scripts\install-database.js --apply
) else (
  node --env-file=.env scripts\install-database.js --apply
)
pause
