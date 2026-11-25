# NoteShare — Note Sharing Platform

This project has been upgraded from the supplied starter application to an implementation aligned with **SRS-NSP-001**.

## What is implemented

### Authentication & profiles
- Student registration with unique email and password policy
- JWT authentication with 30-minute access-token lifetime
- bcrypt password hashing
- login attempt throttling / temporary lockout after 5 failures
- Student/Admin role separation
- profile update and password change
- protected server-side authorization

### Notes
- PDF, DOCX and PPTX uploads
- configurable 20 MB maximum
- extension + declared type + actual file-content validation
- empty-file rejection
- SHA-256 duplicate detection
- secure generated storage names
- storage outside the public web directory
- metadata: title, subject, course, semester, topic, category, description
- Public / Link-only / Private visibility
- ownership checks for edit/delete
- download counting and per-download logging

### Search & sharing
- keyword search across title, subject, topic and description
- subject / semester / course / category filters
- sorting and pagination
- visibility-aware search results
- share-link generation and revocation
- random, hashed share tokens
- direct sharing with registered users
- private-note access checks

### Reviews & moderation
- one rating per user per note, editable
- optional review up to 1000 characters
- average rating calculation
- note/review reporting
- admin user suspension/reactivation
- note moderation
- review moderation
- report resolution
- platform statistics
- audit log

## Architecture

`React + Vite` → `Express API` → `Prisma` → `PostgreSQL`

Uploaded files are kept in a private storage directory and are served only through an authenticated, permission-checked download endpoint.

## Run locally

### Backend

```bash
cd backend
cp .env.example .env
# configure DATABASE_URL and JWT_SECRET
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:3020`

### Default development admin

`admin@example.com` / `ChangeMe123!`

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` before seeding a real environment.

## SRS alignment

The supplied SRS defines 47 functional requirements across registration/profile, upload, search, view/download, sharing, review/rating, note management and administration. The application architecture and data model implement those requirement groups rather than keeping the original starter project's PDF-only, public-upload, client-side-filtered design.

The SRS also specifies NFR targets including 3-second search performance for 95% of requests under the agreed load, 20 MB uploads, server-side authorization, secure file handling, daily backups, 99% target availability, WCAG 2.1 AA-oriented workflows, and support for growth to approximately 10,000 users and 100,000 notes. These operational targets still require deployment/load testing and infrastructure configuration before they can be claimed as achieved.
