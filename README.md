# Brother Logistics Website

A two-page website for **Brother Logistics**, a professional logistics company based in Mississauga, Ontario.

| Page | File | Description |
|------|------|-------------|
| About | `index.html` | Company overview, services, and contact details |
| Shipping Calculator | `calculator.html` | Instant shipping quotes using Google Maps distance |

## Quick Start

1. **Add your Google Maps API key** (kept out of git):

   ```bash
   cp js/config.example.js js/config.js
   ```

   Edit `js/config.js` and set your key:

   ```js
   window.GOOGLE_MAPS_API_KEY = "your-actual-api-key";
   ```

   `js/config.js` is listed in `.gitignore` so it is never committed.

   **Or** leave `js/config.js` empty and set the `GOOGLE_MAPS_API_KEY` environment variable (local or Vercel). The key in `js/config.js` takes priority when present.

2. **Enable these APIs** in [Google Cloud Console](https://console.cloud.google.com/):
   - Maps JavaScript API
   - Places API (for address autocomplete)
   - Distance Matrix API (for driving distance)

3. **Run locally** (required for Google Maps — `file://` URLs are blocked):

   ```bash
   export GOOGLE_MAPS_API_KEY="your-actual-api-key"   # optional if set in js/config.js
   npm start
   ```

   Then open `http://localhost:3000`.

## Deploy on Vercel

1. Push the repo to GitHub and import it in [Vercel](https://vercel.com).
2. In your Vercel project → **Settings → Environment Variables**, add:
   - Name: `GOOGLE_MAPS_API_KEY`
   - Value: your Google Maps API key
3. Redeploy. Requests to `/js/config.js` are served by a serverless function that reads that env var (`js/config.js` is not deployed — it stays gitignored).
4. In Google Cloud Console, add your Vercel domain to the API key's **HTTP referrer** restrictions (e.g. `https://your-project.vercel.app/*`).

## How the Calculator Works

1. User enters **from** and **to** addresses (with Places autocomplete).
2. **Google Distance Matrix API** returns the driving distance in kilometres.
3. Cost is calculated from:
   - Base handling fee
   - Per-kilometre rate × distance
   - Per-kilogram rate × billable weight (greater of actual weight or dimensional weight)
   - 8% fuel surcharge
   - Minimum charge of $12.99 CAD

Dimensional weight formula: `(height × width × depth) / 5000` (cm → kg).

A route preview map is shown after a successful calculation.

## Project Structure

```
├── index.html          # Company about page
├── calculator.html     # Shipping cost calculator
├── api/config.js       # Vercel: serves js/config.js from env var
├── vercel.json         # Rewrites /js/config.js → /api/config
├── server.js           # Local dev server
├── package.json
├── css/styles.css      # Shared styles
├── js/
│   ├── config.example.js  # API key template (committed)
│   ├── config.js          # Your key (gitignored — create from example)
│   └── calculator.js   # Calculator logic
└── README.md
```

## Customization

Edit rate constants in `js/calculator.js` under `RATES` and `MIN_CHARGE` to match your pricing model.
