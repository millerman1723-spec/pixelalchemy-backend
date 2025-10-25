# PixelAlchemy Backend

Small Express backend that wraps Google's Generative API for image generation (Gemini models).

Quick notes
- Start: `npm start` (runs `node server.js`).
- Node: specified in `package.json` as `20.x`.
- Required env vars:
  - `GOOGLE_API_KEY` — your Google Generative AI key. If this is not set the server will start but `/generate` will return HTTP 503 until it's configured. `/health` remains available.
  - `FRONTEND_ORIGIN` (optional) — override allowed CORS origin (defaults to the GitHub Pages URL used by the project).

Health & readiness
- `GET /health` — returns status, timestamp and uptime.

Deploying to Render (short)
1. Push repo to GitHub.
2. Create a Web Service in Render and connect the repo.
3. Build: none (Render will run `npm install`).
4. Start Command: `npm start`.
5. In Render's dashboard add the `GOOGLE_API_KEY` secret (and `FRONTEND_ORIGIN` if needed).
6. Trigger a deploy and confirm `/health` returns 200.

Local testing
1. Install deps: `npm install`.
2. Create a `.env` with `GOOGLE_API_KEY` (or leave empty to test health-only startup).
3. Start: `npm start`.
4. Check health: `curl http://localhost:10000/health` or use your browser.

Security & notes
- Do NOT commit `.env` to source control. `.gitignore` should already include `node_modules/` and `.env`.
- The server responds with a 503 and a clear message if `GOOGLE_API_KEY` is missing; this prevents the process from exiting on startup and makes Render logs easier to debug.

If you'd like, I can add a tiny automated health-check script or create a GitHub Action that deploys to Render on push.
