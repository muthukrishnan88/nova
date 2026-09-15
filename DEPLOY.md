# SAFNEX NOVA - Render Deployment Guide

## Quick Deploy (5 minutes)

### Step 1: Open Render
Go to: https://dashboard.render.com/select-repo?type=web

### Step 2: Connect GitHub
- Login with GitHub
- Authorize Render
- Select repository: **muthukrishnan88/nova**
- Click "Connect"

### Step 3: Configure Service
Render auto-detects settings from `render.yaml`:
- Name: `safnex-nova`
- Environment: Node
- Build: `npm install`
- Start: `npm start`
- Plan: **Free**

### Step 4: Add Environment Variables
Click "Advanced" → Add these variables (get values from your `.env` file):

```
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-4o

TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>

NUMVERIFY_API_KEY=<your-numverify-key>

MONGODB_URI=<your-mongodb-uri>
MONGODB_DATABASE=safnex_nova
MONGODB_COLLECTION=trai_sms_headers.xlsx
```

**Important:** Copy actual values from your `.env` file in project root.

### Step 5: Deploy
- Click "Create Web Service"
- Wait 5-10 minutes
- Render builds and deploys automatically

### Step 6: Get Live URL
After deploy completes:
- Copy URL (like `https://safnex-nova.onrender.com`)
- Test: Open `https://safnex-nova.onrender.com/home.html`

### Step 7: Update Extension API (Optional)
If users install extension:
1. Edit `extension/background.js` line 3
2. Change to: `const API_URL = "https://safnex-nova.onrender.com/api/analyze";`
3. Reload extension in Chrome

## Live URLs After Deploy

**Home Page:**
```
https://safnex-nova.onrender.com/home.html
```

**Extension Download:**
```
https://safnex-nova.onrender.com/get-extension.html
```

**Direct Extension ZIP:**
```
https://safnex-nova.onrender.com/safnex-extension.zip
```

**All Detectors:**
- Video: `/video-detector.html`
- Audio: `/voice-detector.html`
- Image: `/image-detector.html`
- Link: `/link-detector.html`
- Phone: `/phonenumber-detect.html`
- QR: `/qr-detector.html`
- Message: `/message-detector.html`

## Mobile Responsiveness

✓ **Desktop:** Full extension install flow with modal
✓ **Mobile:** Shows "Use online scanner" message with share option
✓ **Tablet:** Auto-detects and shows appropriate UI
✓ **All devices:** Online scanner works on any device

## Free Tier Limits (Render)

- ✓ Free hosting forever
- ✓ Custom domain supported
- ✓ Auto-deploys on git push
- ✓ SSL certificate included
- ⚠ Sleeps after 15 min inactivity (wakes in ~30 sec)
- ⚠ 750 hours/month limit (easily upgradable)

## After Deployment

Share these links with users:
- **Main site:** `https://safnex-nova.onrender.com/home.html`
- **Extension:** `https://safnex-nova.onrender.com/get-extension.html`

Users can:
1. **Desktop:** Download & install browser extension for automatic link protection
2. **Mobile:** Use online scanner for manual security checks
3. **All:** Scan links, videos, audio, images, messages, QR codes, phone numbers

## Quick Start for Users

**Desktop Users:**
1. Visit site
2. Click menu (☰) → Get Extension
3. Download → Extract → Load in Chrome
4. Protected automatically

**Mobile Users:**
1. Visit site
2. Click menu → Shows mobile message
3. Use online scanner OR share link to desktop
4. Manual scanning available

## Features Live After Deploy

✓ Link analyzer (phishing detection)
✓ Video AI detector (deepfake detection)
✓ Audio deepfake detector
✓ Image authenticity checker
✓ Message scam detector
✓ QR code safety scanner
✓ Phone number verification
✓ Browser extension (Chrome/Edge/Brave)
✓ Mobile-responsive UI
✓ Professional landing pages
✓ One-click installation flow
