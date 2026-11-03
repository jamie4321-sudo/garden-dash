/* =========================================================
   GARDEN — 관리 구역 (#zones)
   건물 단면도 + 식물 수종 TOP 10
   데이터: 구글 시트 「아지트 가든 관리구역」 공개 CSV를 직접 읽음
   (시트 공유가 '링크가 있는 모든 사용자 보기'여야 함 · GAS 거치지 않음)
   ========================================================= */
(function () {
  "use strict";

  const SHEET_ID = (window.CONFIG && window.CONFIG.ZONES_SHEET_ID) || "1CNgkMtWYW-ajL4BCf86nH8KFapq3LEZsM_Cmd5i1eSE";
  const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`;
  const CACHE_KEY = "garden-zones-csv";
  const REFRESH_MS = 5 * 60 * 1000;

  const SZ = ["중형", "특대", "대형", "소형", "일반", "정원"];
  // 시트 원본은 그대로 두고 화면에서만 맞춤법 통일
  const FIX = { "관음중": "관음죽", "샐렘": "셀렘", "셀럼": "셀렘", "아레카아쟈": "아레카야자", "오렌지쟈스민": "오렌지자스민", "수크렁": "수크령", "삼색버들": "삼색버드나무" };

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clean = (x) => { x = (x || "").trim(); return x === "-" ? "" : x; };

  /* ---------- 시트 → 구역 데이터 ---------- */
  function parseCSV(t) {
    const rows = []; let row = [], f = "", q = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
      else if (c !== "\r") f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows;
  }
  function plants(x) {
    x = clean(x); let note = "";
    const m = x.match(/^★([^:]+):\s*(.*)$/);
    if (m) { note = m[1].trim(); x = m[2]; }
    const ps = [];
    x.split(",").map((p) => p.trim()).filter(Boolean).forEach((p) => { p = FIX[p] || p; if (!ps.includes(p)) ps.push(p); });
    return { ps, note };
  }
  function sizes(x) {
    const r = {}, re = /(특대|대형|중형|소형|일반\s?화분|정원)\s*(\d+)/g; let m;
    x = clean(x);
    while ((m = re.exec(x))) { const k = m[1].includes("일반") ? "일반" : m[1]; r[k] = (r[k] || 0) + +m[2]; }
    return r;
  }
  function build(csv) {
    const zones = [], summary = {};
    parseCSV(csv).slice(1).forEach((r) => {
      const b0 = clean(r[1]), z = clean(r[2]);
      if (!b0 && !z) { if (clean(r[3])) summary[clean(r[3])] = clean(r[4]); return; }
      const b = b0.startsWith("공용부") ? "공용부" : b0;
      const fm = z.match(/^(\d+)층\s*(.*)$/);
      let fl = null, sub = z;
      if (fm) { fl = +fm[1]; sub = fm[2].trim() || "공용 홀"; }
      else if (z.includes("춘식도락") || b0.includes("B1")) fl = -1;
      const a = plants(r[4]), c = plants(r[6]), t = clean(r[7]);
      zones.push({
        id: zones.length, b, z, fl, sub, pv: sizes(r[3]), pb: sizes(r[5]), pvP: a.ps, pbP: c.ps,
        t: t.includes("오전") ? "오전" : t.includes("오후") ? "오후" : "",
        note: clean(r[8]) || a.note || c.note,
      });
    });
    return { zones, summary };
  }

  /* ---------- 상태 ---------- */
  let Z = [], SP = [], sel = null, query = "", loadedAt = null, state = "loading", changed = false, lastCSV = "", timer = null;

  const cnt = (z, k) => (z.pv[k] || 0) + (z.pb[k] || 0);
  const tot = (z) => SZ.reduce((s, k) => s + cnt(z, k), 0);
  const plantsOf = (z) => [...new Set([...z.pvP, ...z.pbP])];
  const flLabel = (f) => (f == null ? "기타" : f < 0 ? "B1" : f + "층");
  const zLabel = (z) => (z.fl == null ? z.z : z.sub);
  const short = (s) => s.replace(" 오아시스", "오아").replace(/\(.*?\)/g, "").trim();
  const timeTxt = (t) => (t === "오전" ? "오전 7:00–10:45" : t === "오후" ? "오후 12:00–15:45" : "시간 미정");
  const spOf = (p) => SP.find((s) => s.p === p);
  const B_ORDER = { "A동": 0, "B동": 1, "공용부": 2 };
  const byB = (ids) => ["A동", "B동", "공용부"].map((b) => [b, ids.filter((i) => Z[i].b === b).length]).filter((x) => x[1]);
  const heat = (v, m) => { const r = v / m; return r > .75 ? 4 : r > .5 ? 3 : r > .25 ? 2 : 1; };

  function apply(csv) {
    const d = build(csv);
    Z = d.zones;
    const m = {};
    Z.forEach((z) => plantsOf(z).forEach((p) => (m[p] = m[p] || []).push(z.id)));
    SP = Object.entries(m).map(([p, ids]) => ({ p, ids }))
      .sort((a, b) => b.ids.length - a.ids.length || a.p.localeCompare(b.p, "ko"));
    if (sel && !spOf(sel)) sel = null;
  }

  /* ---------- 그리기 ---------- */
  function liveHTML() {
    const t = loadedAt ? loadedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "";
    if (state === "loading") return `<span class="zn-dot"></span><span>구글 시트 불러오는 중…</span>`;
    const sheet = `<a class="zn-link" href="https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit" target="_blank" rel="noopener">시트 열기 ↗</a>`;
    if (state === "cache") return `<span class="zn-dot is-off"></span><span>시트를 못 불러와서 마지막으로 받은 내용을 보여주고 있어요</span>
      <button class="btn btn--sm" onclick="ZONES.load(true)">다시 시도</button>${sheet}`;
    if (state === "error") return `<span class="zn-dot is-off"></span><span>시트를 불러오지 못했어요 · 시트 공유가 ‘링크가 있는 모든 사용자 보기’인지 확인해 주세요</span>
      <button class="btn btn--sm" onclick="ZONES.load(true)">다시 시도</button>${sheet}`;
    return `<span class="zn-dot is-on"></span><span><b>구글 시트 연결됨</b> · ${t} 불러옴${changed ? ` · <b class="zn-new">시트가 바뀌어 새로 반영했어요</b>` : ""}</span>${sheet}`;
  }

  function secHTML() {
    if (!Z.length) return `<div class="zn-empty">${state === "error" ? "표시할 데이터가 없어요" : "불러오는 중…"}</div>`;
    const max = Math.max(...Z.map(tot)), hit = sel ? new Set(spOf(sel).ids) : null;
    const col = (b) => {
      const fls = [...new Set(Z.filter((z) => z.b === b).map((z) => z.fl))].sort((a, c) => (c ?? -9) - (a ?? -9));
      return `<div class="zn-col"><h4>${b}</h4>${fls.map((f) => `<div class="zn-fl"><b>${flLabel(f)}</b><div class="zn-zs">${
        Z.filter((z) => z.b === b && z.fl === f).map((z) => {
          const v = tot(z), h = v ? heat(v, max) : 0;
          return `<button class="zn-z zn-h${h}${hit && hit.has(z.id) ? " is-hit" : ""}" onclick="ZONES.open(${z.id})" title="${esc(zLabel(z))}">${esc(short(zLabel(z)))}<small>${v}</small></button>`;
        }).join("")}</div></div>`).join("")}</div>`;
    };
    return `<div class="zn-sec${sel ? " is-hl" : ""}">${col("A동")}${col("B동")}${col("공용부")}</div>`;
  }

  function hlHTML() {
    const s = sel && spOf(sel);
    if (!s) return "";
    return `<div class="zn-hl"><span class="zn-muted">식물로 보기</span><b>${esc(s.p)}</b>
      <span>${s.ids.length}곳 · ${byB(s.ids).map(([b, n]) => `${b} ${n}`).join(" · ")}</span>
      <button class="btn btn--sm" onclick="ZONES.pick(null)">✕ 전체 보기</button></div>`;
  }

  /* 식물 수종 — 칩 12개 + 검색 · 고르면 위 단면도에서 그 식물 구역만 진하게 */
  function chipsHTML() {
    if (!SP.length) return "";
    const q = query.trim();
    let list = q ? SP.filter((s) => s.p.includes(q)).slice(0, 16) : SP.slice(0, 12);
    if (!q && sel && !list.some((s) => s.p === sel)) list = list.concat(spOf(sel) || []);
    if (!list.length) return `<span class="zn-muted">‘${esc(q)}’ 식물이 없어요</span>`;
    return list.map((s) => `<button class="zn-tag${s.p === sel ? " is-on" : ""}" onclick="ZONES.pick('${esc(s.p)}', true)">${esc(s.p)} <em>${s.ids.length}</em></button>`).join("");
  }

  function paint() {
    const set = (id, h) => { const el = document.getElementById(id); if (el) el.innerHTML = h; };
    set("znLive", liveHTML());
    set("znHl", hlHTML());
    set("znSec", secHTML());
    set("znChips", chipsHTML());
    set("znSecSub", Z.length ? `${Z.length}개 구역 · 블록을 누르면 상세 · 진할수록 관리 수량이 많아요` : "");
    set("znSpSub", SP.length ? `${SP.length}종 · 자주 있는 12종 · 나머지는 검색 · 고르면 위 단면도에 표시` : "");
  }

  function drawerHTML(z) {
    const tags = (ps) => `<div class="zn-tags">${ps.map((p) => `<button class="zn-tag${p === sel ? " is-on" : ""}" onclick="ZONES.close();ZONES.pick('${esc(p)}')">${esc(p)}</button>`).join("")}</div>`;
    const box = SZ.filter((k) => cnt(z, k)).map((k) => `<div><b>${cnt(z, k)}</b><span>${k === "중형" ? "수납장(중형)" : k}</span></div>`).join("");
    return `<button class="zn-x" onclick="ZONES.close()" aria-label="닫기">✕</button>
      <p class="eyebrow">${esc(z.b)} · ${esc(timeTxt(z.t))}</p>
      <h3>${esc(z.fl == null ? z.z : flLabel(z.fl) + " " + z.sub)}</h3>
      <div class="zn-ds"><h6>관리 수량 · 총 ${tot(z)}개</h6><div class="zn-dg">${box || `<div><b>—</b><span>미기재</span></div>`}</div></div>
      ${z.pvP.length ? `<div class="zn-ds"><h6>수납장 식물</h6>${tags(z.pvP)}</div>` : ""}
      ${z.pbP.length ? `<div class="zn-ds"><h6>공용부 식물 · ${z.pbP.length}종</h6>${tags(z.pbP)}</div>` : ""}
      ${z.note ? `<div class="zn-ds"><h6>메모</h6><span class="zn-tag zn-warn">${esc(z.note)}</span></div>` : ""}`;
  }

  /* ---------- 불러오기 ---------- */
  async function load(force) {
    try {
      const r = await fetch(SHEET_URL + "&cb=" + Date.now(), { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const csv = await r.text();
      if (!csv.includes("층 / 구역")) throw new Error("form"); // 비공개면 로그인 페이지가 옴
      changed = !!lastCSV && csv !== lastCSV;
      if (csv !== lastCSV || force || !Z.length) apply(csv);
      lastCSV = csv; state = "live"; loadedAt = new Date();
      try { localStorage.setItem(CACHE_KEY, csv); } catch (e) {}
    } catch (e) {
      state = Z.length ? "cache" : "error";
    }
    paint();
  }

  function onVisible() { if (!document.hidden && document.getElementById("znSec")) load(); }

  window.ZONES = {
    html() {
      return `<section class="view zn">
        <div class="page-head">
          <div><p class="eyebrow">Crew · 관리 구역</p><h2>관리 구역</h2>
            <p class="sub">구글 시트 「아지트 가든 관리구역」을 그대로 보여줘요 · 시트를 고치면 자동 반영 (5분마다·화면 돌아올 때)</p></div>
          <div class="seg"><button class="btn btn--primary btn--sm" onclick="ZONES.load(true)">↻ 새로고침</button></div>
        </div>
        <div class="zn-live" id="znLive">${liveHTML()}</div>
        <div class="zn-card zn-block">
          <div class="zn-bh"><h3>건물 보기</h3><p class="zn-muted" id="znSecSub"></p></div>
          <div id="znHl">${hlHTML()}</div>
          <div id="znSec">${secHTML()}</div>
          <div class="zn-legend">관리 수량 <span><i class="zn-h1"></i>적음</span><span><i class="zn-h2"></i></span><span><i class="zn-h3"></i></span><span><i class="zn-h4"></i>많음</span></div>
        </div>
        <div class="zn-block zn-block--sp">
          <div class="zn-bh"><h3>식물 수종</h3><p class="zn-muted" id="znSpSub"></p></div>
          <div class="zn-chipbar">
            <input class="zn-srch" type="search" placeholder="식물 이름 찾기 (예: 몬스테라)" value="${esc(query)}" oninput="ZONES.find(this.value)" />
            <div class="zn-tags" id="znChips">${chipsHTML()}</div>
          </div>
        </div>
        <div class="zn-scrim" onclick="ZONES.close()"></div>
        <aside class="zn-drawer" id="znDrawer"></aside>
      </section>`;
    },
    mount() {
      if (!Z.length) {
        try { const c = localStorage.getItem(CACHE_KEY); if (c) { apply(c); lastCSV = c; state = "cache"; } } catch (e) {}
      }
      paint();
      load();
      clearInterval(timer);
      timer = setInterval(() => { if (document.getElementById("znSec")) load(); else clearInterval(timer); }, REFRESH_MS);
    },
    load,
    pick(p, jump) {
      sel = p && sel !== p ? p : null; paint();
      const b = document.querySelector(".zn-block");
      if (jump && sel && b && b.getBoundingClientRect().top < 0) b.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    find(v) { query = v || ""; const c = document.getElementById("znChips"); if (c) c.innerHTML = chipsHTML(); },
    open(id) {
      const d = document.getElementById("znDrawer"); if (!d || !Z[id]) return;
      d.innerHTML = drawerHTML(Z[id]);
      document.querySelector(".zn").classList.add("is-dr");
    },
    close() { const v = document.querySelector(".zn"); if (v) v.classList.remove("is-dr"); },
  };

  document.addEventListener("visibilitychange", onVisible);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") window.ZONES.close(); });
})();
