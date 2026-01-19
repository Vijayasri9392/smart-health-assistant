# Smart Health Assistant

AI‑powered health assistant that provides symptom analysis, lab report OCR, reminders, and history tracking through a web dashboard.

## Overview

The app combines a Node.js/Express backend with a static frontend. It supports:
- Symptom analysis using dataset matching
- Lab report analysis (PDF/TXT/CSV/DOCX and images via OCR)
- User authentication with OTP verification
- Profile and history management
- PWA-ready frontend assets

## Tech Stack

- Backend: Node.js, Express, MongoDB (Mongoose)
- OCR: `tesseract.js`
- Parsing: `papaparse`, `pdf-parse`, `mammoth`
- Frontend: HTML/CSS/JS (Tailwind via CDN)

## Project Structure

- `server/` Express API and routes
- `public/` Frontend pages and scripts
- `datasets/` and `public/datasets/` CSV/JSON data used by predictions and lab analysis
- `training/` ML training scripts and artifacts

## Prerequisites

- Node.js 18+ recommended
- MongoDB connection string

## Setup

1) Install dependencies:
```bash
npm install
```

2) Create a `.env` file in the project root (or use your existing one):
```bash
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=3000
```

3) (Optional) If you use email reminders or Twilio SOS, add:
```bash
MAIL_USER=your_email
MAIL_PASS=your_app_password
TW_SID=your_twilio_sid
TW_TOKEN=your_twilio_token
TW_PHONE=your_twilio_phone
EMERGENCY_CONTACT=target_phone
```

## Run the App

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

The server defaults to `http://localhost:3000`.

## Using the App

1) Open `http://localhost:3000/login` and create an account (OTP is logged to the server console).
2) Log in to access the dashboard.
3) Enter symptoms to get a prediction.
4) Upload a lab report file (`.pdf`, `.txt`, `.csv`, `.docx`, `.png`, `.jpg`, `.jpeg`) for OCR + analysis.
5) View and manage your history from the History page.

## Notes

- Symptom analysis uses CSV datasets in `public/datasets/`.
- Lab report analysis uses `datasets/lab_keywords.json` and `datasets/lab_reference_ranges.json` for matching and range checks.
- Uploaded files are stored temporarily in `uploads/` and cleaned up after processing.

## Troubleshooting

- If MongoDB is not configured, auth/history will fail. Confirm `MONGO_URI` is set.
- If OCR is slow, use smaller images or PDFs with clear text.

## License

ISC
