# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChalChitra is a film screening cell management system for IIT Mandi. It handles movie screenings, seat-based ticket booking (QR codes via email), tiered memberships, food ordering, and volunteer/admin management.

## Commands

### Development
```bash
# Run both frontend and backend concurrently (from root)
npm run dev

# Backend only
cd backend && npm run dev   # nodemon server.js

# Frontend only
cd frontend && npm run dev  # vite --host
```

### Build & Deploy
```bash
npm run build               # builds frontend via Vite
cd frontend && npm run lint  # ESLint
npm run prettier            # format all files
```

### Docker
```bash
docker-compose up           # uses prod.env, maps 13340:8000
```

## Architecture

### Monorepo Structure
- `/backend` — Express + MongoDB API, entry: `server.js`
- `/frontend` — React 18 + Vite, entry: `src/main.jsx`
- `/constants` — Shared data (membership tiers, seat layout) used by both backend (via `@constants` alias) and frontend
- `/migrations` — One-off database scripts (not part of app lifecycle)

### Backend (Express + Mongoose)

Routes are mounted in `backend/routes/index.js` under `/api/*`. Pattern: route → controller → model.

Key route groups:
- `/api/auth`, `/api/user`, `/api/otp` — User auth and management
- `/api/movie`, `/api/seatmap`, `/api/QR` — Core screening operations
- `/api/membership` — Membership purchase/management
- `/api/order`, `/api/food` — Food ordering system
- `/api/vote`, `/api/metrics` — Voting and analytics

**Authentication middleware** (`backend/middleware.js`): `verifyJWTWithRole(minRole)` — reads JWT from httpOnly cookie, enforces role hierarchy: `admin > volunteer > movievolunteer > ticketvolunteer > standard`.

**Key utilities** in `backend/utils/`:
- `mail.js` — Nodemailer (Gmail SMTP); sends QR tickets, OTPs, membership confirmations
- `payment.js` — AtomTech payment gateway integration (AES-256-CBC encryption + HMAC-SHA512 signatures)
- `orderQueue.js` — Bull job queue for async food order processing

### Frontend (React + Vite)

**Path aliases:** `@` → `./src`, `@constants` → `./src/constants` (mirrors backend alias).

**Global state** via React Context:
- `LoginContext.jsx` — auth state, user info decoded from JWT
- `MembershipContext.jsx` — active membership and QR availability

**Routing** (`App.jsx`): Role-based route protection via `ProtectedRoute.jsx`. Routes require minimum roles — e.g., `/scanner` needs `ticketvolunteer`, `/addmovie` needs `movievolunteer`, `/manageusers` needs `admin`.

`Scanner.jsx` is lazy-loaded (heavy ZXing/JSQR dependencies for QR scanning).

### Data Models (MongoDB)

Core collections: `users`, `memberships`, `membershipprices`, `movies` (with embedded `showtimes`), `qrs`, `seatmaps`, `otps` (TTL: 5 min), `votes`, `foods`, `orders`.

**Membership tiers** (from `constants/memberships.json`): base / silver / gold / diamond — each grants a fixed number of QR codes and days of validity. Pricing varies by designation (btech < mtech/phd < faculty/staff < other).

**Seat layout** (`constants/seats.js`): ~700 seats across 20 rows (A–T), each row split into left/center/right sections.

### Environment Variables

Backend `.env` requires: `MongoDB`, `JWT_SECRET`, `JWT_SECRET_QR`, `EMAIL`, `PASSWORD` (Gmail), `FRONTEND_URL`, `PORT` (default 8000), and AtomTech payment keys (`MERCH_ID`, `MERCH_PASS`, `REQ_ENC_KEY`, `REQ_SALT`, `RES_DEC_KEY`, `RES_SALT`, `RES_HASH_KEY`, `PAY_AUTH_URL`).

Frontend `.env` requires: `VITE_environment`, `VITE_PAYEMENT_GATEWAY_URL`.

### Production Deployment

Apache reverse-proxy: `/api/*` → `localhost:8000`; static frontend served from `/var/www/local/chalchitra/build`. Access restricted to IIT Mandi internal IP ranges.
