# Mosaiq — Landing Page

KI-gestützte Investmentkommunikation. A fully animated, mobile-responsive
landing page styled to match the Mosaiq login experience (dark theme,
interactive halftone *mosaic → globe*, brand mark, Instrument Serif / JetBrains
Mono type system).

Content is sourced from `Mosaiq_OnePager final.pdf`. Contact submissions are
emailed to **ryan.fuchs@wellershoff.ch** via [Web3Forms](https://web3forms.com).

## Deploy

This is a **static site** — no backend, no build step. Host the `public/` folder
on any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, etc.).

The contact form posts directly from the browser to Web3Forms using the access
key in `public/app.js`. No server-side code or secrets are required.

## Local preview (optional)

```bash
npm run preview
# → http://localhost:3000
```

## Project structure

```
use-mosaiq/
├─ package.json         Optional local preview script only
└─ public/
   ├─ index.html        Landing page markup
   ├─ styles.css        Dark theme, brand system, responsive
   ├─ app.js            Globe animation + Web3Forms contact form
   └─ globe.webp        Halftone source for the hero animation
```

## Notes

- Pure HTML/CSS/JS — no build step, no Node server in production.
- Web3Forms free tier: 250 submissions/month, honeypot spam protection included.
- Respects `prefers-reduced-motion`.
