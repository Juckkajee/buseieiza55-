@echo off
cd /d "%~dp0server"
call npm.cmd run dev
pause
