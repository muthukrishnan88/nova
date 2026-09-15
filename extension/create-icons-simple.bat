@echo off
echo Creating icons from SAFNEX logo...
echo.
echo This uses Windows built-in image tools.
echo.

where magick >nul 2>&1
if %errorlevel% neq 0 (
  echo ImageMagick not found.
  echo.
  echo EASIEST METHOD:
  echo 1. Refresh convert-logo.html in browser ^(press F5^)
  echo 2. Click "Convert Logo to Icons" button
  echo 3. Icons download automatically
  echo.
  pause
  exit /b 1
)

echo Converting logo.jpeg to icons...
magick logo.jpeg -resize 16x16 icon16.png
magick logo.jpeg -resize 48x48 icon48.png
magick logo.jpeg -resize 128x128 icon128.png

if exist icon16.png (
  echo ✓ icon16.png created
)
if exist icon48.png (
  echo ✓ icon48.png created
)
if exist icon128.png (
  echo ✓ icon128.png created
)

echo.
echo Done! Run load-extension.bat next
pause
