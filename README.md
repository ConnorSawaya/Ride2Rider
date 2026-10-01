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

This is a local-only demo with mock data and no backend or secrets. GitHub Pages deploys it automatically whenever changes reach `main` and can also be run manually from the Actions tab. The public demo is available at <https://connorsawaya.github.io/Ride2Rider/>; deep links are supported by the Pages fallback.

The build uses `/Ride2Rider/` as its asset and router base on GitHub Pages and `/` for local development or root-domain static hosting.

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
