/* ============================================================
   Mosaiq — scroll-driven particle field → globe
   ============================================================ */
(function () {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const smooth = (a, b, x) => { x = clamp01((x - a) / (b - a)); return x * x * (3 - 2 * x); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpHex = (a, b, t) => {
    const pa = [1, 3, 5].map((i) => parseInt(a.substr(i, 2), 16));
    const pb = [1, 3, 5].map((i) => parseInt(b.substr(i, 2), 16));
    const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  };

  /* ---------- shared scroll progress ---------- */
  const track = document.getElementById('track');
  let P = 0;
  const updateProgress = () => {
    const max = Math.max(1, track.offsetHeight - window.innerHeight);
    P = clamp01(window.scrollY / max);
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  /* ---------- overlay elements driven by P ---------- */
  const hero = document.getElementById('hero');
  const scrollcue = document.getElementById('scrollcue');
  const furniture = document.getElementById('furniture');
  const panel = document.getElementById('panel');

  const applyOverlay = () => {
    const heroOut = smooth(0.0, 0.34, P);
    hero.style.opacity = (1 - heroOut).toFixed(3);
    hero.style.transform = 'translateY(' + (-heroOut * 42).toFixed(1) + 'px) scale(' + (1 - heroOut * 0.06).toFixed(3) + ')';
    scrollcue.style.opacity = (1 - smooth(0.0, 0.12, P)).toFixed(3);

    const posP = smooth(0.42, 0.96, P);
    furniture.style.opacity = smooth(0.62, 0.96, P).toFixed(3);
    panel.style.opacity = smooth(0.46, 0.8, P).toFixed(3);
    const mobile = window.innerWidth <= 900;
    panel.style.transform = mobile
      ? 'translateY(' + ((1 - posP) * 100).toFixed(2) + '%)'
      : 'translateX(' + ((1 - posP) * 100).toFixed(2) + '%)';
    panel.style.pointerEvents = posP > 0.6 ? 'auto' : 'none';
  };

  /* ============================================================
     Particle field — three depth layers (mosaic <-> globe)
     ============================================================ */
  (function field() {
    const art = document.getElementById('art');
    const cvs = ['gl0', 'gl1', 'gl2'].map((id) => document.getElementById(id));
    const accent = '#4A5E86';

    let dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = window.innerWidth, H = window.innerHeight;
    let tiles = null, mid = null, fine = null;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth; H = window.innerHeight;
      for (const cv of cvs) {
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        cv.style.width = W + 'px'; cv.style.height = H + 'px';
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const img = new Image();
    img.onload = () => {
      const SAMP = 220;
      const sc = document.createElement('canvas'); sc.width = SAMP; sc.height = SAMP;
      const sx = sc.getContext('2d');
      sx.drawImage(img, 180, 160, 840, 840, 0, 0, SAMP, SAMP);
      const data = sx.getImageData(0, 0, SAMP, SAMP).data;
      const sample = (nx, ny) => {
        const u = (nx + 1) / 2, v = (ny + 1) / 2;
        const px = Math.max(0, Math.min(SAMP - 1, Math.round(u * (SAMP - 1))));
        const py = Math.max(0, Math.min(SAMP - 1, Math.round(v * (SAMP - 1))));
        return data[(py * SAMP + px) * 4] / 255;
      };
      let seed = 7 >>> 0;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const anim = () => ({
        ph: rnd() * 6.2832, ph2: rnd() * 6.2832,
        fx: 0.35 + rnd() * 0.95, fy: 0.35 + rnd() * 0.95, fb: 0.18 + rnd() * 0.5,
        f2: 0.6 + rnd() * 1.1, amp: 1.2 + rnd() * 2.6, amp2: 0.7 + rnd() * 1.9,
      });

      tiles = [];
      const N = 32;
      for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
        const nx = ((ix + 0.5) / N) * 2 - 1, ny = ((iy + 0.5) / N) * 2 - 1;
        if (Math.hypot(nx, ny) > 0.99) continue;
        const b = sample(nx, ny), t = Math.max(0, Math.min(1, (b - 0.2) / 0.8));
        if (t < 0.12) continue;
        const cr = rnd();
        const col = cr < 0.34 ? '74,94,134' : cr < 0.6 ? '116,139,184' : cr < 0.8 ? '138,109,68' : '42,39,35';
        tiles.push(Object.assign({ nx, ny, hs: (1 / N) * (0.5 + 0.45 * t), color: 'rgba(' + col + ',' + (0.24 + t * 0.42).toFixed(2) + ')' }, anim()));
      }
      mid = [];
      for (let lat = -86; lat <= 86; lat += 3.2) {
        const lr = lat * Math.PI / 180, y = Math.sin(lr), ring2 = Math.cos(lr);
        const nLon = Math.max(1, Math.round(70 * ring2));
        for (let k = 0; k <= nLon; k++) {
          const lon = -90 + 180 * k / nLon, lonr = lon * Math.PI / 180;
          const nx = ring2 * Math.sin(lonr), ny = -y, edge = Math.hypot(nx, ny);
          if (edge > 1.001) continue;
          let b = sample(nx, ny), t = Math.max(0, Math.min(1, (b - 0.16) / 0.84));
          if (edge > 0.9) t = Math.max(t, (edge - 0.9) / 0.1 * 0.5);
          mid.push(Object.assign({ nx, ny, r: 0.0035 + Math.pow(t, 1.1) * 0.0142 }, anim()));
        }
      }
      fine = [];
      for (let lat = -87; lat <= 87; lat += 2.0) {
        const lr = lat * Math.PI / 180, y = Math.sin(lr), ring2 = Math.cos(lr);
        const nLon = Math.max(1, Math.round(120 * ring2));
        for (let k = 0; k <= nLon; k++) {
          const lon = -90 + 180 * k / nLon, lonr = lon * Math.PI / 180;
          const nx = ring2 * Math.sin(lonr), ny = -y, edge = Math.hypot(nx, ny);
          if (edge > 1.001) continue;
          const b = sample(nx, ny), t = Math.max(0, Math.min(1, (b - 0.16) / 0.84));
          if (t > 0.52 || edge > 0.93) fine.push(Object.assign({ nx, ny, r: 0.0014 + Math.pow(t, 1.2) * 0.006 }, anim()));
        }
      }

      // scatter targets — normalized coords map to full viewport via MOSAIC_RX/Y in draw()
      const MOSAIC_RW = 2.5, MOSAIC_RH = 2.5;
      const mosaicRx = MOSAIC_RW / 2, mosaicRy = MOSAIC_RH / 2;
      const mosaicToScreen = (mx, my) => ({
        x: W * 0.5 + (mx / mosaicRx) * W * 0.5,
        y: H * 0.5 + (my / mosaicRy) * H * 0.5,
      });
      const heroZone = () => {
        const r = hero.getBoundingClientRect();
        const padX = Math.max(48, W * 0.08), padY = Math.max(36, H * 0.055);
        return {
          cx: r.left + r.width * 0.5,
          cy: r.top + r.height * 0.5,
          rx: r.width * 0.5 + padX,
          ry: r.height * 0.5 + padY,
        };
      };
      const inHeroZone = (px, py, zone) => {
        const dx = (px - zone.cx) / zone.rx, dy = (py - zone.cy) / zone.ry;
        return dx * dx + dy * dy < 1;
      };
      const layoutMosaic = (arr, rw, rh) => {
        const K = arr.length; if (!K) return;
        const cols = Math.max(1, Math.round(Math.sqrt(K * rw / rh)));
        const rows = Math.ceil(K / cols), cw = rw / cols, ch = rh / rows;
        const order = arr.map((_, n) => n);
        const zone = heroZone();
        for (let n = K - 1; n > 0; n--) { const j = Math.floor(rnd() * (n + 1)); const tmp = order[n]; order[n] = order[j]; order[j] = tmp; }
        for (let n = 0; n < K; n++) {
          const cell = order[n], cxi = cell % cols, cyi = Math.floor(cell / cols);
          let mx, my, pt, tries = 0;
          do {
            const throwX = rnd() < 0.28 ? (rnd() - 0.5) * cw * 2.2 : 0;
            const throwY = rnd() < 0.28 ? (rnd() - 0.5) * ch * 2.2 : 0;
            mx = -rw / 2 + cw * (cxi + 0.5) + (rnd() - 0.5) * cw * 1.35 + throwX;
            my = -rh / 2 + ch * (cyi + 0.5) + (rnd() - 0.5) * ch * 1.35 + throwY;
            pt = mosaicToScreen(mx, my);
            tries++;
          } while (inHeroZone(pt.x, pt.y, zone) && tries < 16);
          arr[n].mx = mx;
          arr[n].my = my;
        }
      };
      layoutMosaic(tiles, MOSAIC_RW, MOSAIC_RH);
      layoutMosaic(mid, MOSAIC_RW, MOSAIC_RH);
      layoutMosaic(fine, MOSAIC_RW, MOSAIC_RH);
    };
    img.src = 'globe.webp';

    const lay = [
      { p: -0.13, sc: 0.95, bl: 1.0 },
      { p: 0.18, sc: 1.0, bl: 0.0 },
      { p: 0.34, sc: 1.06, bl: 0.0 },
    ];

    const mosaicRx = 1.25, mosaicRy = 1.25;
    const heroZone = () => {
      const r = hero.getBoundingClientRect();
      const padX = Math.max(48, W * 0.08), padY = Math.max(36, H * 0.055);
      return {
        cx: r.left + r.width * 0.5,
        cy: r.top + r.height * 0.5,
        rx: r.width * 0.5 + padX,
        ry: r.height * 0.5 + padY,
      };
    };
    const inHeroZone = (px, py, zone) => {
      const dx = (px - zone.cx) / zone.rx, dy = (py - zone.cy) / zone.ry;
      return dx * dx + dy * dy < 1;
    };

    // pointer parallax (window-wide)
    let mx = 0, my = 0, pcx = 0, pcy = 0;
    window.addEventListener('pointermove', (e) => {
      mx = (e.clientX / W) * 2 - 1;
      my = (e.clientY / H) * 2 - 1;
    });

    const draw = (T, align, posP) => {
      if (!mid) return;
      const w = W, h = H;
      const mobile = w <= 900;
      const panelW = mobile ? 0 : panel.getBoundingClientRect().width;
      const leftCx = mobile ? w * 0.5 : (w - panelW) / 2;
      const cx = lerp(w * 0.5, leftCx, posP);
      const cy = lerp(h * 0.5, mobile ? h * 0.30 : h * 0.47, posP);
      // bigger & looser when scattered, tighter globe once aligned
      const R = (0.30 + 0.16 * (1 - align)) * Math.min(w, h) * (mobile ? 1.0 : 1.05);
      const tt = (T || 0) * 0.001;
      const aE = align * (0.7 + 0.3 * align);
      const scatterEase = 1 - aE;
      const textClear = scatterEase * (1 - smooth(0.0, 0.34, P));
      const zone = textClear > 0.04 ? heroZone() : null;
      const sway = Math.sin(tt * 0.16) * 0.04 * align, cs = Math.cos(sway), sn = Math.sin(sway);
      const dotCol = lerpHex('#243047', accent, align * 0.5);
      const wob = reduceMotion ? 0 : 1;
      const arrs = [tiles, mid, fine];
      for (let i = 0; i < 3; i++) {
        const d = lay[i], g = cvs[i].getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        cvs[i].style.filter = d.bl ? 'blur(' + d.bl + 'px)' : 'none';
        const ox = pcx * d.p * R, oy = pcy * d.p * R;
        const arr = arrs[i], tile = i === 0;
        if (!arr) continue;
        if (!tile) { g.fillStyle = i === 2 ? '#1B2233' : dotCol; g.globalAlpha = i === 2 ? 0.9 : 1; }
        for (const it of arr) {
          const jx = wob * (it.amp * Math.sin(tt * it.fx + it.ph) + it.amp2 * Math.sin(tt * it.fb + it.ph2));
          const jy = wob * (it.amp * Math.sin(tt * it.fy + it.ph + 1.7) + it.amp2 * Math.cos(tt * it.fb * 1.21 + it.ph2));
          const ax = it.mx + (it.nx * d.sc - it.mx) * aE;
          const ay = it.my + (it.ny * d.sc - it.my) * aE;
          const grx = ax * cs - ay * sn, gry = ax * sn + ay * cs;
          const globePx = cx + grx * R + ox;
          const globePy = cy + gry * R + oy;
          const scatterPx = w * 0.5 + (it.mx / mosaicRx) * w * 0.5;
          const scatterPy = h * 0.5 + (it.my / mosaicRy) * h * 0.5;
          const px = scatterPx * scatterEase + globePx * aE + jx;
          const py = scatterPy * scatterEase + globePy * aE + jy;
          if (zone && textClear > 0.04 && inHeroZone(px, py, zone)) continue;
          if (tile) {
            const hs = it.hs * R * (0.9 + 0.1 * Math.sin(tt * it.f2 + it.ph));
            g.fillStyle = it.color;
            g.beginPath();
            if (g.roundRect) g.roundRect(px - hs, py - hs, hs * 2, hs * 2, Math.max(1, hs * 0.32));
            else g.rect(px - hs, py - hs, hs * 2, hs * 2);
            g.fill();
          } else {
            const r = Math.max(0.4, it.r * R * (0.8 + 0.2 * Math.sin(tt * it.f2 + it.ph)));
            g.beginPath(); g.arc(px, py, r, 0, 6.2832); g.fill();
          }
        }
        if (!tile) g.globalAlpha = 1;
      }
    };

    const loop = (T) => {
      pcx += (mx - pcx) * 0.06;
      pcy += (my - pcy) * 0.06;
      const align = smooth(0.06, 0.66, P);
      const posP = smooth(0.42, 0.96, P);
      applyOverlay();
      draw(T || 0, align, posP);
      requestAnimationFrame(loop);
    };
    loop();
  })();

  /* ============================================================
     Contact form -> Web3Forms (client-side, no backend)
     ============================================================ */
  (function contact() {
    const WEB3FORMS_ACCESS_KEY = 'a6d56fa9-16b2-49e1-bb1c-0f3ef4ef594d';
    const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

    const form = document.getElementById('contactForm');
    if (!form) return;
    const btn = document.getElementById('submitBtn');
    const label = btn.querySelector('.btn-label');
    const spinner = btn.querySelector('.spinner');
    const status = document.getElementById('formStatus');

    const setStatus = (msg, type) => {
      status.textContent = msg;
      status.className = 'form-status' + (type ? ' ' + type : '');
    };
    const setLoading = (on) => {
      btn.disabled = on;
      spinner.hidden = !on;
      label.textContent = on ? 'Sending…' : 'Send message';
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        company: form.company.value.trim(),
        message: form.message.value.trim(),
      };

      let bad = false;
      [['name', data.name], ['email', data.email], ['message', data.message]].forEach(([k, v]) => {
        const fr = form[k].closest('.field-row');
        if (!v) { fr.classList.add('invalid'); bad = true; }
        else fr.classList.remove('invalid');
      });
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        form.email.closest('.field-row').classList.add('invalid'); bad = true;
      }
      if (bad) { setStatus('Please complete the highlighted fields.', 'err'); return; }

      setLoading(true);
      setStatus('');
      try {
        const res = await fetch(WEB3FORMS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: WEB3FORMS_ACCESS_KEY,
            subject: 'Mosaiq — message from ' + data.name,
            from_name: 'Mosaiq contact form',
            name: data.name,
            email: data.email,
            company: data.company || '—',
            message: data.message,
            botcheck: '',
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          form.reset();
          setStatus('✓ Thank you — your message is on its way. We\u2019ll be in touch shortly.', 'ok');
        } else {
          setStatus('Could not send your message. Please try again in a moment.', 'err');
        }
      } catch (err) {
        setStatus('Could not send your message. Please check your connection and try again.', 'err');
      } finally {
        setLoading(false);
      }
    });

    form.querySelectorAll('input,textarea').forEach((el) =>
      el.addEventListener('input', () => el.closest('.field-row').classList.remove('invalid'))
    );
  })();
})();
