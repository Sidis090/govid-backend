# Govid Backend

Extraction API for the Govid app. Detects the platform from a pasted URL
(TikTok, Facebook, Instagram, or Pinterest) and returns a direct,
downloadable media URL plus metadata.

## Endpoints

- `GET /health` — health check
- `POST /api/extract` — body: `{ "url": "<link>" }`

### Example response

```json
{
  "success": true,
  "data": {
    "platform": "tiktok",
    "title": "...",
    "downloadUrl": "https://...",
    "requiredHeaders": { "User-Agent": "...", "Referer": "..." }
  }
}
```

**Important:** the app must forward `requiredHeaders` when actually
downloading the file (most CDNs reject requests without a matching
User-Agent/Referer).

## Running locally

```bash
npm install
cp .env.example .env
npm run dev
```

## Deploying (free options)

Either of these work well for a small Node/Express app:

- **Render** (render.com) — connect your GitHub repo, set build command
  `npm install`, start command `npm start`. Free tier sleeps after
  inactivity (first request after sleep is slow).
- **Railway** (railway.app) — similar flow, usage-based free tier.

After deploying, set `ALLOWED_ORIGINS` in your environment variables if you
want to restrict CORS (optional — a mobile app doesn't enforce CORS itself,
this matters more if you also build a web version later).

## Known limitations (read before shipping)

- **Facebook & Instagram**: only **public** posts/reels work. Private
  accounts or login-gated content will return an error. Getting around this
  requires authenticated session cookies, which is fragile, against the
  platforms' terms, and risks the server's IP getting banned.
- **Instagram** rate-limits unauthenticated requests aggressively. At higher
  traffic you may need IP rotation or a paid extraction provider.
- **TikTok & Pinterest extractors depend on each platform's current HTML/JSON
  structure.** These change periodically without notice. If extraction
  starts failing, the first step is to open a fresh video/pin URL in a
  browser, view source, and check whether the embedded JSON script tag
  (`__UNIVERSAL_DATA_FOR_REHYDRATION__` for TikTok, `__PWS_DATA__` for
  Pinterest) still exists under the same name.
- **No YouTube extractor is included.** Downloading YouTube videos without
  authorization violates YouTube's Terms of Service, and Google actively
  pursues legal action against services that do this.
