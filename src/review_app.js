/* MAC TV weekly review: candidates come from the Sunday task (db weeks/<week>/items),
   Conrad's decisions are saved to weeks/<week>/decisions, the Monday task (or Publish now) reads them. */
(function () {
  "use strict";
  const T = window.MACTV, esc = T.esc, $ = s => document.querySelector(s);
  const LOGO = window.MAC_LOGO || "";
  const TEXT_FIELDS = ["eyebrow", "headline", "body", "card", "line", "caption", "myth", "fact", "question", "answer", "event", "title", "text"];
  const LIST_FIELDS = ["steps", "items", "points"];
  const ZONE_NAME = { main: "Main screen", side: "Side third", crawler: "Crawler" };
  const SERVICE_NAME = { shockwave: "Shockwave", dry_needling: "Dry needling", chiro: "Chiropractic", rehab: "Rehab", pi: "Car accident care", fm: "Functional medicine",
    nutrition: "Nutrition", weightloss: "Weight loss", habits: "Habits", bodyfacts: "Body facts", seasonal: "Seasonal", news: "Health news", ask: "Ask", clinic: "Clinic" };
  const CLAIM_NAME = { sourced: "Sourced", opinion: "Dr. Taylor's view", clinic: "Clinic info", none: "No claim" };

  let db = null, mcp = null, week = null, items = [], decisions = {}, weeks = [], settings = null, automation = null;
  let unsubItems = null, unsubDec = null, filterZone = "all", undecidedOnly = false, openEdit = new Set();
  const status = (msg, err) => { const s = $("#status"); s.textContent = msg || ""; s.classList.toggle("err", !!err); };

  /* ---------- TV preview ---------- */
  function stageHtml() {
    return `<div class="stage live"><div class="sky"></div><div class="sun"></div>
      <aside class="rail"><div class="rail-slot"><div class="side on"></div></div><div class="logo-plate"><img src="${LOGO}" alt=""></div></aside>
      <section class="main"></section>
      <div class="clockchip"><span>9:41 AM</span><span class="sep"></span><span>Alexandria 72°F · Clear</span></div>
      <div class="crawler"><div class="crawl-track" style="transform:translateX(40px)"></div></div></div>`;
  }
  function fitPreviews() {
    document.querySelectorAll(".pv:not(.strip)").forEach(pv => { const st = pv.querySelector(".stage"); if (st) st.style.transform = `scale(${pv.clientWidth / 1920})`; });
  }
  addEventListener("resize", fitPreviews);
  const SAMPLE_MAIN = { layout: "split", eyebrow: "Your amazing body", headline: "You're taller in the morning", body: "Your discs soak up fluid overnight.", card: "About a centimeter taller when you wake up." };
  function paintPreview(pv, it) {
    if (it.zone === "crawler") { pv.className = "pv strip"; pv.innerHTML = `<div class="line">${esc(it.line || it.text)}</div>`; return; }
    pv.className = "pv"; pv.innerHTML = stageHtml();
    const st = pv.querySelector(".stage"), main = st.querySelector(".main"), side = st.querySelector(".side");
    const month = new Date().getMonth() + 1, th = THEME_COLORS[month];
    st.style.setProperty("--sky-top", th[0]); st.style.setProperty("--sky-bot", th[1]); st.style.setProperty("--card-a", th[2]); st.style.setProperty("--card-b", th[3]);
    st.querySelector(".crawl-track").textContent = "Welcome to Mayfield Advanced Chiropractic   ●   We always accept new patients";
    if (it.zone === "side") {
      T.renderMain(main, SAMPLE_MAIN); main.classList.add("dim");
      T.renderSide(side, it, { hours: (settings && settings.hours) || {}, now: Date.now() });
    } else {
      T.renderMain(main, it, Date.now());
      if (it.qr && it.qr.url) T.renderMainQr(side, it);
      else { T.renderSide(side, { layout: "tip", title: "Side third", text: "Rotates on its own while this slide is up." }); side.classList.add("dim"); }
    }
    st.style.transform = `scale(${(pv.clientWidth || 560) / 1920})`;
  }
  const THEME_COLORS = { 1: ["#2c4f9a", "#b9d3f0", "#0436a0", "#3d7bd8"], 2: ["#24133f", "#a7813d", "#3a1b66", "#1d6a49"], 3: ["#2f6aa8", "#c7e6c9", "#0f5a8a", "#3f9b6a"],
    4: ["#4a7cc4", "#f3d6e2", "#0436a0", "#c56a95"], 5: ["#3d7fd0", "#cfe9c4", "#0d5aa8", "#4aa36b"], 6: ["#2f86d8", "#bfe3f6", "#0436a0", "#1f8ad1"],
    7: ["#1d4fb3", "#d9e9f8", "#0436a0", "#c2333f"], 8: ["#2b6fc9", "#f2e2b8", "#0436a0", "#e07b1a"], 9: ["#36609f", "#e9d6a9", "#16408f", "#b8762a"],
    10: ["#3a5fb8", "#f0c27a", "#0436a0", "#d9661f"], 11: ["#3c4f86", "#d9a774", "#1c2f6e", "#a5501f"], 12: ["#122a66", "#5f86c4", "#0d2a6e", "#a4232f"] };

  /* ---------- cards ---------- */
  function merged(it) { const d = decisions[it.id]; return d && d.edits ? Object.assign({}, it, d.edits) : it; }
  function cardHtml(it) {
    const d = decisions[it.id] || {}, m = merged(it);
    const pills = [ZONE_NAME[it.zone] || it.zone, it.layout, SERVICE_NAME[it.service] || it.service].filter(Boolean).map(p => `<span class="pill">${esc(p)}</span>`).join("") +
      (it.claim ? `<span class="pill ${esc(it.claim)}">${esc(CLAIM_NAME[it.claim] || it.claim)}</span>` : "") +
      (it.show_from || it.show_until ? `<span class="pill">${esc(it.show_from || "now")} to ${esc(it.show_until || "open")}</span>` : "");
    const links = [it.source && it.source.url ? `<span>Source: <a href="${esc(it.source.url)}" target="_blank" rel="noopener">${esc(it.source.title || it.source.url)}</a></span>` : (it.source && it.source.title ? `<span>Source: ${esc(it.source.title)}</span>` : ""),
      m.qr && m.qr.url ? `<span>QR goes to: <a href="${esc(m.qr.url)}" target="_blank" rel="noopener">${esc(m.qr.url)}</a></span>` : ""].join("");
    const btn = (k, label) => `<button type="button" class="${k}${d.d === k ? " on" : ""}" data-act="${k}" aria-pressed="${d.d === k}">${label}</button>`;
    const editOpen = openEdit.has(it.id);
    return `<article class="card${d.d ? " decided-" + d.d : ""}" data-id="${esc(it.id)}">
      <div class="pv"></div>
      <div class="meta">
        <div class="pills">${pills}</div>
        ${it.why ? `<p class="why">${esc(it.why)}</p>` : ""}
        ${links ? `<div class="links">${links}</div>` : ""}
        <div class="decide">${btn("approve", "Approve")}${btn("fix", "Fix")}${btn("cut", "Cut")}
          <button type="button" class="edit" data-act="edit" aria-expanded="${editOpen}">${editOpen ? "Done editing" : "Edit wording"}</button></div>
        <textarea id="note-${esc(it.id)}" rows="2" placeholder="Note for Claude (Fix: say what to change)">${esc(d.n || "")}</textarea>
        ${editOpen ? fieldsHtml(it) : ""}
      </div></article>`;
  }
  function fieldsHtml(it) {
    const d = decisions[it.id] || {}, e = d.edits || {}, out = [];
    TEXT_FIELDS.forEach(k => { if (it[k] == null || it[k] === "") return;
      const v = e[k] != null ? e[k] : it[k];
      out.push(`<label>${esc(k)}<textarea id="f-${esc(it.id)}-${k}" data-field="${k}" rows="${String(v).length > 90 ? 3 : 1}" class="${e[k] != null ? "edited" : ""}">${esc(v)}</textarea></label>`); });
    LIST_FIELDS.forEach(k => { if (!Array.isArray(it[k])) return;
      const v = e[k] != null ? e[k] : it[k];
      out.push(`<label>${esc(k)} (one per line)<textarea id="f-${esc(it.id)}-${k}" data-list="${k}" rows="${v.length + 1}" class="${e[k] != null ? "edited" : ""}">${esc(v.join("\n"))}</textarea></label>`); });
    if (it.num != null) { const v = e.num != null ? e.num : it.num;
      out.push(`<label>number<input id="f-${esc(it.id)}-num" data-num="num" value="${esc(v)}"></label>`); }
    return `<div class="fields">${out.join("")}</div>`;
  }

  function render() {
    const list = $("#list");
    if (!week) { list.innerHTML = `<div class="empty"><b>No week is ready yet.</b> The Sunday evening task fills this page with next week's candidates by 6 pm. You can also ask Claude to run it now.</div>`; updateProgress(); return; }
    let shown = items.filter(it => filterZone === "all" || it.zone === filterZone);
    if (undecidedOnly) shown = shown.filter(it => !(decisions[it.id] || {}).d);
    if (!items.length) { list.innerHTML = `<div class="empty"><b>Loading ${esc(week)}…</b></div>`; return; }
    const groups = ["main", "side", "crawler"];
    list.innerHTML = groups.map(z => { const g = shown.filter(it => it.zone === z); if (!g.length) return "";
      return `<h2 class="group">${ZONE_NAME[z]} <span class="progress">(${g.length})</span></h2>` + g.map(cardHtml).join(""); }).join("") ||
      `<div class="empty">Nothing left here. Switch the filter to see decided items.</div>`;
    list.querySelectorAll(".card").forEach(c => paintPreview(c.querySelector(".pv"), merged(items.find(i => i.id === c.dataset.id))));
    updateProgress();
  }
  function updateProgress() {
    const n = items.length, dd = items.filter(it => (decisions[it.id] || {}).d).length;
    const a = items.filter(it => (decisions[it.id] || {}).d === "approve").length, f = items.filter(it => (decisions[it.id] || {}).d === "fix").length;
    $("#progress").innerHTML = n ? `<b>${dd}</b> of ${n} decided · ${a} approved · ${f} to fix` : "";
  }
  function rerenderCard(id) {
    const c = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`); if (!c) return render();
    const it = items.find(i => i.id === id); const tmp = document.createElement("div"); tmp.innerHTML = cardHtml(it);
    const fresh = tmp.firstElementChild; c.replaceWith(fresh); paintPreview(fresh.querySelector(".pv"), merged(it)); updateProgress();
  }

  /* ---------- saving decisions ---------- */
  const timers = {};
  async function saveDecision(id, patch, delay) {
    decisions[id] = Object.assign({}, decisions[id], patch, { at: new Date().toISOString() });
    clearTimeout(timers[id]);
    timers[id] = setTimeout(async () => {
      try { await db.doc(`weeks/${week}/decisions/${id}`).set(JSON.parse(JSON.stringify(decisions[id]))); status("Saved."); }
      catch (e) { status(e && e.code === "invalid_argument" ? "This page is read-only for you." : "Couldn't save. Check your connection and try again.", true); }
    }, delay || 0);
  }
  $("#list").addEventListener("click", e => {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    const id = b.closest(".card").dataset.id, act = b.dataset.act;
    if (act === "edit") { openEdit.has(id) ? openEdit.delete(id) : openEdit.add(id); return rerenderCard(id); }
    const cur = (decisions[id] || {}).d;
    saveDecision(id, { d: cur === act ? null : act }); rerenderCard(id);
  });
  $("#list").addEventListener("input", e => {
    const t = e.target, card = t.closest(".card"); if (!card) return;
    const id = card.dataset.id, it = items.find(i => i.id === id);
    if (t.id.startsWith("note-")) return saveDecision(id, { n: t.value }, 700);
    const edits = Object.assign({}, (decisions[id] || {}).edits);
    if (t.dataset.field) { const k = t.dataset.field; if (t.value === it[k]) delete edits[k]; else edits[k] = t.value; }
    if (t.dataset.list) { const k = t.dataset.list, v = t.value.split("\n").map(s => s.trim()).filter(Boolean); if (JSON.stringify(v) === JSON.stringify(it[k])) delete edits[k]; else edits[k] = v; }
    if (t.dataset.num) { const v = parseFloat(t.value); if (isNaN(v) || v === it.num) delete edits.num; else edits.num = v; }
    t.classList.toggle("edited", true);
    saveDecision(id, { edits }, 700);
    paintPreview(card.querySelector(".pv"), merged(it));
  });

  /* ---------- filters, tabs, week ---------- */
  document.querySelectorAll("[data-zone]").forEach(b => b.addEventListener("click", () => {
    filterZone = b.dataset.zone; document.querySelectorAll("[data-zone]").forEach(x => x.setAttribute("aria-pressed", x === b)); render(); }));
  $("#undecided").addEventListener("click", e => { undecidedOnly = !undecidedOnly; e.target.setAttribute("aria-pressed", undecidedOnly); render(); });
  $("#approveRest").addEventListener("click", () => {
    const b = $("#approveRest");
    if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Tap again to approve every undecided item"; setTimeout(() => { delete b.dataset.armed; b.textContent = "Approve the rest"; }, 4000); return; }
    delete b.dataset.armed; b.textContent = "Approve the rest";
    items.filter(it => !(decisions[it.id] || {}).d).forEach((it, k) => saveDecision(it.id, { d: "approve" }, k * 120)); render();
  });
  document.querySelectorAll("nav.tabs button").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("nav.tabs button").forEach(x => x.setAttribute("aria-selected", x === b));
    $("#weekView").hidden = b.dataset.tab !== "week"; $("#alwaysView").hidden = b.dataset.tab !== "always";
    try { localStorage.setItem("mactv_tab", b.dataset.tab); } catch (e) {} }));
  $("#weekSel").addEventListener("change", e => openWeek(e.target.value));

  function openWeek(w) {
    if (unsubItems) unsubItems(); if (unsubDec) unsubDec();
    week = w; items = []; decisions = {}; render();
    if (!w) return;
    unsubItems = db.collection(`weeks/${w}/items`).onSnapshot(s => {
      items = s.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => (a.order || 0) - (b.order || 0) || a.id.localeCompare(b.id)); render(); },
      () => status("Couldn't load this week's items.", true));
    unsubDec = db.collection(`weeks/${w}/decisions`).onSnapshot(s => {
      const fresh = {}; s.docs.forEach(d => fresh[d.id] = d.data());
      const firstLoad = !Object.keys(decisions).length; decisions = Object.assign(fresh, pendingLocal()); if (firstLoad) render(); else updateProgress(); },
      () => {});
    const meta = weeks.find(x => x.id === w);
    $("#weekNote").textContent = meta ? (meta.note || "") + (meta.status === "published" ? ` Published ${new Date(meta.published_at).toLocaleString()}.` : "") : "";
  }
  function pendingLocal() { const out = {}; Object.keys(timers).forEach(id => { if (decisions[id]) out[id] = decisions[id]; }); return out; }

  /* ---------- publish now ---------- */
  $("#publish").addEventListener("click", async () => {
    const b = $("#publish");
    if (!automation || !automation.publish_trigger_id) return status("Publishing isn't set up yet. Ask Claude to finish the Monday task.", true);
    if (!mcp) return status("This view can't start the publish task. It will still run Monday morning.", true);
    if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Tap again to publish now"; setTimeout(() => { delete b.dataset.armed; b.textContent = "Publish now"; }, 4000); return; }
    delete b.dataset.armed; b.textContent = "Publishing…"; b.disabled = true;
    try {
      await mcp.callTool("Claude Code Remote", "fire_trigger", { trigger_id: automation.publish_trigger_id, text: `Publish ${week} now. Requested from the review page.` });
      status("Publish started. The lobby TV picks it up within about 20 minutes.");
    } catch (e) {
      const m = { approval_required: "Allow this page to start Claude tasks, then tap Publish again.", server_not_connected: "Claude Code Remote isn't connected for you here.",
        not_in_manifest: "Publishing was turned off for this page in its permissions." }[e && e.code];
      status(m || "Couldn't start the publish. It may have started anyway; check back in a few minutes before trying again.", true);
    } finally { b.textContent = "Publish now"; b.disabled = false; }
  });

  /* ---------- always-on settings ---------- */
  function renderAlways() {
    const s = settings || {}, lines = s.standing_crawler || [], vids = s.videos || [];
    $("#standing").innerHTML = lines.map((l, i) => `<div class="row"><input type="checkbox" id="sc-on-${i}" data-i="${i}" ${l.on !== false ? "checked" : ""} aria-label="Show this line">
      <input type="text" id="sc-tx-${i}" data-i="${i}" value="${esc(l.text)}"><button type="button" data-del="${i}">Remove</button></div>`).join("") || `<p class="hint">No standing lines.</p>`;
    $("#videos").value = vids.map(v => typeof v === "string" ? v : (v.url || v.id)).join("\n");
    $("#vmin").value = s.videoEveryMinutes || 15;
  }
  let setT;
  function saveSettings() { clearTimeout(setT); setT = setTimeout(async () => {
    try { await db.doc("config/settings").set(JSON.parse(JSON.stringify(settings))); status("Saved. Goes live with the next publish."); }
    catch (e) { status("Couldn't save settings.", true); } }, 700); }
  $("#standing").addEventListener("input", e => { const i = +e.target.dataset.i; if (isNaN(i)) return; const l = settings.standing_crawler[i];
    if (e.target.type === "checkbox") l.on = e.target.checked; else l.text = e.target.value; saveSettings(); });
  $("#standing").addEventListener("click", e => { const i = e.target.dataset.del; if (i == null) return; settings.standing_crawler.splice(+i, 1); renderAlways(); saveSettings(); });
  $("#addLine").addEventListener("click", () => { settings.standing_crawler = settings.standing_crawler || []; settings.standing_crawler.push({ id: "s" + Date.now(), text: "", on: true }); renderAlways(); saveSettings(); });
  $("#videos").addEventListener("input", e => { settings.videos = e.target.value.split("\n").map(s => s.trim()).filter(Boolean); saveSettings(); });
  $("#vmin").addEventListener("input", e => { const v = parseInt(e.target.value, 10); if (v > 0) { settings.videoEveryMinutes = v; saveSettings(); } });

  /* ---------- boot ---------- */
  (async function boot() {
    try { const t = localStorage.getItem("mactv_tab"); if (t) document.querySelector(`nav.tabs button[data-tab="${t}"]`).click(); } catch (e) {}
    db = await window.claude.use("db");
    if (!db) { $("#list").innerHTML = `<div class="empty"><b>Open this page on claude.ai to review.</b> The review data lives with the page there.</div>`; return; }
    window.claude.use("mcp").then(m => { mcp = m; });
    db.doc("config/automation").onSnapshot(s => { automation = s.exists ? s.data() : null; }, () => {});
    db.doc("config/settings").onSnapshot(s => { if (!s.exists) { settings = { standing_crawler: [], videos: [], videoEveryMinutes: 15 }; renderAlways(); return; }
      if (!setT || !settings) { settings = JSON.parse(JSON.stringify(s.data())); renderAlways(); } }, () => {});
    db.collection("weeks").orderBy("generated", "desc").limit(12).onSnapshot(s => {
      weeks = s.docs.map(d => Object.assign({ id: d.id }, d.data()));
      const sel = $("#weekSel"), cur = week;
      sel.innerHTML = weeks.map(w => `<option value="${esc(w.id)}">${esc(w.label || w.id)}${w.status === "published" ? " · published" : ""}</option>`).join("");
      if (!weeks.length) { week = null; render(); return; }
      const pick = cur && weeks.some(w => w.id === cur) ? cur : weeks[0].id; sel.value = pick;
      if (pick !== cur) openWeek(pick); else { const meta = weeks.find(x => x.id === pick); $("#weekNote").textContent = meta ? (meta.note || "") : ""; }
    }, () => status("Couldn't load weeks.", true));
  })();
})();
