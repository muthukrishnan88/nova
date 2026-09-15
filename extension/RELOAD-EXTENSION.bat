@echo off
echo ========================================
echo SAFNEX NOVA Extension Reload Guide
echo ========================================
echo.
echo Your extension files are ready.
echo.
echo STEP-BY-STEP RELOAD:
echo.
echo 1. Open Chrome browser
echo.
echo 2. Go to: chrome://extensions/
echo.
echo 3. Enable "Developer mode" (top-right toggle)
echo.
echo 4. Find "SAFNEX NOVA Link Guard"
echo.
echo 5. Click REMOVE button
echo.
echo 6. Click "Load unpacked" button
echo.
echo 7. Select this folder:
echo    %~dp0
echo.
echo 8. Extension will reload with latest code
echo.
echo 9. Open test page:
echo    %~dp0..\test-extension.html
echo.
echo 10. Click any link to test all buttons
echo.
echo ========================================
echo Press any key to open test page...
echo ========================================
pause >nul
start "" "%~dp0..\test-extension.html"
