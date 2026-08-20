@echo off
title ISO Termizy Avlodlari - LMS
color 0E
echo.
echo  ==========================================
echo    ISO Termizy Avlodlari - LMS Platform
echo    Xorijiy tillar o'quv markazi
echo  ==========================================
echo.
echo  [1/3] Kutubxonalar o'rnatilmoqda...
echo.

cd /d "%~dp0"

call npm install --silent 2>nul
call npm --prefix server install --silent 2>nul
call npm --prefix client install --silent 2>nul

echo.
echo  [2/3] Server ishga tushmoqda (port 4000)...
echo.

start /b cmd /c "cd server && npm run dev"

echo  [3/3] Frontend ishga tushmoqda (port 5173)...
echo.

timeout /t 3 /nobreak >nul

cd client
call npm run dev

pause
