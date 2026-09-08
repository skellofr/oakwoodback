@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo    Publication d'une nouvelle version Oakwood
echo ================================================
echo.
node scripts\publish.js
echo.
pause
