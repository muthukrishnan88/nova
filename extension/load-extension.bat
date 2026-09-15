@echo off
echo Checking icons...
if not exist icon16.png (
  echo ERROR: icon16.png missing!
  echo Run: make-icons.bat first
  pause
  exit /b 1
)
if not exist icon48.png (
  echo ERROR: icon48.png missing!
  pause
  exit /b 1
)
if not exist icon128.png (
  echo ERROR: icon128.png missing!
  pause
  exit /b 1
)

echo.
echo ✓ All icons present
echo.
echo Opening Chrome extensions page...
start chrome://extensions/
echo.
echo INSTRUCTIONS:
echo 1. Enable "Developer mode" (top-right toggle)
echo 2. Click "Load unpacked"
echo 3. Select this folder: %CD%
echo 4. Extension will appear in toolbar
echo.
echo To test: Open test-page.html and click any link
echo.
pause
