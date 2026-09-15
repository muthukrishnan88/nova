# Quick Setup Guide

## Step 1: Create Icon Files (Required)

Extension needs 3 PNG icons. Fastest methods:

### Method A: Online Converter (Easiest)
1. Open `icon.svg` in this folder
2. Go to https://svgtopng.com or https://cloudconvert.com/svg-to-png
3. Upload `icon.svg`
4. Export as:
   - 16x16 → save as `icon16.png`
   - 48x48 → save as `icon48.png`  
   - 128x128 → save as `icon128.png`
5. Place all 3 PNG files in `/extension` folder

### Method B: Use Browser
1. Open `create-icons.html` in Chrome
2. 3 PNG files download automatically
3. Rename them: `icon16.png`, `icon48.png`, `icon128.png`

### Method C: Use GIMP/Photoshop
1. Open `icon.svg`
2. Export 3 sizes manually

## Step 2: Load Extension

1. Open Chrome: `chrome://extensions/`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked**
4. Select the `/extension` folder
5. Done! Extension appears in toolbar

## Step 3: Test

1. Visit any website (not chrome:// pages)
2. Click any external link
3. SAFNEX popup appears with risk analysis
4. Try these test links:
   - Safe: https://google.com
   - Suspicious: https://bit.ly/test123
   - Dangerous: https://malicious-test-domain.com

## Step 4: Verify Website Integration

1. Visit: http://localhost:3000/home.html (or your deployed URL)
2. Look at top-right navbar
3. Shield button with green pulse = extension detected
4. Click it to see protection status

## Troubleshooting

**Badge not showing on website?**
- Refresh page after loading extension
- Check browser console for errors
- Make sure content.js is injecting correctly

**Links not intercepting?**
- Extension only works on `http://` and `https://` pages
- Won't work on `chrome://` or `file://` URLs
- Check extension is enabled in `chrome://extensions/`

**API errors?**
- Edit `background.js` line 3 for correct API URL
- Local: `http://localhost:3000/api/analyze`
- Deployed: `https://safnex-nova.onrender.com/api/analyze`

## Publishing to Chrome Web Store

1. Create ZIP of `/extension` folder (must include icons!)
2. Go to: https://chrome.google.com/webstore/devconsole
3. Pay $5 one-time fee
4. Upload ZIP
5. Fill store listing (screenshots, description)
6. Submit for review (1-3 days)
