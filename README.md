# SAFNEX NOVA - AI Security Analyzer

Unified security analysis platform for detecting threats in links, QR codes, messages, images, audio, and video.

## Features

- 🔗 **Link Analyzer** - AI-powered phishing and malware detection
- 📱 **QR Code Scanner** - Scan and generate QR codes with threat analysis
- 📞 **Phone Validator** - Verify phone numbers with carrier lookup
- 💬 **Message Scam Detector** - Analyze WhatsApp, Instagram, Telegram, SMS screenshots
- 🖼️ **Image AI Detection** - Detect AI-generated images
- 🎤 **Voice Deepfake Detection** - Identify synthetic voice recordings
- 🎥 **Video AI Detection** - Analyze videos for AI manipulation

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **AI**: OpenAI GPT-4
- **Image Processing**: Tesseract.js (OCR)
- **Phone Validation**: libphonenumber-js, Twilio

## Installation

```bash
npm install
```

## Environment Variables

Create `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
PORT=3000
```

## Run Locally

```bash
npm start
```

Server runs on http://localhost:3000

## Deployment

Deploy to Render.com with one click using `render.yaml` configuration.

## License

ISC
