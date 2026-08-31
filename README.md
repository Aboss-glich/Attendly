# Attendly

Full-stack school/coaching management demo built with Node.js, Express, HTML, CSS and JavaScript.

## Features
- Role-based authentication (Owner/Admin/Teacher/Staff/Student)
- Attendance management and QR check-in
- Student, teacher, parent and class management
- Reports, notifications and security center
- Responsive premium UI

## Local setup
1. Install Node.js.
2. Copy `.env.example` to `.env` and set local secrets if needed.
3. Run `npm install`.
4. Run `npm start`.
5. Open the URL printed by the server (ports 5000-5002).

## Security
Runtime data and credentials are intentionally excluded from this repository. Never commit `.env`, `auth-users.json`, `storage.json`, backups, API keys, tokens, or real user data.

## Portfolio note
This repository contains the application source code for demonstration/portfolio purposes. A deployed demo should use separate production secrets and a production database.
