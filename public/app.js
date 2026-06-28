/* ============================================================
   Mosaiq — connect page
   ============================================================ */
(function () {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================
     Interactive halftone mosaic -> globe (light theme,
     matched to the Mosaiq login art).
     ============================================================ */
  (function heroGlobe() {
    const art = document.getElementById('art');
    if (!art) return;
    const cvs = ['gl0', 'gl1', 'gl2'].map((id) => document.getElementById(id));
    const lockl = document.getElementById('glock');
    const ring = document.getElementById('gring');
    const hint = document.getElementById('ghint');
    const accent = '#4A5E86';

    const smooth = (a, b, x) => { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
    const lerpHex = (a, b, t) => {
      const pa = [1, 3, 5].map((i) => parseInt(a.substr(i, 2), 16));
      const pb = [1, 3, 5].map((i) => parseInt(b.substr(i, 2), 16));
      const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
      return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    };

    let dpr = Math.min(2, window.devicePixelRatio || 1);
    let size = { w: art.clientWidth || 700, h: art.clientHeight || 900 };
    let rect = art.getBoundingClientRect();
    let tiles = null, mid = null, fine = null;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      size = { w: art.clientWidth, h: art.clientHeight };
      rect = art.getBoundingClientRect();
      for (const cv of cvs) {
        cv.width = Math.round(size.w * dpr); cv.height = Math.round(size.h * dpr);
        cv.style.width = size.w + 'px'; cv.style.height = size.h + 'px';
      }
    };
    resize();

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

      // BACK — coarse brand mosaic tiles
      tiles = [];
      const N = 30;
      for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
        const nx = ((ix + 0.5) / N) * 2 - 1, ny = ((iy + 0.5) / N) * 2 - 1;
        if (Math.hypot(nx, ny) > 0.99) continue;
        const b = sample(nx, ny), t = Math.max(0, Math.min(1, (b - 0.2) / 0.8));
        if (t < 0.12) continue;
        const cr = rnd();
        const col = cr < 0.34 ? '74,94,134' : cr < 0.6 ? '116,139,184' : cr < 0.8 ? '138,109,68' : '42,39,35';
        tiles.push(Object.assign({ nx, ny, hs: (1 / N) * (0.5 + 0.45 * t), color: 'rgba(' + col + ',' + (0.24 + t * 0.42).toFixed(2) + ')' }, anim()));
      }
      // MID — readable halftone dot-globe
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
      // FRONT — fine sparkle
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

      const layoutMosaic = (arr, rw, rh) => {
        const K = arr.length; if (!K) return;
        const cols = Math.max(1, Math.round(Math.sqrt(K * rw / rh)));
        const rows = Math.ceil(K / cols), cw = rw / cols, ch = rh / rows;
        const order = arr.map((_, n) => n);
        for (let n = K - 1; n > 0; n--) { const j = Math.floor(rnd() * (n + 1)); const tmp = order[n]; order[n] = order[j]; order[j] = tmp; }
        for (let n = 0; n < K; n++) {
          const cell = order[n], cxi = cell % cols, cyi = Math.floor(cell / cols);
          const throwX = rnd() < 0.18 ? (rnd() - 0.5) * cw * 1.7 : 0;
          const throwY = rnd() < 0.18 ? (rnd() - 0.5) * ch * 1.7 : 0;
          arr[n].mx = -rw / 2 + cw * (cxi + 0.5) + (rnd() - 0.5) * cw * 1.15 + throwX;
          arr[n].my = -rh / 2 + ch * (cyi + 0.5) + (rnd() - 0.5) * ch * 1.15 + throwY;
        }
      };
      layoutMosaic(tiles, 2.5, 3.0); layoutMosaic(mid, 2.5, 3.0); layoutMosaic(fine, 2.5, 3.0);
    };
    img.src = 'globe.webp';

    const lay = [
      { p: -0.13, sc: 0.95, bl: 1.0 },
      { p: 0.18, sc: 1.0, bl: 0.0 },
      { p: 0.34, sc: 1.06, bl: 0.0 },
    ];

    let ccx = 0.82, ccy = -0.66, tx = 0.82, ty = -0.66;
    const restX = 0.82, restY = -0.66;

    const drawAll = (T, align) => {
      if (!mid) return;
      const w = size.w, h = size.h;
      const R = 0.34 * Math.min(w, h), cx = w * 0.5, cy = h * 0.46;
      const tt = (T || 0) * 0.001;
      const aE = align * (0.7 + 0.3 * align);
      const sway = Math.sin(tt * 0.16) * 0.04 * align, cs = Math.cos(sway), sn = Math.sin(sway);
      const dotCol = lerpHex('#243047', accent, align * 0.5);
      const arrs = [tiles, mid, fine];
      for (let i = 0; i < 3; i++) {
        const d = lay[i], g = cvs[i].getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        cvs[i].style.filter = d.bl ? 'blur(' + d.bl + 'px)' : 'none';
        const ox = ccx * d.p * R, oy = ccy * d.p * R;
        const arr = arrs[i], tile = i === 0;
        if (!arr) continue;
        if (!tile) { g.fillStyle = i === 2 ? '#1B2233' : dotCol; g.globalAlpha = i === 2 ? 0.9 : 1; }
        for (const it of arr) {
          const jx = it.amp * Math.sin(tt * it.fx + it.ph) + it.amp2 * Math.sin(tt * it.fb + it.ph2);
          const jy = it.amp * Math.sin(tt * it.fy + it.ph + 1.7) + it.amp2 * Math.cos(tt * it.fb * 1.21 + it.ph2);
          const ax = it.mx + (it.nx * d.sc - it.mx) * aE;
          const ay = it.my + (it.ny * d.sc - it.my) * aE;
          const rx = ax * cs - ay * sn, ry = ax * sn + ay * cs;
          const px = cx + rx * R + ox + jx, py = cy + ry * R + oy + jy;
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

    const ro = new ResizeObserver(resize);
    ro.observe(art);
    window.addEventListener('scroll', () => { rect = art.getBoundingClientRect(); }, true);

    const onMove = (e) => {
      tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ty = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    };
    art.addEventListener('pointermove', onMove);
    art.addEventListener('pointerleave', () => { tx = restX; ty = restY; });

    const loop = (T) => {
      ccx += (tx - ccx) * 0.08;
      ccy += (ty - ccy) * 0.08;
      const dist = Math.hypot(ccx, ccy);
      const align = reduceMotion ? 1 : (1 - smooth(0.04, 1.0, dist));
      drawAll(T || 0, align);
      if (lockl) lockl.style.opacity = align.toFixed(3);
      if (hint) hint.style.opacity = (1 - align).toFixed(3);
      if (ring) {
        ring.style.boxShadow = '0 0 ' + (align * 22).toFixed(1) + 'px ' + accent + Math.round(align * 90).toString(16).padStart(2, '0');
        ring.style.borderColor = 'rgba(214,221,234,' + (0.22 + align * 0.5).toFixed(2) + ')';
      }
      requestAnimationFrame(loop);
    };
    loop();
  })();

  /* ============================================================
     Contact form -> Web3Forms (free, no backend), mailto fallback
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
    const TO = 'ryan.fuchs@wellershoff.ch';

    const setStatus = (msg, type) => {
      status.textContent = msg;
      status.className = 'form-status' + (type ? ' ' + type : '');
    };
    const setLoading = (on) => {
      btn.disabled = on;
      spinner.hidden = !on;
      label.textContent = on ? 'Sending…' : 'Send message';
    };
    const mailtoFallback = (d) => {
      const subject = encodeURIComponent('Mosaiq — message from ' + d.name);
      const body = encodeURIComponent(
        'Name: ' + d.name + '\nEmail: ' + d.email + '\nCompany: ' + (d.company || '—') + '\n\n' + d.message
      );
      window.location.href = 'mailto:' + TO + '?subject=' + subject + '&body=' + body;
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
        const field = form[k].closest('.field');
        if (!v) { field.classList.add('invalid'); bad = true; }
        else field.classList.remove('invalid');
      });
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        form.email.closest('.field').classList.add('invalid'); bad = true;
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
            subject: 'Mosaiq — new enquiry from ' + data.name,
            from_name: 'Mosaiq Landing Page',
            name: data.name,
            email: data.email,
            company: data.company || '—',
            message: data.message,
            replyto: data.email,
            botcheck: form.botcheck ? form.botcheck.value : '',
          }),
        });
        const result = await res.json().catch(() => ({}));
        if (res.ok && result.success) {
          form.reset();
          setStatus('✓ Thank you — your message is on its way. We\u2019ll be in touch shortly.', 'ok');
        } else {
          setStatus('Opening your email app …', 'ok');
          mailtoFallback(data);
        }
      } catch (err) {
        setStatus('Opening your email app …', 'ok');
        mailtoFallback(data);
      } finally {
        setLoading(false);
      }
    });

    form.querySelectorAll('input,textarea').forEach((el) =>
      el.addEventListener('input', () => el.closest('.field').classList.remove('invalid'))
    );
  })();
})();
