@echo off
chcp 65001 > nul
title MOVEMAN 안드로이드 APK 원클릭 자동 배포

echo ====================================================
echo  🚀 MOVEMAN APK 자동 덮어쓰기 및 Render 배포 시작
echo ====================================================
echo.

cd /d "%~dp0"
node scripts\deploy-apk.js

echo.
echo 작업이 완료되었습니다. 창을 닫으려면 아무 키나 누르세요.
pause > nul
