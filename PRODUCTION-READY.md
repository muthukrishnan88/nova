# ✅ SAFNEX NOVA - Production Ready

## Current Status

**All files configured for production Render deployment.**

### API Endpoints
- Backend: `https://safnex-nova.onrender.com`
- Extension points to production API
- All detector pages ready

### Extension Configuration

**background.js:**
```javascript
const API_URL = "https://safnex-nova.onrender.com/api/analyze";
```

**content.js:**
```javascript
window.open(`https://safnex-nova.onrender.com/link-detector.html?url=...`);
```

✅ No localhost references in production code
✅ All URLs point to Render deployment
✅ CSP-compliant (no inline scripts)
✅ Professional 2-button design

## Deployment Checklist

### Backend (Render.com)
- [ ] Open https://dashboard.render.com/
- [ ] Connect GitHub repo: `muthukrishnan88/nova`
- [ ] Add environment variable: `OPENAI_API_KEY`
- [ ] Add environment variable: `OPENAI_MODEL=gpt-4o`
- [ ] Click "Create Web Service"
- [ ] Wait 5-10 minutes for deployment
- [ ] Test: https://safnex-nova.onrender.com/home.html

### Extension (Chrome)
- [ ] Open chrome://extensions/
- [ ] Enable "Developer mode"
- [ ] Click "Load unpacked"
- [ ] Select: `extension` folder
- [ ] Test on https://example.com
- [ ] Click external link → Popup appears
- [ ] Test "Check Website" button
- [ ] Test "Open Directly" button

### Testing After Deploy

**Backend APIs:**
```bash
# Test link analyzer
curl -X POST https://safnex-nova.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"https://google.com"}'

# Test health check
curl https://safnex-nova.onrender.com/api/health
```

**Frontend Pages:**
- ✅ https://safnex-nova.onrender.com/home.html
- ✅ https://safnex-nova.onrender.com/link-detector.html
- ✅ https://safnex-nova.onrender.com/get-extension.html
- ✅ https://safnex-nova.onrender.com/qr-detector.html
- ✅ https://safnex-nova.onrender.com/phonenumber-detect.html
- ✅ https://safnex-nova.onrender.com/message-detector.html
- ✅ https://safnex-nova.onrender.com/image-detector.html
- ✅ https://safnex-nova.onrender.com/voice-detector.html
- ✅ https://safnex-nova.onrender.com/video-detector.html

**Extension Test Flow:**
1. Open https://example.com
2. Click any external link
3. Popup appears with:
   - 🔒 Lock icon
   - "Link Protection" title
   - URL display
   - "Check Website" button (opens link-detector)
   - "Open Directly" button (navigates to URL)
   - Close (X) button

## Features Deployed

### Web Application
- 🔗 Link Intelligence (AI-powered phishing detection)
- 📱 QR Code Scanner
- 📞 Phone Number Validator
- 💬 Message Scam Detector
- 🖼️ Image AI Detection
- 🎤 Voice Deepfake Detection
- 🎥 Video AI Detection
- 🏠 Professional Landing Page
- 📦 Extension Download Page

### Chrome Extension
- Link interception on all websites
- Instant popup (no backend wait)
- Two-choice interface:
  - Analyze first (opens link-detector)
  - Trust and open (navigate directly)
- CSP-compliant manifest V3
- Clean professional design

## Environment Variables Required

```env
# Required
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4o

# Optional (for full features)
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
NUMVERIFY_API_KEY=your-key
```

## Performance

**Free Tier (Render):**
- ⚠️ Sleeps after 15 min inactivity
- ⚠️ 30 sec wake time on first request
- ⚠️ 750 hours/month limit
- ✅ Auto-deploys on git push
- ✅ SSL included
- ✅ Custom domain supported

## Post-Deploy Updates

**If you need to update extension after deploy:**

1. Update extension ZIP:
```bash
powershell Compress-Archive -Path extension\* -DestinationPath safnex-extension.zip -Force
git add safnex-extension.zip
git commit -m "Update extension package"
git push
```

2. Users download from:
`https://safnex-nova.onrender.com/get-extension.html`

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML/CSS/JS
- **AI:** OpenAI GPT-4o
- **Extension:** Chrome Manifest V3
- **Deployment:** Render.com
- **Repository:** GitHub

## Repository Structure

```
.
├── server.js                 # Main backend (4167 lines)
├── package.json             # Dependencies
├── render.yaml              # Render config
├── DEPLOY.md                # Deployment guide
├── PRODUCTION-READY.md      # This file
│
├── extension/               # Chrome Extension
│   ├── manifest.json        # Extension config
│   ├── background.js        # Service worker (API calls)
│   ├── content.js           # Popup injection
│   ├── popup.html           # Extension popup UI
│   ├── popup.css            # Styles
│   └── icons/               # Extension icons
│
├── Frontend Pages:
│   ├── home.html            # Landing page
│   ├── get-extension.html   # Extension download
│   ├── link-detector.html   # Link analyzer
│   ├── qr-detector.html     # QR scanner
│   ├── phonenumber-detect.html
│   ├── message-detector.html
│   ├── image-detector.html
│   ├── voice-detector.html
│   └── video-detector.html
│
└── test-extension.html      # Local testing page
```

## Support

Issues: https://github.com/muthukrishnan88/nova/issues

## License

ISC
