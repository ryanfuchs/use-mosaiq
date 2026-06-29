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

  const rotateSphere = (sx, sy, sz, angleY, tiltX) => {
    const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
    const x1 = sx * cosY + sz * sinY;
    const z1 = -sx * sinY + sz * cosY;
    const cosX = Math.cos(tiltX), sinX = Math.sin(tiltX);
    return { sx: x1, sy: sy * cosX - z1 * sinX, sz: sy * sinX + z1 * cosX };
  };
  const sphereToLatLon = (sx, sy, sz) => ({
    lat: (-Math.asin(Math.max(-1, Math.min(1, sy))) * 180) / Math.PI,
    lon: (Math.atan2(sx, sz) * 180) / Math.PI,
  });
  const latLonToSphere = (lat, lon) => {
    const lr = (lat * Math.PI) / 180, lonr = (lon * Math.PI) / 180;
    const ring = Math.cos(lr);
    return { sx: ring * Math.sin(lonr), sy: -Math.sin(lr), sz: ring * Math.cos(lonr) };
  };
  const buildEquirectSampler = (imageData, sampleW, sampleH) => {
    const read = (x, y) => imageData[(y * sampleW + x) * 4] / 255;
    return (lon, lat) => {
      const u = (lon + 180) / 360, v = (90 - lat) / 180;
      if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
      const fx = u * (sampleW - 1), fy = v * (sampleH - 1);
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const x1 = Math.min(sampleW - 1, x0 + 1), y1 = Math.min(sampleH - 1, y0 + 1);
      const tx = fx - x0, ty = fy - y0;
      const top = read(x0, y0) * (1 - tx) + read(x1, y0) * tx;
      const bot = read(x0, y1) * (1 - tx) + read(x1, y1) * tx;
      return top * (1 - ty) + bot * ty;
    };
  };
  const proceduralLand = (nx, ny) => {
    if (Math.hypot(nx, ny) > 0.99) return 0;
    const z = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const lat = (Math.asin(Math.max(-1, Math.min(1, -ny))) * 180) / Math.PI;
    const lon = (Math.atan2(nx, z) * 180) / Math.PI;
    const lonScale = Math.cos((lat * Math.PI) / 180);
    const blobs = [
      [48, -105, 28, 0.95], [8, -78, 18, 0.9], [-12, -55, 22, 0.88], [52, 10, 16, 0.82],
      [36, 55, 30, 0.86], [-22, 135, 24, 0.84], [62, 95, 18, 0.75], [-4, 20, 35, 0.7],
      [28, 78, 14, 0.72], [-35, -65, 12, 0.68],
    ];
    let land = 0.12;
    for (const [bLat, bLon, spread, peak] of blobs) {
      const dLat = lat - bLat, dLon = (lon - bLon) * lonScale;
      land = Math.max(land, peak * Math.exp(-(dLat * dLat + dLon * dLon) / (spread * spread)));
    }
    return land;
  };

  /* ---------- shared scroll progress (smoothed in RAF) ---------- */
  const track = document.getElementById('track');
  let P = 0, targetP = 0;
  const scrollEase = reduceMotion ? 1 : 0.072;
  const updateProgress = () => {
    const max = Math.max(1, track.offsetHeight - window.innerHeight);
    targetP = clamp01(window.scrollY / max);
    if (reduceMotion) P = targetP;
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();
  const smoothProgress = () => {
    if (reduceMotion) return;
    P += (targetP - P) * scrollEase;
  };

  /* ---------- overlay elements driven by P ---------- */
  const hero = document.getElementById('hero');
  const heroCopy = hero.querySelector('.hero-copy');
  const furniture = document.getElementById('furniture');
  const wordmark = document.getElementById('wordmark');
  const wordmarkEnd = document.getElementById('wordmarkEnd');
  const panel = document.getElementById('panel');

  const applyOverlay = () => {
    const mobile = window.innerWidth <= 900;
    const heroOut = smooth(0.0, 0.34, P);
    heroCopy.style.opacity = (1 - heroOut).toFixed(3);
    heroCopy.style.transform = 'translateY(' + (-heroOut * 28).toFixed(1) + 'px)';
    hero.style.setProperty('--hero-glow', (1 - heroOut * 0.85).toFixed(3));

    const brandT = smooth(0.08, 0.72, P);
    const endMark = wordmarkEnd.querySelector('.wordmark');
    const endRect = wordmarkEnd.getBoundingClientRect();
    const endCx = endRect.left + endRect.width * 0.5;
    const endCy = endRect.top + endRect.height * 0.5;
    const startCx = window.innerWidth * 0.5;
    const startCy = window.innerHeight * 0.5 - (mobile ? 52 : 72);
    const cx = lerp(startCx, endCx, brandT);
    const cy = lerp(startCy, endCy, brandT);
    const startFs = parseFloat(getComputedStyle(wordmark).fontSize);
    const endFs = parseFloat(getComputedStyle(endMark).fontSize);
    const scale = lerp(1, endFs / startFs, brandT);
    wordmark.style.transform =
      'translate(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px) translate(-50%,-50%) scale(' + scale.toFixed(4) + ')';

    const posP = smooth(0.42, 0.96, P);
    furniture.style.opacity = smooth(0.62, 0.96, P).toFixed(3);
    panel.style.opacity = smooth(0.46, 0.8, P).toFixed(3);
    panel.style.transform = mobile
      ? 'translateY(' + ((1 - posP) * 100).toFixed(2) + '%)'
      : 'translateX(' + ((1 - posP) * 100).toFixed(2) + '%)';
    panel.style.pointerEvents = posP > 0.6 ? 'auto' : 'none';
  };
  applyOverlay();
  window.addEventListener('resize', applyOverlay);

  /* ============================================================
     Particle field — three depth layers (mosaic <-> globe)
     ============================================================ */
  (function field() {
    const art = document.getElementById('art');
    const cvs = ['gl0', 'gl1', 'gl2'].map((id) => document.getElementById(id));
    const accent = '#4A5E86';
    const GLOBE_TILT = 0.28;
    const SPIN_SPEED = 0.22;

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

    const initParticles = (landSample) => {
      const landAt = (sx, sy, sz) => {
        const { lat, lon } = sphereToLatLon(sx, sy, sz);
        return landSample(lon, lat);
      };
      let seed = 7 >>> 0;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const anim = () => ({
        ph: rnd() * 6.2832, ph2: rnd() * 6.2832,
        fx: 0.35 + rnd() * 0.95, fy: 0.35 + rnd() * 0.95, fb: 0.18 + rnd() * 0.5,
        f2: 0.6 + rnd() * 1.1, amp: 1.2 + rnd() * 2.6, amp2: 0.7 + rnd() * 1.9,
      });

      tiles = [];
      const TILE_TARGET = 58;
      for (let i = 0; i < TILE_TARGET; i++) {
        const lat = (Math.asin(Math.max(-1, Math.min(1, 2 * rnd() - 1))) * 180) / Math.PI;
        const lon = 360 * rnd() - 180;
        const sp = latLonToSphere(lat, lon);
        const land = landAt(sp.sx, sp.sy, sp.sz);
        const landMix = Math.max(0, Math.min(1, (land - 0.08) / 0.72));
        const cr = rnd();
        const col = cr < 0.34 ? '74,94,134' : cr < 0.6 ? '116,139,184' : cr < 0.8 ? '138,109,68' : '42,39,35';
        tiles.push(Object.assign({
          nx: sp.sx, ny: sp.sy, sx: sp.sx, sy: sp.sy, sz: sp.sz,
          hs: 0.0032 + rnd() * 0.0068 + landMix * 0.0025,
          color: 'rgba(' + col + ',' + (0.07 + landMix * 0.14 + rnd() * 0.06).toFixed(2) + ')',
        }, anim()));
      }

      mid = [];
      for (let lat = -86; lat <= 86; lat += 3.2) {
        const lr = lat * Math.PI / 180, y = Math.sin(lr), ring2 = Math.cos(lr);
        const nLon = Math.max(1, Math.round(70 * ring2));
        for (let k = 0; k <= nLon; k++) {
          const lon = -180 + 360 * k / nLon, lonr = lon * Math.PI / 180;
          const sx = ring2 * Math.sin(lonr), sy = -y, sz = ring2 * Math.cos(lonr);
          const b = landAt(sx, sy, sz);
          const t = Math.max(0, Math.min(1, (b - 0.16) / 0.84));
          if (t < 0.04) continue;
          mid.push(Object.assign({ nx: sx, ny: sy, sx, sy, sz, r: 0.0035 + Math.pow(t, 1.1) * 0.0142 }, anim()));
        }
      }

      fine = [];
      for (let lat = -87; lat <= 87; lat += 2.0) {
        const lr = lat * Math.PI / 180, y = Math.sin(lr), ring2 = Math.cos(lr);
        const nLon = Math.max(1, Math.round(120 * ring2));
        for (let k = 0; k <= nLon; k++) {
          const lon = -180 + 360 * k / nLon, lonr = lon * Math.PI / 180;
          const sx = ring2 * Math.sin(lonr), sy = -y, sz = ring2 * Math.cos(lonr);
          const b = landAt(sx, sy, sz);
          const t = Math.max(0, Math.min(1, (b - 0.16) / 0.84));
          if (t > 0.52) fine.push(Object.assign({ nx: sx, ny: sy, sx, sy, sz, r: 0.0014 + Math.pow(t, 1.2) * 0.006 }, anim()));
        }
      }

      const MOSAIC_RW = 1.95, MOSAIC_RH = 1.95;
      const mosaicRx = MOSAIC_RW / 2, mosaicRy = MOSAIC_RH / 2;
      const mosaicToScreen = (mx, my) => ({
        x: W * 0.5 + (mx / mosaicRx) * W * 0.5,
        y: H * 0.5 + (my / mosaicRy) * H * 0.5,
      });
      const heroZone = () => {
        const r = wordmark.getBoundingClientRect();
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

    const loadEquirect = () => {
      const img = new Image();
      img.onload = () => {
        const eqW = 720, eqH = 360;
        const sc = document.createElement('canvas');
        sc.width = eqW; sc.height = eqH;
        const ctx = sc.getContext('2d');
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, eqW, eqH);
        const data = ctx.getImageData(0, 0, eqW, eqH).data;
        initParticles(buildEquirectSampler(data, eqW, eqH));
      };
      img.onerror = () => {
        initParticles((lon, lat) => {
          const lr = (lat * Math.PI) / 180, lonr = (lon * Math.PI) / 180;
          const ring = Math.cos(lr);
          return proceduralLand(ring * Math.sin(lonr), -Math.sin(lr));
        });
      };
      img.src = 'globe-equirect.webp';
    };
    loadEquirect();

    const lay = [
      { p: -0.13, sc: 0.95, bl: 1.0 },
      { p: 0.18, sc: 1.0, bl: 0.0 },
      { p: 0.34, sc: 1.06, bl: 0.0 },
    ];

    const mosaicRx = 1.0, mosaicRy = 1.0;
    const getTextFade = (px, py, includeCopy) => {
      let fade = 1;
      const addZone = (rect, padXMul, padYMul, power) => {
        if (rect.width < 1 || rect.height < 1) return;
        const padX = Math.max(72, W * padXMul), padY = Math.max(56, H * padYMul);
        const cx = rect.left + rect.width * 0.5, cy = rect.top + rect.height * 0.5;
        const rx = rect.width * 0.5 + padX, ry = rect.height * 0.5 + padY;
        const dx = (px - cx) / rx, dy = (py - cy) / ry;
        const d2 = dx * dx + dy * dy;
        if (d2 < 1) fade = Math.min(fade, Math.pow(d2, power));
      };
      addZone(wordmark.getBoundingClientRect(), 0.15, 0.11, 1.05);
      if (includeCopy) addZone(heroCopy.getBoundingClientRect(), 0.17, 0.13, 1.15);
      return fade * fade;
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
      const brandClear = smooth(0.08, 0.72, P);
      const clearMix = Math.max(textClear, brandClear);
      const fadeCopy = textClear > 0.04;
      const spinWeight = reduceMotion ? 0 : smooth(0.5, 0.95, align);
      const spinAngle = tt * SPIN_SPEED * spinWeight;
      const tilt = GLOBE_TILT * spinWeight;
      const sway = Math.sin(tt * 0.16) * 0.04 * align * (1 - spinWeight * 0.85);
      const cs = Math.cos(sway), sn = Math.sin(sway);
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

        const batch = [];
        for (const it of arr) {
          const rot = rotateSphere(it.sx, it.sy, it.sz, spinAngle, tilt);
          const depth = 0.34 + 0.66 * ((rot.sz + 1) / 2);
          if (rot.sz < -0.04 && spinWeight > 0.35 && aE > 0.45) continue;
          batch.push({
            it,
            depth,
            drawNx: it.mx + (rot.sx - it.mx) * aE,
            drawNy: it.my + (rot.sy - it.my) * aE,
          });
        }
        if (spinWeight > 0.2) batch.sort((a, b) => a.depth - b.depth);

        for (const { it, depth, drawNx, drawNy } of batch) {
          const jx = wob * (it.amp * Math.sin(tt * it.fx + it.ph) + it.amp2 * Math.sin(tt * it.fb + it.ph2));
          const jy = wob * (it.amp * Math.sin(tt * it.fy + it.ph + 1.7) + it.amp2 * Math.cos(tt * it.fb * 1.21 + it.ph2));
          const globeGx = drawNx * d.sc, globeGy = drawNy * d.sc;
          const grx = globeGx * cs - globeGy * sn, gry = globeGx * sn + globeGy * cs;
          const globePx = cx + grx * R + ox;
          const globePy = cy + gry * R + oy;
          const scatterPx = w * 0.5 + (it.mx / mosaicRx) * w * 0.5;
          const scatterPy = h * 0.5 + (it.my / mosaicRy) * h * 0.5;
          const px = scatterPx * scatterEase + globePx * aE + jx;
          const py = scatterPy * scatterEase + globePy * aE + jy;
          const depthFade = 0.45 + 0.55 * depth;
          let dotAlpha = depthFade;
          if (clearMix > 0.04) {
            dotAlpha *= getTextFade(px, py, fadeCopy) * clearMix + (1 - clearMix);
            if (dotAlpha < 0.012) continue;
          }
          if (tile) {
            const hs = it.hs * R * (0.9 + 0.1 * Math.sin(tt * it.f2 + it.ph)) * (0.72 + 0.28 * depth);
            g.globalAlpha = dotAlpha * (0.22 + 0.58 * aE);
            g.fillStyle = it.color;
            g.beginPath();
            if (g.roundRect) g.roundRect(px - hs, py - hs, hs * 2, hs * 2, Math.max(1, hs * 0.32));
            else g.rect(px - hs, py - hs, hs * 2, hs * 2);
            g.fill();
            g.globalAlpha = 1;
          } else {
            const r = Math.max(0.4, it.r * R * (0.8 + 0.2 * Math.sin(tt * it.f2 + it.ph)) * (0.78 + 0.22 * depth));
            g.globalAlpha = (i === 2 ? 0.9 : 1) * dotAlpha;
            g.beginPath(); g.arc(px, py, r, 0, 6.2832); g.fill();
          }
        }
        if (!tile) g.globalAlpha = 1;
      }
    };

    const loop = (T) => {
      smoothProgress();
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
