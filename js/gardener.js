/* =========================================================
   GARDEN — 아지트 가드너 앱 현장 이슈 연결 (읽기 전용)
   가드너 앱 계정(이름 + 비밀번호 4자리)으로 한 번 연결하면
   그 앱의 ag_issue_week 로 최근 8주 현장 이슈(사진·올린/조치한 사람·칭찬·댓글)를 읽어 와요.
   새 SQL 없음 · garden-dash 는 쓰지 않고 읽기만 (조치·댓글은 가드너 앱에서)
   ========================================================= */
(function () {
  "use strict";

  const C = window.CONFIG || {};
  const SB_URL = C.GARDENER_SB_URL || "https://qdwynctnhjndkmykecbu.supabase.co";
  const SB_KEY = C.GARDENER_SB_KEY || "sb_publishable_gv8l9z7imNyR0_lsUmVLxw_cFFclQ6O"; // 가드너 앱과 같은 공개 키
  const TOKEN_KEY = "garden-ag-token", WHO_KEY = "garden-ag-who", CACHE_KEY = "garden-ag-cache";
  const WEEKS = 8;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => (n < 10 ? "0" : "") + n;
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const get = (k) => { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } };
  const put = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} };

  let items = [], zones = {}, state = "off", loadedAt = 0, busy = null, roster = null, loginErr = "";
  try { const c = JSON.parse(get(CACHE_KEY) || "null"); if (c && Array.isArray(c.items)) { items = c.items; zones = c.zones || {}; } } catch (e) {}
  if (get(TOKEN_KEY)) state = items.length ? "cache" : "loading";

  async function rpc(fn, args) {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: SB_KEY, ...(SB_KEY.startsWith("eyJ") ? { Authorization: `Bearer ${SB_KEY}` } : {}), "Content-Type": "application/json" },
      body: JSON.stringify(args || {}),
    });
    if (!r.ok) {
      const t = await r.json().catch(() => ({}));
      const e = new Error(t.message || `오류 ${r.status}`); e.status = r.status; throw e;
    }
    const txt = await r.text(); return txt ? JSON.parse(txt) : null;
  }

  const mondayOf = (d) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  async function load(force) {
    const t = get(TOKEN_KEY); if (!t) { state = "off"; return; }
    if (busy) return busy;
    if (!force && Date.now() - loadedAt < 60000 && state === "live") return;
    busy = (async () => {
      try {
        const mon = mondayOf(new Date()), froms = [];
        for (let k = 0; k < WEEKS; k++) { const d = new Date(mon); d.setDate(d.getDate() - 7 * k); froms.push(ymd(d)); }
        const [board, ...weeks] = await Promise.all([
          rpc("ag_board", { p_token: t, p_day: ymd(new Date()) }).catch(() => null),
          ...froms.map((f) => rpc("ag_issue_week", { p_token: t, p_from: f })),
        ]);
        if (board && Array.isArray(board.zones)) { zones = {}; board.zones.forEach((z) => (zones[z.code] = z.label)); }
        const seen = {};
        items = [];
        weeks.forEach((w) => (w && w.items || []).forEach((x) => { if (!seen[x.id]) { seen[x.id] = 1; items.push(x); } }));
        state = "live"; loadedAt = Date.now();
        put(CACHE_KEY, JSON.stringify({ items, zones }));
      } catch (e) {
        // 토큰이 끊겼으면(로그아웃·만료·비번 변경) 다시 연결하게
        if (/세션|로그인|token|권한|401|403/i.test(String(e.message)) || e.status === 401) { put(TOKEN_KEY, ""); state = "off"; items = []; put(CACHE_KEY, ""); }
        else state = items.length ? "cache" : "error";
      } finally { busy = null; }
    })();
    return busy;
  }

  /* ---------- 가드너 이슈 → garden-dash 목록 모양 ---------- */
  const zoneName = (code) => zones[code] || code || "";
  function building(x) {
    const m = String(x.zone || "").match(/^(\d+)\s*([AB])$/i);
    return m ? `${m[2].toUpperCase()}동` : "공용부";
  }
  const place = (x) => [x.zone ? zoneName(x.zone) : "", x.place || ""].filter(Boolean).join(" · ") || "위치 정하지 않음";
  const title = (x) => String(x.memo || "현장 이슈").split("\n")[0].slice(0, 60);

  const CHEERS = { heart: "♥ 하트", thanks: "🌱 고마워요", best: "👏 최고예요", clean: "✨ 깔끔해요" };
  const when = (iso) => { if (!iso) return ""; const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const md = (s) => { const m = String(s || "").match(/\d{4}-(\d{2})-(\d{2})/); return m ? `${+m[1]}/${+m[2]}` : "—"; };
  const thumbs = (ps) => ps.length
    ? `<div class="ag-ph">${ps.map((p) => `<button class="ag-ph__i" onclick="AGI.photo('${esc(p.id)}')" aria-label="사진 크게 보기"><img src="${esc(p.thumb)}" alt="" loading="lazy"></button>`).join("")}</div>`
    : `<p class="muted" style="margin:0;font-size:12.5px">사진 없음</p>`;

  function stepsHTML(x) {
    const open = !x.done_at, now = open ? 2 : 4;
    const before = (x.photos || []).filter((p) => p.kind !== "after"), after = (x.photos || []).filter((p) => p.kind === "after");
    const step = (n, t, sub, body, show) => `<div class="ik-step${n < now ? " is-done" : n === now ? " is-now" : ""}">
      <span class="ik-step__n">${n < now ? "✓" : n}</span>
      <div class="ik-step__c"><div class="ik-step__t"><b>${t}</b><span>${sub}</span></div>${show ? `<div class="ik-step__b">${body}</div>` : ""}</div></div>`;
    const hearts = x.hearts || [], comments = x.comments || [];
    const cheer = Object.keys(CHEERS).map((k) => { const l = hearts.filter((h) => (h.kind || "heart") === k); return l.length ? `<span class="ag-cheer">${CHEERS[k]} ${l.length}</span>` : ""; }).join("");
    const names = [...new Set(hearts.map((h) => h.name).filter(Boolean))];
    const talk = `${cheer ? `<div class="ag-cheers">${cheer}</div><small class="muted">${esc(names.join(", "))}님이 칭찬했어요</small>` : ""}
      ${comments.length ? `<div class="ag-cmts">${comments.map((c) => `<div class="ag-cmt"><b>${esc(c.name || "알 수 없음")}</b><small>${when(c.at)}</small><p>${esc(c.body)}</p></div>`).join("")}</div>` : `<p class="muted" style="margin:0;font-size:12.5px">아직 댓글이 없어요</p>`}`;
    const s1 = `<p>${esc(x.memo || "내용 없음")}</p>
      <div class="ik-kv"><span><i>올린 사람</i>${esc(x.created_name || "알 수 없음")}</span><span><i>올린 때</i>${when(x.created_at)}</span></div>
      <div><p class="ag-lbl">현장 사진 · ${before.length}</p>${thumbs(before)}</div>`;
    const s2 = open
      ? `<p class="muted">가드너 앱에서 ‘조치 완료’를 누르면 여기에 조치한 사람·사진이 나와요.</p>${comments.length ? talk : ""}
         <div class="ik-acts"><a class="btn btn--primary btn--sm" href="${esc(AGI.appUrl())}" target="_blank" rel="noopener">가드너 앱에서 조치하기</a></div>`
      : `<div class="ik-kv"><span><i>조치한 사람</i>${esc(x.done_name || "알 수 없음")}</span><span><i>조치한 때</i>${when(x.done_at)}</span></div>
         ${x.done_note ? `<p>${esc(x.done_note)}</p>` : ""}<div><p class="ag-lbl">조치 후 사진 · ${after.length}</p>${thumbs(after)}</div>`;
    return step(1, "발견", `${md(x.day)} · ${esc(x.created_name || "")}`, s1, open)
      + step(2, "조치", open ? "지금 진행 중" : `${esc(x.done_name || "")} · ${when(x.done_at)}`, s2, true)
      + step(3, "확인", open ? "조치 후" : `칭찬 ${hearts.length} · 댓글 ${comments.length}`, talk, !open);
  }

  window.AGI = {
    appUrl() { return (window.CONFIG && window.CONFIG.GARDENER_URL) || "https://agit-gardener.pages.dev/"; },
    on() { return !!get(TOKEN_KEY); },
    who() { return get(WHO_KEY); },
    state() { return state; },
    load,
    // garden-dash 목록에 섞을 공통 모양
    entries() {
      return items.map((x) => ({
        key: "a:" + x.id, src: "ag", raw: x, date: x.day || String(x.created_at || "").slice(0, 10),
        open: !x.done_at, b: building(x), loc: place(x), title: title(x),
        right: x.done_at ? `완료 ${md(String(x.done_at).slice(0, 10))}` : "진행 중",
        hay: [x.memo, x.place, zoneName(x.zone), x.created_name, x.done_name, x.done_note].join(" ").toLowerCase(),
        placeKey: "ag:" + (x.zone || "") + "|" + (x.place || "").replace(/\s+/g, ""),
      }));
    },
    detailHTML(e) {
      const x = e.raw;
      return `<div class="ik-detail">
        <div class="ik-detail__h"><div><h3>${esc(e.title)}</h3><p>${esc(e.loc)} · ${md(x.day)} 발견 · <span class="ag-badge">가드너 앱</span></p></div>
          ${x.done_at ? `<span class="ik-done">조치 완료</span>` : `<a class="btn btn--primary btn--sm" href="${esc(this.appUrl())}" target="_blank" rel="noopener">가드너 앱에서 열기</a>`}</div>
        ${stepsHTML(x)}</div>`;
    },
    infoHTML(e, sameList) {
      const x = e.raw;
      return `<div class="ik-info">
        <section><h6>위치</h6><div class="ik-v">${esc(e.b)}<small>${esc(e.loc)}</small></div></section>
        <section><h6>이슈</h6><span class="ik-tag is-lime">가드너 앱</span><span class="ik-tag${x.done_at ? "" : " is-warn"}">${x.done_at ? "조치 완료" : "진행 중"}</span><span class="ik-tag">사진 ${(x.photos || []).length}</span><span class="ik-tag">댓글 ${(x.comments || []).length}</span></section>
        <section><h6>이 자리 이력 · ${sameList.length + 1}번째</h6>${sameList.length
          ? `<div class="ik-hist">${sameList.slice(0, 6).map((y) => `<div>${esc(y.title)}<span>${md(y.date)}</span></div>`).join("")}</div>`
          : `<p class="muted ik-memo">처음 생긴 자리예요</p>`}</section>
        <div class="ik-acts"><a class="btn btn--sm" href="${esc(this.appUrl())}" target="_blank" rel="noopener">가드너 앱에서 열기</a></div>
      </div>`;
    },
    // 위쪽 연결 상태 칩
    chipHTML() {
      if (!this.on()) return `<button class="ag-chip" onclick="AGI.openLogin()">🔗 가드너 앱 연결</button>`;
      const t = state === "loading" ? "불러오는 중…" : state === "error" ? "못 불러왔어요" : `${items.length}건`;
      return `<span class="ag-chip is-on" title="${esc(this.who())} 계정으로 연결됨">● 가드너 앱 · ${t}<button onclick="AGI.disconnect()" aria-label="연결 끊기">끊기</button></span>`;
    },
    async openLogin() {
      loginErr = "";
      document.body.insertAdjacentHTML("beforeend", `<div class="gmodal" id="agLogin"><div class="gmodal__bd" onclick="AGI.closeLogin()"></div>
        <div class="gmodal__card" style="max-width:380px"><div class="gmodal__head"><h3>가드너 앱 연결</h3><button class="gmodal__x" onclick="AGI.closeLogin()" aria-label="닫기">×</button></div>
        <div id="agLoginBody"><p class="muted" style="margin:0">이름 목록 불러오는 중…</p></div></div></div>`);
      try { roster = await rpc("ag_roster"); } catch (e) { roster = null; }
      this.drawLogin();
    },
    drawLogin(sel) {
      const b = document.getElementById("agLoginBody"); if (!b) return;
      if (!roster || !roster.length) { b.innerHTML = `<p class="nt-err" style="margin:0">가드너 앱에 연결하지 못했어요. 잠시 뒤 다시 해 주세요.</p>`; return; }
      const pick = sel || (roster.find((m) => m.role === "admin") || roster[0]).id;
      b.innerHTML = `<p class="muted" style="margin:0 0 12px;font-size:13px">가드너 앱에서 쓰는 이름과 비밀번호 4자리로 한 번만 연결하면, 현장 이슈를 여기서 볼 수 있어요. (읽기만 해요)</p>
        <div class="ag-names">${roster.map((m) => `<button class="${m.id === pick ? "is-on" : ""}" onclick="AGI.drawLogin('${esc(m.id)}')">${esc(m.name)}</button>`).join("")}</div>
        <div class="nt-lock__row" style="margin-top:12px"><input id="ag_pin" type="password" inputmode="numeric" maxlength="4" placeholder="비밀번호 4자리" autocomplete="off"
          onkeydown="if(event.key==='Enter')AGI.login('${esc(pick)}')"/><button class="btn btn--primary btn--sm" onclick="AGI.login('${esc(pick)}')">연결</button></div>
        <p class="nt-err" id="ag_err">${esc(loginErr)}</p>`;
      const i = document.getElementById("ag_pin"); if (i) i.focus();
    },
    async login(id) {
      const pin = (document.getElementById("ag_pin") || {}).value || "";
      if (!/^\d{4}$/.test(pin)) { loginErr = "비밀번호 숫자 4자리를 넣어 주세요."; return this.drawLogin(id); }
      try {
        const r = await rpc("ag_login", { p_id: id, p_pin: pin });
        if (!r || !r.ok) {
          loginErr = r && r.err === "locked" ? `5번 틀려서 잠겼어요. ${Math.ceil((r.wait || 300) / 60)}분 뒤 다시 해 주세요.` : r && r.err === "pin" ? `비밀번호가 맞지 않아요. (${r.left}번 남음)` : "연결하지 못했어요.";
          return this.drawLogin(id);
        }
        put(TOKEN_KEY, r.token); put(WHO_KEY, (r.me && r.me.name) || "");
        state = "loading"; this.closeLogin(); this.refresh(true);
      } catch (e) { loginErr = "연결하지 못했어요. 잠시 뒤 다시 해 주세요."; this.drawLogin(id); }
    },
    closeLogin() { const m = document.getElementById("agLogin"); if (m) m.remove(); },
    disconnect() {
      if (!window.confirm("가드너 앱 연결을 끊을까요? 이 기기에서만 끊겨요.")) return;
      const t = get(TOKEN_KEY);
      if (t) rpc("ag_logout", { p_token: t }).catch(() => {});
      put(TOKEN_KEY, ""); put(WHO_KEY, ""); put(CACHE_KEY, ""); items = []; state = "off";
      if (window.GARDEN && GARDEN.issueRefresh) GARDEN.issueRefresh();
    },
    async refresh(force) {
      if (window.GARDEN && GARDEN.issueRefresh) GARDEN.issueRefresh();
      await load(force);
      if (window.GARDEN && GARDEN.issueRefresh) GARDEN.issueRefresh();
    },
    async photo(id) {
      const t = get(TOKEN_KEY); if (!t) return;
      document.body.insertAdjacentHTML("beforeend", `<div class="lightbox" id="agLb" onclick="this.remove()"><div class="lightbox__backdrop"></div>
        <figure class="lightbox__fig"><p class="lightbox__cap">사진 불러오는 중…</p></figure></div>`);
      try {
        const src = await rpc("ag_issue_photo", { p_token: t, p_id: id });
        const f = document.querySelector("#agLb .lightbox__fig");
        if (f) f.innerHTML = src ? `<img class="lightbox__img" src="${esc(src)}" alt="현장 사진"><p class="lightbox__cap">눌러서 닫기</p>` : `<p class="lightbox__cap">사진을 찾지 못했어요</p>`;
      } catch (e) { const f = document.querySelector("#agLb .lightbox__fig"); if (f) f.innerHTML = `<p class="lightbox__cap">사진을 불러오지 못했어요</p>`; }
    },
  };
})();
