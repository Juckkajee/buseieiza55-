@echo off
cd /d "%~dp0client"
call npm.cmd run dev
pause
