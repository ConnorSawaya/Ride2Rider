# Ride2Rider

Ride2Rider is a modern React MVP for trusted family carpool coordination.

It is designed for invite-only groups such as school families, sports teams, clubs, youth groups, churches, neighborhoods, and friend circles. The product focuses on safe ride coordination inside approved communities rather than anonymous ride hailing.

## Tech Stack

- React + TypeScript
- Vite
- React Router
- Leaflet + OpenStreetMap
- Local demo state for rides, approvals, comments, notifications, and settings

## Run Locally

```bash
npm install
npm run dev
```

Windows double-click: `run.bat` (installs deps on first run, then starts dev server at http://localhost:5173).

## Deploy

Local-only demo (no backend, no env vars). Any static host works: `npm run build` then serve `dist/` (Vercel / Netlify / Railway static).

## Build

```bash
npm run build
```

## Product Highlights

- Landing page with clear trust positioning
- Dashboard with today's transportation overview
- Interactive map with ride, pickup, destination, and simulated driver markers
- Create ride flow with local state
- Ride detail view with timeline, trust card, pickup checklist, comments, and confirmation code
- Groups, approvals, notifications, and settings screens
- Unified light and dark mode design system

## Demo Notes

- Driver positions are simulated for demo use.
- Parent approvals, driver approvals, and join requests use local mock state.
- The app is intentionally backend-ready but currently runs without a server.
