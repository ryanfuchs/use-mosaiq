# Mosaiq — Landing Page

KI-gestützte Investmentkommunikation. A fully animated, mobile-responsive
landing page styled to match the Mosaiq login experience (dark theme,
interactive halftone *mosaic → globe*, brand mark, Instrument Serif / JetBrains
Mono type system).

Content is sourced from `Mosaiq_OnePager final.pdf`. Contact submissions are
emailed to **ryan.fuchs@wellershoff.ch**.

## Quick start

```bash
npm install
npm start
# → http://localhost:3000
```

The page works immediately. The contact form **sends real email** through
[Web3Forms](https://web3forms.com) (a free, no-backend email service) once an
access key is configured (below); until then it gracefully opens the visitor's
mail client pre-addressed to ryan.fuchs@wellershoff.ch.

## Enable email sending (Web3Forms)

1. Go to [web3forms.com](https://web3forms.com) and enter
   `ryan.fuchs@wellershoff.ch`. You'll receive a free **access key** by email.
2. Open `public/app.js` and replace the placeholder:

   ```js
   const WEB3FORMS_ACCESS_KEY = 'YOUR-WEB3FORMS-ACCESS-KEY';
   ```

   with the key you received. That's it — submissions are delivered straight to
   your inbox. No SMTP credentials, no server-side secrets.

Web3Forms' free tier covers 250 submissions/month, includes spam protection
(the form ships with a hidden honeypot field), and the access key is public-safe
by design, so it's fine to commit it in the client code.

## Project structure

```
use-mosaiq/
├─ server.js            Express server (static hosting only)
├─ package.json
└─ public/
   ├─ index.html        Landing page markup
   ├─ styles.css        Dark theme, brand system, responsive
   ├─ app.js            Globe animation, scroll reveals, contact logic (Web3Forms)
   └─ globe.webp        Halftone source for the hero animation
```

## Notes

- Pure HTML/CSS/JS frontend — no build step.
- Because email goes through Web3Forms, **no backend is required**. You can host
  `public/` on any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages)
  as well as the included Node server.
- Respects `prefers-reduced-motion`.
