@echo off
echo ════════════════════════════════════════════════
echo   FORCE EXTENSION RELOAD - RUN THIS NOW
echo ════════════════════════════════════════════════
echo.
echo This will FORCE Chrome to load the new version.
echo.
echo STEP 1: Close Chrome NOW
echo.
taskkill /F /IM chrome.exe 2>nul
timeout /t 2 >nul
echo ✓ Chrome closed
echo.
echo STEP 2: Delete Extension Cache
echo.
rd /s /q "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Extensions" 2>nul
echo ✓ Cache deleted
echo.
echo STEP 3: Restart Chrome
echo.
start chrome.exe chrome://extensions/
timeout /t 3 >nul
echo.
echo ════════════════════════════════════════════════
echo   NOW DO THIS:
echo ════════════════════════════════════════════════
echo.
echo 1. In Chrome Extensions page:
echo    → Enable "Developer mode" (top right)
echo    → Click "Load unpacked"
echo    → Select: %~dp0
echo    → Extension loads with version 1.0.1
echo.
echo 2. Open TEST-BUTTONS.html to verify
echo.
echo 3. Look for 🛡️ emoji in console
echo.
echo ════════════════════════════════════════════════
pause
