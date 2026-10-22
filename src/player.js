/* Mayfield Advanced Chiro TV: player. Reads content/live.json (published each Monday from the review page),
   falls back to the last good copy, then to content/fallback.js, so the lobby never goes blank. */
(function () {
  "use strict";
  const T = window.MACTV, $ = id => document.getElementById(id);
  const stage = $("stage"), mainEl = $("main"), sideA = $("sideA"), sideB = $("sideB");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CACHE_KEY = "mactv_live_v1";

  /* ---------- fit 1920x1080 to any screen ---------- */
  function fit() { const s = Math.min(innerWidth / 1920, innerHeight / 1080); stage.style.transform = `translate(-50%, -50%) scale(${s})`; }
  addEventListener("resize", fit); fit();

  /* ---------- content loading ---------- */
  let DATA = null;
  async function fetchLive() {
    try {
      const r = await fetch("content/live.json?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) {}
      return d;
    } catch (e) {
      try { const c = localStorage.getItem(CACHE_KEY); if (c) return JSON.parse(c); } catch (e2) {}
      return window.TV_FALLBACK || null;
    }
  }

  /* ---------- month themes ---------- */
  const THEMES = {
    1:  { name: "January",  top: "#2c4f9a", bot: "#b9d3f0", glow: "rgba(255,255,255,.55)", a: "#0436a0", b: "#3d7bd8", fx: "mist" },
    2:  { name: "February · Mardi Gras", top: "#24133f", bot: "#a7813d", glow: "rgba(255,206,120,.42)", a: "#3a1b66", b: "#1d6a49", fx: "beads" },
    3:  { name: "March",    top: "#2f6aa8", bot: "#c7e6c9", glow: "rgba(255,250,200,.55)", a: "#0f5a8a", b: "#3f9b6a", fx: "bokeh" },
    4:  { name: "April",    top: "#4a7cc4", bot: "#f3d6e2", glow: "rgba(255,240,245,.6)",  a: "#0436a0", b: "#c56a95", fx: "petals" },
    5:  { name: "May",      top: "#3d7fd0", bot: "#cfe9c4", glow: "rgba(255,244,190,.6)",  a: "#0d5aa8", b: "#4aa36b", fx: "motes" },
    6:  { name: "June",     top: "#2f86d8", bot: "#bfe3f6", glow: "rgba(255,236,170,.7)",  a: "#0436a0", b: "#1f8ad1", fx: "motes" },
    7:  { name: "July",     top: "#1d4fb3", bot: "#d9e9f8", glow: "rgba(255,236,170,.7)",  a: "#0436a0", b: "#c2333f", fx: "motes" },
    8:  { name: "August",   top: "#2b6fc9", bot: "#f2e2b8", glow: "rgba(255,226,150,.7)",  a: "#0436a0", b: "#e07b1a", fx: "motes" },
    9:  { name: "September",top: "#36609f", bot: "#e9d6a9", glow: "rgba(255,220,150,.6)",  a: "#16408f", b: "#b8762a", fx: "leaves" },
    10: { name: "October",  top: "#3a5fb8", bot: "#f0c27a", glow: "rgba(255,200,120,.6)",  a: "#0436a0", b: "#d9661f", fx: "leaves" },
    11: { name: "November", top: "#3c4f86", bot: "#d9a774", glow: "rgba(255,190,120,.55)", a: "#1c2f6e", b: "#a5501f", fx: "leaves" },
    12: { name: "December", top: "#122a66", bot: "#5f86c4", glow: "rgba(255,240,210,.45)", a: "#0d2a6e", b: "#a4232f", fx: "snow" },
  };
  let themeMonth = new Date().getMonth() + 1, themeLocked = false;
  function applyTheme(m) {
    const t = THEMES[m]; themeMonth = m;
    const r = stage.style;
    r.setProperty("--sky-top", t.top); r.setProperty("--sky-bot", t.bot); r.setProperty("--glow", t.glow);
    r.setProperty("--card-a", t.a); r.setProperty("--card-b", t.b);
    fx.set(t.fx); bg.set(m); music.pick(m === 12 ? "christmas" : "ambient");
  }

  /* ---------- moving backgrounds ---------- */
  const bg = (() => {
    const A = $("bgA"), B = $("bgB"); let list = [], i = 0, front = A, watch;
    function load(el, src) { el.src = src; el.currentTime = 0; return el.play().catch(() => {}); }
    function swap() { if (!list.length) return; const back = front === A ? B : A;
      load(back, list[i++ % list.length]).then(() => { back.classList.add("on"); front.classList.remove("on"); front = back; }); }
    function tick() { if (list.length && front.duration && front.duration - front.currentTime < 2.1 && !front.dataset.leaving) {
      front.dataset.leaving = 1; const f = front; swap(); setTimeout(() => delete f.dataset.leaving, 3000); } }
    return { set(month) {
      const b = (DATA && DATA.backgrounds) || {};
      const next = (b[month] || b.all || []).filter(Boolean);
      if (JSON.stringify(next) === JSON.stringify(list) && watch) return;
      list = next; i = 0; stage.classList.toggle("has-bgv", list.length > 0);
      clearInterval(watch); watch = null; A.classList.remove("on"); B.classList.remove("on"); A.pause(); B.pause();
      if (list.length) { front = B; swap(); watch = setInterval(tick, 250); }
    } };
  })();

  /* ---------- particles (kept off the side third and crawler) ---------- */
  const fx = (() => {
    const cv = $("fx"), ctx = cv.getContext("2d"); let kind = "", parts = [];
    const leafCols = ["#e2731f", "#c9481c", "#f2a33a", "#a8331b", "#e8b44c"], petalCols = ["#f7c6d9", "#f4b3cb", "#fde3ec"];
    function make(init) {
      const p = { x: 650 + Math.random() * 1270, y: init ? Math.random() * 1080 : -40, r: 0, a: Math.random() * 6.28, va: (Math.random() - .5) * .03, ph: Math.random() * 6.28 };
      if (kind === "snow")   Object.assign(p, { r: 2 + Math.random() * 5, vy: .5 + Math.random() * 1.1, vx: (Math.random() - .5) * .4, c: "rgba(255,255,255,.85)" });
      if (kind === "leaves") Object.assign(p, { r: 12 + Math.random() * 12, vy: .7 + Math.random() * 1, vx: .3 + Math.random() * .6, c: leafCols[Math.random() * 5 | 0] });
      if (kind === "petals") Object.assign(p, { r: 7 + Math.random() * 7, vy: .5 + Math.random() * .8, vx: .4 + Math.random() * .5, c: petalCols[Math.random() * 3 | 0] });
      if (kind === "mist")   Object.assign(p, { y: init ? Math.random() * 1080 : 1100, r: 120 + Math.random() * 160, vy: -(.05 + Math.random() * .1), vx: .15 + Math.random() * .25, c: "rgba(255,255,255,.035)" });
      if (kind === "beads")  Object.assign(p, { y: init ? Math.random() * 1080 : 1120, r: 2 + Math.random() * 2.5, vy: -(.1 + Math.random() * .25), vx: (Math.random() - .5) * .2, c: "rgba(255,214,130,.55)" });
      if (kind === "bokeh" || kind === "motes") Object.assign(p, { y: init ? Math.random() * 1080 : 1120, r: kind === "bokeh" ? 20 + Math.random() * 40 : 2 + Math.random() * 3, vy: -(.15 + Math.random() * .35), vx: (Math.random() - .5) * .2, c: kind === "bokeh" ? "rgba(255,255,255,.10)" : "rgba(255,246,210,.7)" });
      return p;
    }
    const BEAD = ["#8d42d6", "#2fb36a", "#f0c24a", "#f0c24a"]; let strands = [], nextToss = 0;
    function toss(now) { const fromLeft = Math.random() < .5, depth = .7 + Math.random() * .3;
      strands.push({ x: fromLeft ? 700 + Math.random() * 300 : 1500 + Math.random() * 300, y: 1120, vx: (fromLeft ? 1 : -1) * (2 + Math.random() * 3), vy: -(17 + Math.random() * 3), g: .26,
        a: Math.random() * 6.28, va: (Math.random() - .5) * .08, ph: Math.random() * 6.28, vph: .05 + Math.random() * .05, s: depth, c: BEAD[Math.random() * 4 | 0], n: 26 + (Math.random() * 8 | 0) });
      nextToss = now + 3200 + Math.random() * 3800; }
    function drawBeads(now) {
      if (now > nextToss && strands.length < 3) toss(now);
      strands = strands.filter(st => st.y < 1250);
      for (const st of strands) {
        st.vy += st.g; st.x += st.vx; st.y += st.vy; st.a += st.va; st.ph += st.vph;
        const rx = 100 * st.s, ry = 100 * st.s * (.25 + .75 * Math.abs(Math.cos(st.ph))), r = 9.5 * st.s;
        ctx.save(); ctx.translate(st.x, st.y); ctx.rotate(st.a); ctx.globalAlpha = .75 + .25 * st.s;
        for (let i = 0; i < st.n; i++) { const t = i / st.n * 6.283, bx = Math.cos(t) * rx, by = Math.sin(t) * ry + Math.pow(Math.sin(t / 2), 6) * 26 * st.s;
          const gr = ctx.createRadialGradient(bx - r * .35, by - r * .35, r * .1, bx, by, r);
          gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(.35, st.c); gr.addColorStop(1, "rgba(20,10,30,.4)");
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(bx, by, r, 0, 6.28); ctx.fill(); }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    function set(k) { if (k === kind) return; kind = k; strands = []; nextToss = performance.now() + 1200;
      const n = reduced ? 10 : ({ snow: 90, leaves: 22, petals: 26, bokeh: 22, motes: 55, mist: 14, beads: 16 }[k] || 20);
      parts = Array.from({ length: n }, () => make(true)); }
    function draw(now) {
      ctx.clearRect(0, 0, 1920, 1080);
      ctx.save(); ctx.beginPath(); ctx.rect(650, 0, 1270, 996); ctx.clip();
      if (kind === "beads" && !reduced) drawBeads(now || performance.now());
      for (const p of parts) {
        p.ph += .01; p.x += p.vx + Math.sin(p.ph) * (kind === "snow" ? .3 : kind === "mist" ? .1 : .6); p.y += p.vy; p.a += p.va;
        if (p.y > 1110 || p.y < -300 || p.x > 2100) Object.assign(p, make(false));
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.beginPath();
        if (kind === "leaves") { ctx.ellipse(0, 0, p.r, p.r * .45, 0, 0, 6.28); ctx.fill(); ctx.strokeStyle = "rgba(90,30,10,.35)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-p.r, 0); ctx.lineTo(p.r, 0); ctx.stroke(); }
        else if (kind === "petals") { ctx.ellipse(0, 0, p.r, p.r * .6, 0, 0, 6.28); ctx.fill(); }
        else if (kind === "mist") { ctx.ellipse(0, 0, p.r * 1.8, p.r * .5, 0, 0, 6.28); ctx.fill(); }
        else { ctx.arc(0, 0, p.r, 0, 6.28); ctx.fill(); }
        ctx.restore();
      }
      ctx.restore(); requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
    return { set };
  })();

  /* ---------- music: seamless Web Audio loop; plain <audio> loop when files can't be fetched ---------- */
  const music = (() => {
    const FILES = { ambient: "media/loop_ambient.mp3", christmas: "media/loop_christmas.mp3" };
    let ctx, gain, src, el, cur = "ambient", wanted = true, buffers = {};
    async function play() {
      try {
        if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination); }
        if (ctx.state === "suspended") await ctx.resume();
        if (!buffers[cur]) { const r = await fetch(FILES[cur]); buffers[cur] = await ctx.decodeAudioData(await r.arrayBuffer()); }
        if (src) { try { src.stop(); } catch (e) {} }
        src = ctx.createBufferSource(); src.buffer = buffers[cur]; src.loop = true; src.connect(gain); src.start();
        if (wanted) fade(.55, 2);
      } catch (e) {
        if (!el) { el = new Audio(); el.loop = true; }
        el.src = FILES[cur]; el.volume = wanted ? .55 : 0; el.play().catch(() => {});
      }
    }
    function fade(v, sec) { if (el) { el.volume = v; return; } if (!ctx) return; const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(v, t + sec); }
    return {
      start: () => play(), pick(n) { if (n === cur) return; cur = n; if (ctx || el) play(); },
      duck(on) { fade(on || !wanted ? 0 : .55, 1.2); }, toggle() { wanted = !wanted; this.duck(false); return wanted; },
      get audible() { return wanted && ((ctx && ctx.state === "running") || (el && !el.paused)); }, wantOn() { wanted = true; },
    };
  })();

  /* ---------- the loop ---------- */
  let loop = [], idx = -1, timer = null, playing = false, pass = 0, pending = false;
  function buildLoop() {
    const now = new Date(), month = themeMonth;
    const items = ((DATA && DATA.main) || []).filter(it => T.isActive(it, now, month));
    loop = T.schedule(items, (DATA && DATA.version || "") + ":" + pass++);
    idx = -1;
  }
  function currentSideItems() {
    const now = new Date();
    const side = ((DATA && DATA.side) || []).filter(it => T.isActive(it, now, themeMonth));
    if (DATA && DATA.settings && DATA.settings.hours) side.push({ layout: "hours", eyebrow: "Office hours", title: "We're here" });
    return side;
  }

  /* side third: rotates on its own clock; a main item with a QR takes it over while it's up */
  let sideFront = sideA, sideIdx = -1, sideTimer = null, sideHeld = false;
  function showSide(renderFn) {
    const back = sideFront === sideA ? sideB : sideA;
    renderFn(back); back.classList.add("on"); sideFront.classList.remove("on"); sideFront = back;
  }
  function nextSide() {
    clearTimeout(sideTimer);
    if (!sideHeld) {
      const list = currentSideItems();
      if (list.length) { sideIdx = (sideIdx + 1) % list.length; const it = list[sideIdx];
        showSide(el => T.renderSide(el, it, { hours: DATA.settings.hours, now: Date.now() })); }
    }
    sideTimer = setTimeout(nextSide, 20000);
  }

  function show(delta) {
    if (pending || !loop.length) { pending = false; buildLoop(); }
    if (!loop.length) return;
    stage.classList.remove("live"); stage.classList.add("out");
    setTimeout(() => {
      idx += delta;
      if (idx >= loop.length) { buildLoop(); idx = 0; }
      if (idx < 0) idx = loop.length - 1;
      const it = loop[idx];
      T.renderMain(mainEl, it, Date.now());
      if (it.qr && it.qr.url) { sideHeld = true; showSide(el => T.renderMainQr(el, it)); }
      else if (sideHeld) { sideHeld = false; nextSide(); }
      stage.classList.remove("out"); void stage.offsetWidth; stage.classList.add("live");
      T.countUp(mainEl);
      clearTimeout(timer);
      if (playing) timer = setTimeout(next, T.duration(it) * 1000);
    }, idx < 0 ? 0 : 600);
  }
  function next() {
    if (!themeLocked) { const m = new Date().getMonth() + 1; if (m !== themeMonth) { applyTheme(m); pending = true; } }
    const vids = (DATA && DATA.videos) || [];
    if (Date.now() >= nextVideoAt && vids.length) return videoBreak();
    show(1);
  }

  /* ---------- YouTube Shorts breaks ---------- */
  let nextVideoAt = Date.now() + 15 * 60000, vIdx = 0, ytReady = null;
  const everyMin = () => (DATA && DATA.settings && DATA.settings.videoEveryMinutes) || 15;
  const ytId = v => { const m = String(v).match(/(?:shorts\/|v=|youtu\.be\/|embed\/)([\w-]{11})/); return m ? m[1] : String(v).trim(); };
  function loadYT() {
    if (ytReady) return ytReady;
    ytReady = new Promise(res => { window.onYouTubeIframeAPIReady = () => res(true);
      const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; s.onerror = () => res(false); document.head.appendChild(s);
      setTimeout(() => res(!!(window.YT && YT.Player)), 6000); });
    return ytReady;
  }
  async function videoBreak(demo) {
    clearTimeout(timer); nextVideoAt = Date.now() + everyMin() * 60000;
    const vids = (DATA && DATA.videos) || [], vb = $("vbreak"), frame = $("vframe");
    const v = vids.length ? vids[vIdx++ % vids.length] : null, id = v ? ytId(v.id || v) : null;
    $("vtitle").textContent = (v && v.title) || "Short videos from Dr. Taylor.";
    music.duck(true); vb.classList.add("on");
    const finish = () => { vb.classList.remove("on"); frame.innerHTML = ""; music.duck(false); setTimeout(() => show(1), 500); };
    const ok = id && !demo ? await loadYT() : false;
    if (!ok) { frame.innerHTML = `<div class="vmock">${id ? "Your Short plays here on the lobby TV." : "Add YouTube Shorts on the review page and they play here every " + everyMin() + " minutes."}</div>`; return setTimeout(finish, 8000); }
    frame.innerHTML = `<div id="yt"></div>`;
    let ended = false; const end = () => { if (!ended) { ended = true; finish(); } }; const guard = setTimeout(end, 95000);
    new YT.Player("yt", { videoId: id, playerVars: { autoplay: 1, controls: 0, rel: 0, playsinline: 1, modestbranding: 1 },
      events: { onStateChange: e => { if (e.data === YT.PlayerState.ENDED) { clearTimeout(guard); end(); } }, onError: () => { clearTimeout(guard); end(); } } });
  }

  /* ---------- crawler ---------- */
  const crawl = (() => {
    const track = $("crawl"); let x = 1920, w = 0, last = performance.now(), sig = "";
    function set() {
      const standing = ((DATA && DATA.standing_crawler) || []).filter(l => l.on !== false).map(l => l.text);
      const weekly = ((DATA && DATA.crawler) || []).filter(it => T.isActive(it, Date.now(), themeMonth)).map(it => it.line || it.text);
      const lines = standing.concat(weekly).filter(Boolean);
      const s = JSON.stringify(lines); if (s === sig) return; sig = s;
      const html = lines.map(l => '<span>' + T.esc(l) + '</span><span class="dot">●</span>').join('');
      track.innerHTML = html + html; w = 0;
    }
    (function step(t) { const dt = Math.min(t - last, 100); last = t; if (!w) w = track.scrollWidth / 2;
      x -= dt * .16; if (w && x <= -w) x += w; track.style.transform = `translateX(${x}px)`; requestAnimationFrame(step); })(last);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { w = 0; });
    return { set };
  })();

  /* ---------- clock + weather ---------- */
  function tick() { $("clock").textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  setInterval(tick, 10000); tick();
  const WMO = c => c === 0 ? "Clear" : c <= 2 ? "Partly cloudy" : c === 3 ? "Cloudy" : c <= 48 ? "Fog" : c <= 57 ? "Drizzle" : c <= 67 ? "Rain" : c <= 77 ? "Snow" : c <= 82 ? "Showers" : c <= 86 ? "Snow showers" : "Storms";
  async function weather() {
    try { const L = (DATA && DATA.settings && DATA.settings.location) || { name: "Alexandria", lat: 31.3113, lon: -92.4451 };
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${L.lat}&longitude=${L.lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`);
      const d = await r.json(); $("weather").textContent = `${L.name} ${Math.round(d.current.temperature_2m)}°F · ${WMO(d.current.weather_code)}`;
      $("weather").hidden = false; $("wsep").hidden = false;
    } catch (e) {}
  }
  setInterval(weather, 30 * 60000);

  /* ---------- keep content fresh: check every 15 min, reload the page once a night for new player code ---------- */
  async function refresh() {
    const d = await fetchLive(); if (!d) return;
    const changed = !DATA || d.version !== DATA.version || d.published !== DATA.published;
    DATA = d; if (changed) { pending = true; crawl.set(); bg.set(themeMonth); }
  }
  setInterval(refresh, 15 * 60000);
  setInterval(() => { const h = new Date(); if (h.getHours() === 4 && h.getMinutes() < 15 && navigator.onLine) location.reload(); }, 15 * 60000);

  /* ---------- start + controls ---------- */
  function begin() { if (playing) return; playing = true; $("start").hidden = true; music.start(); show(1); nextSide();
    try { navigator.wakeLock && navigator.wakeLock.request("screen").catch(() => {}); } catch (e) {} }
  const sel = $("c-theme"); for (const m in THEMES) sel.add(new Option("Theme: " + THEMES[m].name, m));
  const ctr = $("controls"); let hideT;
  function poke() { ctr.classList.add("show"); clearTimeout(hideT); hideT = setTimeout(() => ctr.classList.remove("show"), 3500); }
  ["mousemove", "touchstart", "keydown"].forEach(e => addEventListener(e, poke, { passive: true }));
  $("go").onclick = begin;
  $("c-prev").onclick = () => { begin(); show(-1); };
  $("c-next").onclick = () => { begin(); show(1); };
  $("c-music").onclick = e => { begin(); if (!music.audible) { music.wantOn(); music.start(); e.target.textContent = "Music: on"; } else e.target.textContent = "Music: " + (music.toggle() ? "on" : "off"); };
  sel.onchange = () => { themeLocked = true; applyTheme(+sel.value); pending = true; show(1); };
  $("c-video").onclick = () => { begin(); videoBreak(!((DATA && DATA.videos) || []).length); };
  $("c-full").onclick = () => { const el = document.documentElement; (el.requestFullscreen ? el.requestFullscreen() : Promise.reject()).catch(() => {}); };
  addEventListener("keydown", e => { if (e.key === "ArrowRight") $("c-next").click(); if (e.key === "ArrowLeft") $("c-prev").click();
    if (e.key === "m") $("c-music").click(); if (e.key === "v") $("c-video").click(); if (e.key === "f") $("c-full").click(); });

  (async function boot() {
    DATA = (await fetchLive()) || { main: [], side: [], crawler: [], settings: {} };
    if (DATA.settings && DATA.settings.videoEveryMinutes) nextVideoAt = Date.now() + DATA.settings.videoEveryMinutes * 60000;
    applyTheme(themeMonth); sel.value = themeMonth; crawl.set(); weather();
    buildLoop(); if (loop[0]) { T.renderMain(mainEl, loop[0], Date.now()); stage.classList.add("live"); }
    const q = new URLSearchParams(location.search);
    if (q.has("hold")) { $("start").hidden = true; nextSide(); return; }   /* preview mode: no timers */
    const auto = q.has("autostart");
    if (auto) return begin();
    let left = 15; const cd = setInterval(() => { left--; $("count").textContent = left; if (left <= 0 || playing) { clearInterval(cd); begin(); } }, 1000);
  })();
})();
