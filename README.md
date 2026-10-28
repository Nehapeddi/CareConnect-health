# CareConnect 2.0 — Complete Healthcare Web App

CareConnect is a full-stack student project built with **HTML, CSS, JavaScript, Node.js, Express and JSON files**.

## Included features

1. Telemedicine & browser video consultation demo
2. Appointment scheduling
3. Appointment reminders / browser notification permission
4. Prescription management & refill requests
5. Medicine directory with descriptions and safety notes
6. Patient education tools
7. Symptom checker (educational triage only)
8. Clinical decision-support style safety checklists
9. Task and workflow management
10. Demo billing and payments
11. Patient dashboard
12. Hospital finder
13. Healthcare insurance companion
14. Virtual wellness coach
15. Emergency alert system with India emergency numbers
16. Health communities and support groups
17. Doctor messaging
18. Kids Care / Pediatrics with child-age booking
19. 80 demo doctors — 10 in each specialty
20. Local doctor SVG portraits showing white coats and stethoscopes

## Run locally

Open a terminal in this project folder:

```powershell
npm install
npm start
```

Then open:

```text
https://careconne.netlify.app/
```

Do **not** use Live Server for this version. `server.js` serves the frontend and API together.

If port 5000 is already in use:

```powershell
netstat -ano | findstr :5000
taskkill /PID YOUR_PID /F
npm start
```

Or change `PORT` in `.env` and open the new port.

## Login

Create an account from the app. Passwords are hashed with bcryptjs and sessions use JWT.

## JSON data

All demo data is stored in the `data/` folder:

- `doctors.json`
- `users.json`
- `appointments.json`
- `messages.json`
- `medicines.json`
- `prescriptions.json`
- `education.json`
- `tasks.json`
- `payments.json`
- `hospitals.json`
- `insurance.json`
- `communities.json`

The Express API reads/writes these files. This is suitable for a college prototype. A production healthcare application should use a secure database and stronger infrastructure.

## API key / .env

This project does **not require an external API key** to run.

`.env` contains:

```env
PORT=5000
JWT_SECRET=careconnect_demo_secret_2026_change_me
```

Keep `.env` out of GitHub. It is already listed in `.gitignore`.

If you later add a real service such as a maps provider, video provider, payment gateway or SMS service, store that provider's secret in `.env`, for example:

```env
MAPS_API_KEY=your_key_here
VIDEO_PROVIDER_KEY=your_key_here
PAYMENT_PROVIDER_KEY=your_key_here
```

Then read it in Node.js with `process.env.MAPS_API_KEY`.

**Never put private API secrets directly inside `public/app.js` or HTML.**

## Video consultation note

The video feature demonstrates browser camera/microphone access and a CareConnect consultation room UI. It is intentionally a local/demo implementation. A real two-person telemedicine system requires a production WebRTC signaling layer or a trusted video provider, authentication, encryption, consent/privacy controls and healthcare-compliance review.

## Medical safety note

The symptom checker, medicine descriptions, education pages and clinical-support checklists are educational demo features. They are not diagnoses, prescriptions or medical advice. Real patients should consult qualified healthcare professionals and use emergency services for urgent situations.

The doctor names, profiles, hospitals, insurance plans and medical data in this project are fictional demo content.


## CareConnect 3.0 additions

- User-supplied male doctor image for male doctors.
- User-supplied female doctor image for female doctors.
- Lab Reports page with demo records and report status.
- Settings page with appointment, medicine, community and appearance preferences.
- New `/api/labreports` and `/api/settings` endpoints.
- Refined cards, summaries, settings toggles and responsive styling.

All medical data in this student project is demo/educational data. Do not use it as a clinical record system without appropriate security, privacy, regulatory and clinical validation.
