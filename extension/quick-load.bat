@echo off
echo Checking for icons...
dir /b extension\icon*.png 2>nul | findstr "icon16 icon48 icon128" >nul
if errorlevel 1 (
  echo ERROR: Icons missing!
  echo Move icon16.png, icon48.png, icon128.png to extension folder
  pause
  exit /b 1
)
echo.
echo ✓ Icons found
echo Opening Chrome...
start chrome://extensions/
echo.
echo NEXT STEPS:
echo 1. Enable "Developer mode" ^(top-right^)
echo 2. Click "Load unpacked"
echo 3. Select: %~dp0extension
echo.
pause
