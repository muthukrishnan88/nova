@echo off
echo Building SAFNEX NOVA Android APK...
echo.
echo Make sure Android Studio is installed!
echo.
pause

call gradlew.bat assembleDebug

if %ERRORLEVEL% == 0 (
    echo.
    echo ========================================
    echo BUILD SUCCESS!
    echo ========================================
    echo.
    echo APK Location:
    echo app\build\outputs\apk\debug\app-debug.apk
    echo.
    pause
) else (
    echo.
    echo BUILD FAILED! Check errors above.
    pause
)
