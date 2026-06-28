const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Email is handled client-side via Web3Forms (see public/app.js), so this
// server only needs to serve the static landing page.
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`\n  Mosaiq landing page → http://localhost:${PORT}\n`);
});
