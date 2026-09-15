# SAFNEX NOVA Link Guard - Chrome Extension

## Installation

### Step 1: Generate Icons
Create 3 PNG icon files (16x16, 48x48, 128x128) with shield emoji or logo:
- `icon16.png`
- `icon48.png`
- `icon128.png`

Use any icon generator or design tool. Place files in `/extension` folder.

### Step 2: Load Extension in Chrome

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `/extension` folder
5. Extension will appear in toolbar

### Step 3: Test

1. Visit any website
2. Click any external link
3. SAFNEX popup will appear showing link risk analysis
4. Options: Cancel, Visit Anyway, or Check in SAFNEX

## Features

- **Automatic Link Interception**: Checks all external links before navigation
- **Real-time Risk Analysis**: Uses SAFNEX NOVA AI API
- **Visual Risk Indicators**: Color-coded warnings (Safe/Warning/Danger)
- **One-Click Actions**: Visit anyway or analyze in full SAFNEX dashboard
- **Website Integration**: Shows extension status badge on safnex-nova.onrender.com

## API Configuration

Edit `background.js` line 3 to change API endpoint:
```javascript
const API_URL = "https://safnex-nova.onrender.com/api/analyze";
```

For local testing:
```javascript
const API_URL = "http://localhost:3000/api/analyze";
```

## Publishing to Chrome Web Store

1. Create icons (required sizes: 16, 48, 128)
2. Zip the `/extension` folder
3. Go to: https://chrome.google.com/webstore/devconsole
4. Pay $5 one-time developer fee
5. Upload ZIP and fill store listing
6. Submit for review (~1-3 days)

## Files

- `manifest.json` - Extension configuration
- `background.js` - Service worker (API calls)
- `content.js` - Injected script (link interception)
- `popup.html` - Extension popup UI
- `popup.css` - Overlay styling
- `icon*.png` - Extension icons (you need to create these)
