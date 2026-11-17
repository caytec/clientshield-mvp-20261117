# ClientShield MVP

ClientShield is a rules-first freelance scam checker for client messages and job posts.

## Deployment

### GitHub Pages

The static frontend works without an API. With the default configuration, submissions use the browser rules-only report and do not make a failed request to `/api/generate`.

To connect a separately deployed Vercel API, set the browser override before loading `js/app.js` through a deployment-specific external configuration file:

```javascript
window.API_URL = "https://your-vercel-project.example/api/generate";
```

Do not place `GEMINI_API_KEY` or `GROQ_API_KEY` in browser code.

### Vercel

The repository contains:

- `api/generate.js`
- `vercel.json`
- `.env.example`

Set only the server-side environment variables required by the deployment:

```text
AI_PROVIDER=gemini
GEMINI_API_KEY=your-server-side-key
ALLOWED_ORIGINS=https://caytec.github.io
```

For Groq:

```text
AI_PROVIDER=groq
GROQ_API_KEY=your-server-side-key
ALLOWED_ORIGINS=https://caytec.github.io
```

Leave `AI_PROVIDER` blank for rules-only mode.

Only these environment variables are supported:

- `AI_PROVIDER`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `ALLOWED_ORIGINS`

Provider keys are never intended for frontend use.

## Local checks

```bash
npm run check
npm test
npm run validate:json
npm run validate:xml
```

Run the Vercel development server with:

```bash
npm run dev
```

## API contract

Send a JSON `POST` request to `/api/generate`:

```json
{
  "message": "Please pay a $300 activation fee and move to Telegram.",
  "platform": "Other",
  "website": "",
  "flags": []
}
```

The endpoint:

- Requires `Content-Type: application/json`
- Rejects malformed or oversized bodies
- Accepts only known platform and checkbox values
- Applies a bounded in-memory MVP rate limit
- Uses deterministic fallback scoring
- Optionally calls Gemini or Groq
- Validates provider output
- Never allows provider output to remove deterministic flags
- Returns `Cache-Control: no-store`
- Restricts cross-origin requests when `ALLOWED_ORIGINS` is configured

## SEO

The production static URL in this repository is:

```text
https://caytec.github.io/clientshield-mvp-20261117/
```

Canonical URLs, Open Graph URLs, social images, sitemap locations, and the robots sitemap directive use absolute URLs under that path.

`assets/og.png` must be a real 1200×630 PNG generated before deployment. The repository intentionally does not include a text placeholder in place of that binary asset.

## Privacy

Do not submit passwords, identity documents, bank details, private keys, or confidential files. The optional website field is sent as text only and is never fetched by the application. If an AI provider is enabled, the submitted analysis context may be transmitted to that provider under its terms.

ClientShield is an educational screening estimate, not proof of fraud or professional advice.
