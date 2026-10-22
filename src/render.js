/* Mayfield Advanced Chiro TV: shared renderer (player + review page).
   One item -> HTML for the main screen, side third, or crawler. No state lives here. */
(function (g) {
  "use strict";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const nn = s => s != null && String(s).trim() !== "";

  function qrSvg(url) {
    if (!url || typeof g.qrcode !== "function") return "";
    try { const q = g.qrcode(0, "M"); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 8, margin: 0, scalable: true }); }
    catch (e) { return ""; }
  }

  const REGIONS = { neck: [200, 150], shoulder: [126, 205], elbow: [86, 350], midback: [200, 290], lowback: [200, 430],
    hip: [152, 486], knee: [164, 660], heel: [170, 868], foot: [170, 868], wrist: [70, 470], jaw: [200, 108], head: [200, 70] };
  function bodySvg(region) {
    const p = REGIONS[region] || REGIONS.lowback;
    const limb = 'stroke="rgba(255,255,255,.55)" stroke-width="46" stroke-linecap="round" fill="none"';
    return `<svg viewBox="0 0 400 920" aria-hidden="true">
      <g opacity=".95">
        <circle cx="200" cy="72" r="50" fill="rgba(255,255,255,.55)"/>
        <rect x="178" y="118" width="44" height="40" rx="16" fill="rgba(255,255,255,.55)"/>
        <path d="M120 170 Q200 150 280 170 L268 470 Q200 500 132 470 Z" fill="rgba(255,255,255,.55)"/>
        <path d="M128 190 L92 340 L72 480" ${limb}/><path d="M272 190 L308 340 L328 480" ${limb}/>
        <path d="M160 470 L164 660 L170 860" ${limb}/><path d="M240 470 L236 660 L230 860" ${limb}/>
        <path d="M200 175 L200 460" stroke="rgba(6,23,63,.35)" stroke-width="6" stroke-dasharray="4 10" stroke-linecap="round"/>
      </g>
      <circle class="bm-ring" cx="${p[0]}" cy="${p[1]}" r="20"/><circle class="bm-dot" cx="${p[0]}" cy="${p[1]}" r="16"/>
    </svg>`;
  }

  function src(item, cls) { return item.source && nn(item.source.title) ? `<div class="${cls || "src"} a d6">Source: ${esc(item.source.title)}</div>` : ""; }
  function hdr(item, extra) {
    return (nn(item.eyebrow) ? `<div class="eyebrow a d1">${esc(item.eyebrow)}</div>` : "") +
      (nn(item.headline) ? `<h2 class="hl a d1">${esc(item.headline)}</h2>` : "") +
      (nn(item.body) && extra !== false ? `<p class="bd a d2">${esc(item.body)}</p>` : "");
  }
  function daysUntil(iso, now) {
    const d = new Date(iso + "T00:00:00"), t = new Date(now || Date.now()); t.setHours(0, 0, 0, 0);
    return Math.round((d - t) / 864e5);
  }

  const LAYOUTS = {
    split: it => `<div class="col a d1">${hdr(it)}</div>
      <div class="frame a d2"><div class="frame-in"><p class="card">${esc(it.card || it.line)}</p>${it.source && nn(it.source.title) ? `<div class="frame-src">Source: ${esc(it.source.title)}</div>` : ""}</div></div>`,
    scene: it => `${nn(it.eyebrow) ? `<div class="eyebrow a d1">${esc(it.eyebrow)}</div>` : ""}<p class="line a d2">${esc(it.line || it.card || it.headline)}</p>`,
    bignum: it => `<div class="panel glass a d1"><div class="hdr">${hdr(it)}</div>
      <div class="num a d2"><span data-count="${Number(it.num) || 0}" data-dec="${it.dec || 0}">${Number(it.num || 0).toFixed(it.dec || 0)}</span><small>${/^[%×x]$/.test(it.unit || "") ? "" : " "}${esc(it.unit)}</small></div>
      <div class="cap a d3">${esc(it.caption)}</div>${src(it)}</div>`,
    mythfact: it => `${hdr(it, false)}
      <div class="band myth a d2"><span class="tag">MYTH</span><p>${esc(it.myth)}</p><span class="strike"></span></div>
      <div class="band fact a"><span class="tag">WHAT'S TRUE</span><p>${esc(it.fact)}</p></div>${src(it)}`,
    steps: it => `${hdr(it)}<div class="row">${(it.steps || []).slice(0, 4).map((s, i) =>
      `<div class="step glass a d${i + 3}"><span class="n">${i + 1}</span><p>${esc(s)}</p></div>`).join("")}</div>${src(it)}`,
    askdoc: it => `<div class="who a d1"><i></i>Ask Dr. Taylor</div>${nn(it.headline) ? `<h2 class="hl a d1">${esc(it.headline)}</h2>` : ""}
      <div class="q a d2">${esc(it.question)}</div><div class="ans glass a">${esc(it.answer)}</div>${src(it)}`,
    checklist: it => `<div class="panel glass a d1">${hdr(it)}<ul>${(it.items || []).slice(0, 5).map((s, i) =>
      `<li class="a d${i + 3}"><i></i><span>${esc(s)}</span></li>`).join("")}</ul>${src(it)}</div>`,
    bodymap: it => `<div class="fig glass a d1">${bodySvg(it.region)}</div>
      <div class="info"> ${hdr(it)}<ul>${(it.points || []).slice(0, 4).map((s, i) => `<li class="a d${i + 3}">${esc(s)}</li>`).join("")}</ul>${src(it)}</div>`,
    countdown: (it, now) => {
      const d = daysUntil(it.date, now);
      const big = d <= 0 ? "Today" : String(d), unit = d === 1 ? "day to go" : d <= 0 ? "" : "days to go";
      return `<div class="panel glass a d1">${nn(it.eyebrow) ? `<div class="eyebrow">${esc(it.eyebrow)}</div>` : ""}
        <div class="days a d2">${esc(big)}</div>${unit ? `<div class="unit a d2">${unit}</div>` : ""}
        <div class="ev a d3">${esc(it.event || it.headline)}</div>${nn(it.body) ? `<p class="bd a d4">${esc(it.body)}</p>` : ""}</div>`;
    },
  };

  function renderMain(el, item, now) {
    const lay = LAYOUTS[item.layout] ? item.layout : "split";
    const long = ((item.body || "") + (item.caption || "")).length > 190;
    el.className = "main L-" + lay + (lay === "bignum" && long ? " dense" : "");
    el.innerHTML = LAYOUTS[lay](item, now);
  }

  function hoursHtml(hours, now) {
    const today = new Date(now || Date.now()).getDay();
    const order = [1, 2, 3, 4, 5, 6, 0], names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `<div class="hours">${order.map(d => `<span class="d${d === today ? " today" : ""}">${names[d]}</span><span class="${d === today ? "today" : ""}">${esc(hours[d] || "Closed")}</span>`).join("")}</div>`;
  }

  function renderSide(el, item, ctx) {
    ctx = ctx || {};
    let h = "";
    const t = item.layout;
    if (t === "qr" || (item.qr && item.qr.url && t !== "stat")) {
      h = `${nn(item.eyebrow) ? `<div class="eyebrow">${esc(item.eyebrow)}</div>` : `<div class="eyebrow">Scan with your phone camera</div>`}
        ${nn(item.title) ? `<h3 class="s-title">${esc(item.title)}</h3>` : ""}
        <div class="qrbox">${qrSvg(item.qr && item.qr.url)}</div>
        ${nn(item.text || (item.qr && item.qr.label)) ? `<p class="s-text">${esc(item.text || item.qr.label)}</p>` : ""}`;
    } else if (t === "stat") {
      h = `${nn(item.eyebrow) ? `<div class="eyebrow">${esc(item.eyebrow)}</div>` : ""}
        <div class="s-num">${esc(item.num)}<small>${esc(item.unit)}</small></div>
        <p class="s-text">${esc(item.caption || item.text)}</p>${item.source && nn(item.source.title) ? `<div class="s-src">Source: ${esc(item.source.title)}</div>` : ""}`;
    } else if (t === "hours") {
      h = `<div class="eyebrow">${esc(item.eyebrow || "Office hours")}</div><h3 class="s-title">${esc(item.title || "We're here")}</h3>${hoursHtml(ctx.hours || {}, ctx.now)}
        ${nn(item.text) ? `<p class="s-text">${esc(item.text)}</p>` : ""}`;
    } else {
      const eb = item.eyebrow || (t === "tip" ? "Today's tip" : t === "fact" ? "Did you know" : "");
      h = `${eb ? `<div class="eyebrow">${esc(eb)}</div>` : ""}${nn(item.title) ? `<h3 class="s-title">${esc(item.title)}</h3>` : ""}
        ${nn(item.text) ? `<p class="s-text">${esc(item.text)}</p>` : ""}${item.source && nn(item.source.title) ? `<div class="s-src">Source: ${esc(item.source.title)}</div>` : ""}`;
    }
    el.innerHTML = h;
  }

  /* the QR that rides along with a main item shows big in the side third */
  function renderMainQr(el, item) {
    renderSide(el, { layout: "qr", eyebrow: "Scan with your phone camera", title: item.qr.title || "", qr: item.qr, text: item.qr.label });
  }

  function countUp(root) {
    root.querySelectorAll("[data-count]").forEach(el => {
      const to = +el.dataset.count, dec = +el.dataset.dec || 0, t0 = performance.now() + 700, dur = 1600;
      (function step(t) { const k = Math.min(Math.max((t - t0) / dur, 0), 1), e = 1 - Math.pow(1 - k, 3);
        el.textContent = (to * e).toFixed(dec); if (k < 1) requestAnimationFrame(step); })(performance.now());
    });
  }

  /* how long a main item stays up: enough to read it from a chair, plus reveal time */
  function duration(item) {
    const words = ["eyebrow", "headline", "body", "card", "line", "caption", "myth", "fact", "question", "answer", "event"]
      .map(k => item[k] || "").concat(item.steps || [], item.items || [], item.points || []).join(" ").split(/\s+/).filter(Boolean).length;
    const extra = { mythfact: 4, askdoc: 4, steps: 2, checklist: 2, bodymap: 1 }[item.layout] || 0;
    return Math.round(Math.min(26, Math.max(10, 3 + words / 2.6 + extra)));
  }

  function isActive(item, now, month) {
    const d = new Date(now || Date.now()), iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    if (item.show_from && iso < item.show_from) return false;
    if (item.show_until && iso >= item.show_until) return false;
    if (item.months && item.months.length && !item.months.includes(month || d.getMonth() + 1)) return false;
    if (item.layout === "countdown" && item.date && daysUntil(item.date, now) < 0) return false;
    return true;
  }

  /* order a loop: no layout twice in a row, no service within 3 slides, QR spread out */
  function schedule(items, seed) {
    let s = 0; for (const c of String(seed || "x")) s = (s * 31 + c.charCodeAt(0)) >>> 0;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const pool = items.slice().sort(() => rnd() - .5), out = [];
    while (pool.length) {
      const last = out.slice(-3), prev = out[out.length - 1];
      const ok = (it, strict) => (!prev || it.layout !== prev.layout) &&
        (!strict || !last.some(x => x.service && x.service === it.service)) &&
        (!strict || !(prev && prev.qr && it.qr));
      let i = pool.findIndex(it => ok(it, true));
      if (i < 0) i = pool.findIndex(it => ok(it, false));
      if (i < 0) i = 0;
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }

  g.MACTV = { esc, qrSvg, renderMain, renderSide, renderMainQr, countUp, duration, isActive, schedule, daysUntil, LAYOUT_NAMES: Object.keys(LAYOUTS) };
})(typeof window !== "undefined" ? window : globalThis);
