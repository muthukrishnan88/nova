# SAFNEX NOVA Android App

Android app that intercepts links from any app (WhatsApp, Instagram, Telegram, Browser) and checks them for security threats before opening.

## Features

- **Link Interception** - Detects when you click any link in any app
- **Instant Security Check** - Analyzes link safety in under 1 second
- **Popup Alert** - Shows risk level before opening link
- **Enable/Disable Toggle** - Turn protection on/off easily
- **Full Report** - View detailed analysis on web interface

## How It Works

1. User enables accessibility permission
2. App monitors link clicks across all apps
3. When link detected, shows popup with risk level
4. User decides: Open Link or Cancel
5. Connects to SAFNEX NOVA backend API for analysis

## Build Instructions

### Prerequisites

- Android Studio Hedgehog or newer
- Android SDK 24+ (Android 7.0+)
- JDK 17+

### Steps

1. Open Android Studio
2. File → Open → Select `android-app` folder
3. Wait for Gradle sync
4. Connect Android device or start emulator
5. Click Run (▶️) button

### Build APK

```bash
cd android-app
./gradlew assembleRelease
```

APK location: `app/build/outputs/apk/release/app-release-unsigned.apk`

### Sign APK (for distribution)

1. Generate keystore:
```bash
keytool -genkey -v -keystore safnex-nova.keystore -alias safnex -keyalg RSA -keysize 2048 -validity 10000
```

2. Sign APK:
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore safnex-nova.keystore app-release-unsigned.apk safnex
```

## Configuration

Update API URL in `ApiClient.kt`:
```kotlin
private const val API_BASE_URL = "https://your-backend-url.com"
```

Default: `https://safnex-nova.onrender.com`

## Permissions

- **Accessibility Service** - Detects links in other apps
- **Overlay Permission** - Shows popup over other apps
- **Internet** - Connects to SAFNEX API

## Testing

1. Install app on Android device
2. Enable in Settings → Accessibility → SAFNEX NOVA
3. Grant overlay permission
4. Toggle "Link Protection" ON
5. Open WhatsApp/Browser and click any link
6. Popup should appear with security check

## Privacy

- App only reads visible on-screen content to detect links
- No personal data collected or stored
- Links sent to SAFNEX API only for security analysis
- Source code available for audit

## License

ISC
