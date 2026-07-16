@echo off
REM Double-click to render your latest exported chart config to video.
REM First in the app: Export -> "Config (JSON)".
cd /d "%~dp0"
call npm run export -- %*
echo.
pause
