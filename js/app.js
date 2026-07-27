/* =========================================================
   GARDEN — app / router / renderers
   ========================================================= */
(function () {
  "use strict";
  const D = window.DATA;
  const app = document.getElementById("app");
  const crumb = document.getElementById("crumb");
  let _booting = false; // 시트 최초 로딩 중 → 스켈레톤 표시

  /* ---------- helpers ---------- */
  const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const DIS_COLORS = {
    "발달장애": "var(--accent)", "자폐성장애": "var(--accent)", "지적장애": "var(--blue)",
    "정신장애": "var(--green)", "지체장애": "var(--violet)", "뇌병변장애": "#ff9f43",
    "청각장애": "var(--red)", "시각장애": "var(--amber)", "언어장애": "#26c6da",
    "신장장애": "#26c6da", "심장장애": "#e0729a", "간장애": "#e0729a", "비장애": "var(--slate)",
  };
  const disColor = (d) => DIS_COLORS[d] || "var(--violet)";

  /* 크루 요약 카드 (대시보드 · 크루 공용) */
  function crewStatusCard(title) {
    const crew = getCrew().filter((c) => c.status === "active");
    const total = crew.length;
    const dt = (c) => (c.disability == null ? "" : String(c.disability).trim());
    const disN = crew.filter((c) => { const d = dt(c); return d && d !== "비장애"; }).length;
    const nonN = crew.filter((c) => dt(c) === "비장애").length;
    const uncl = total - disN - nonN;
    const pct = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0);
    const segs = [
      { label: "장애", val: disN, color: "var(--accent)" },
      { label: "비장애", val: nonN, color: "var(--slate)" },
    ];
    if (uncl > 0) segs.push({ label: "미분류", val: uncl, color: "var(--line)" });
    const RC = 2 * Math.PI * 70, dTotal = total || 1;
    let off = 0;
    const rings = segs.map((s) => {
      const len = (s.val / dTotal) * RC;
      const seg = `<circle cx="95" cy="95" r="70" fill="none" stroke="${s.color}" stroke-width="20"
        stroke-dasharray="0 ${RC}" stroke-dashoffset="${-off}" data-len="${len}" transform="rotate(-90 95 95)"/>`;
      off += len; return seg;
    }).join("");
    const legend = segs.map((s) =>
      `<li class="dleg__row"><span class="dleg__dot" style="background:${s.color}"></span>
        <span class="dleg__label">${s.label}</span>
        <span class="dleg__val">${s.val}<small>명</small></span>
        <span class="dleg__pct">${pct(s.val)}%</span></li>`).join("");
    return `<div class="dash-card dash-card--donut">
      <div class="card-head"><h3>${title}</h3><span class="chip-mono">${total}명</span>
        <span class="asof" style="margin-left:auto">'26년 7월 기준</span></div>
      <div class="donut-wrap">
        <svg class="donut" viewBox="0 0 190 190">${rings}
          <text class="donut__num" x="95" y="92" text-anchor="middle">${total}</text>
          <text class="donut__unit" x="95" y="110" text-anchor="middle">근무 인원</text></svg>
        <ul class="dleg">${legend}</ul>
      </div></div>`;
  }
  function crewTypeCard() {
    const crew = getCrew().filter((c) => c.status === "active");
    const dt = (c) => (c.disability == null ? "" : String(c.disability).trim());
    const disList = crew.filter((c) => { const d = dt(c); return d && d !== "비장애"; });
    const typeMap = {};
    disList.forEach((c) => { const d = dt(c); typeMap[d] = (typeMap[d] || 0) + 1; });
    const types = Object.keys(typeMap).map((k) => [k, typeMap[k]]).sort((a, b) => b[1] - a[1]);
    const maxT = types.length ? types[0][1] : 1;
    const bars = types.length
      ? types.map(([name, val]) =>
          `<div class="tbar"><span class="tbar__label"><span class="gdot" style="background:${disColor(name)}"></span>${esc(name)}</span>
            <span class="tbar__track"><span class="tbar__fill" data-pct="${Math.round((val / maxT) * 100)}" style="background:${disColor(name)}"></span></span>
            <span class="tbar__val">${val}<small>명</small></span></div>`).join("")
      : `<p class="muted" style="margin:6px 0">장애 유형 데이터가 없습니다. 시트 <b>crew</b> 탭에 <b>disability</b> 컬럼을 채워주세요.</p>`;
    return `<div class="dash-card">
      <div class="card-head"><h3>장애유형별 분포</h3><span class="chip-mono">${disList.length}명</span></div>
      <div class="tbars">${bars}</div></div>`;
  }

  /* ===== 크루 로스터 상태 (localStorage 오버레이 + 시트 저장) ===== */
  const CREW_KEY = "garden-crew";
  let _crew = null, _pushCT = null;
  function normalizeCrew(arr) {
    return (arr || []).map((c) => ({
      name: c.name || "", role: c.role || "", store: c.store || "",
      status: c.status || "active", since: c.since || "", disability: c.disability || "",
      tags: Array.isArray(c.tags) ? c.tags : String(c.tags || "").split(",").map((s) => s.trim()).filter(Boolean),
      left: c.left || "", memo: c.memo || "",
    }));
  }
  function getCrew() {
    if (_crew) return _crew;
    try { const s = localStorage.getItem(CREW_KEY); if (s) _crew = normalizeCrew(JSON.parse(s)); } catch (e) {}
    if (!_crew) _crew = normalizeCrew(D.crew || []);
    return _crew;
  }
  function saveCrew() {
    try { localStorage.setItem(CREW_KEY, JSON.stringify(_crew)); } catch (e) {}
    pushCrewRemote();
  }
  function pushCrewRemote() {
    const url = (window.CONFIG && window.CONFIG.API_URL || "").trim();
    if (!url || !(window.CONFIG && window.CONFIG.WRITE_BACK) || !_crew) return;
    clearTimeout(_pushCT);
    _pushCT = setTimeout(() => {
      fetch(url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ type: "crew", data: _crew }) }).catch((e) => console.warn("[GARDEN] 크루 시트 저장 실패:", e));
    }, 700);
  }
  function reCrew() { app.innerHTML = views.crew(); }

  // 재직 기간: 입사일(YYYY-MM[-DD]) ~ (퇴사일 또는 오늘) → "N년 M개월"
  function tenure(since, end) {
    const p = (s) => { const m = String(s || "").match(/(\d{4})[-.\/\s]*(\d{1,2})?/); return m ? { y: +m[1], m: m[2] ? +m[2] : 1 } : null; };
    const a = p(since); if (!a) return "";
    const b = end ? p(end) : { y: _now.getFullYear(), m: _now.getMonth() + 1 };
    if (!b) return "";
    let months = (b.y - a.y) * 12 + (b.m - a.m);
    if (months < 0) return "";
    const yy = Math.floor(months / 12), mm = months % 12;
    return (yy ? yy + "년 " : "") + mm + "개월";
  }

  function crewModal() {
    return `<div class="gmodal" id="crewModal">
      <div class="gmodal__bd" onclick="GARDEN.crewAddClose()"></div>
      <div class="gmodal__card">
        <div class="gmodal__head"><h3>크루 등록</h3><button class="gmodal__x" onclick="GARDEN.crewAddClose()">×</button></div>
        <div class="gform">
          <label class="fld"><span>이름 *</span><input id="cf_name" placeholder="이름"/></label>
          <div class="fld-row">
            <label class="fld"><span>매장</span><input id="cf_store" placeholder="예: 카카오"/></label>
            <label class="fld"><span>구분</span><input id="cf_role" placeholder="예: 8h 가드너"/></label>
          </div>
          <div class="fld-row">
            <label class="fld"><span>입사일</span><input id="cf_since" placeholder="예: 2026-07"/></label>
            <label class="fld"><span>상태</span><select id="cf_status"><option value="active">재직</option><option value="leave">휴직</option><option value="out">퇴사</option></select></label>
          </div>
          <div class="fld-row">
            <label class="fld"><span>장애유형</span><input id="cf_dis" placeholder="예: 발달장애 · 비장애"/></label>
            <label class="fld"><span>태그</span><input id="cf_tags" placeholder="쉼표로 구분"/></label>
          </div>
          <label class="fld"><span>비고</span><input id="cf_memo" placeholder="메모(선택)"/></label>
        </div>
        <div class="gmodal__foot">
          <button class="btn btn--sm" onclick="GARDEN.crewAddClose()">취소</button>
          <button class="btn btn--primary btn--sm" onclick="GARDEN.crewAddSubmit()">등록</button>
        </div>
      </div></div>`;
  }

  function crewDetailModal(i) {
    const c = getCrew()[i];
    if (!c) return "";
    const st = (v) => (c.status === v ? "selected" : "");
    return `<div class="gmodal" id="crewDetailModal">
      <div class="gmodal__bd" onclick="GARDEN.crewDetailClose()"></div>
      <div class="gmodal__card">
        <div class="gmodal__head"><h3>크루 정보</h3><button class="gmodal__x" onclick="GARDEN.crewDetailClose()">×</button></div>
        <div class="gform">
          <label class="fld"><span>이름 *</span><input id="cd_name" value="${esc(c.name)}" placeholder="이름"/></label>
          <div class="fld-row">
            <label class="fld"><span>매장</span><input id="cd_store" value="${esc(c.store)}" placeholder="예: 카카오"/></label>
            <label class="fld"><span>구분</span><input id="cd_role" value="${esc(c.role)}" placeholder="예: 8h 가드너"/></label>
          </div>
          <div class="fld-row">
            <label class="fld"><span>입사일</span><input id="cd_since" value="${esc(c.since)}" placeholder="예: 2026-07"/></label>
            <label class="fld"><span>상태</span><select id="cd_status" onchange="GARDEN.crewDetailStatusChange(this)">
              <option value="active" ${st("active")}>재직</option>
              <option value="leave" ${st("leave")}>휴직</option>
              <option value="out" ${st("out")}>퇴사</option>
            </select></label>
          </div>
          <div class="fld-row">
            <label class="fld"><span>장애유형</span><input id="cd_dis" value="${esc(c.disability)}" placeholder="예: 발달장애 · 비장애"/></label>
            <label class="fld"><span>태그</span><input id="cd_tags" value="${esc((c.tags || []).join(", "))}" placeholder="쉼표로 구분"/></label>
          </div>
          <div class="fld-row">
            <label class="fld" id="cd_left_fld" style="${c.status === "out" ? "" : "display:none"}">
              <span>퇴사일</span><input id="cd_left" value="${esc(c.left)}" placeholder="예: 2026-07"/></label>
            <label class="fld"><span>비고</span><input id="cd_memo" value="${esc(c.memo)}" placeholder="메모(선택)"/></label>
          </div>
        </div>
        <div class="gmodal__foot">
          <button class="btn btn--sm btn--danger" onclick="GARDEN.crewDetailDelete(${i})">삭제</button>
          <span class="gmodal__spacer"></span>
          <button class="btn btn--sm" onclick="GARDEN.crewDetailClose()">취소</button>
          <button class="btn btn--primary btn--sm" onclick="GARDEN.crewDetailSave(${i})">저장</button>
        </div>
      </div></div>`;
  }

  /* ===== 각층 현황 (구글 드라이브) ===== */
  const FLOOR_PARENT = "1JF5VTpU-ldB2jbIZlQUBlPXYof56Bp1s";
  const FLOORS_KEY = "garden-floors-cache";
  let _floorsCache = null;
  function readFloorsCache() {
    try { const s = localStorage.getItem(FLOORS_KEY); if (s) { const o = JSON.parse(s); if (o && Array.isArray(o.floors)) return o.floors; } } catch (e) {}
    return null;
  }
  function writeFloorsCache(floors) {
    try { localStorage.setItem(FLOORS_KEY, JSON.stringify({ t: Date.now(), floors })); } catch (e) {}
  }

  function floorsRender(floors) {
    if (!floors || !floors.length) return floorsEmpty("아직 등록된 층 폴더가 없습니다.");
    const rows = floors.map((f, fi) => {
      const thumbs = (f.photos || []).slice(0, 12).map((p, pi) =>
        `<button class="flb-thumb" title="${esc(p.name)}" style="background-image:url('${p.thumb}')"
          onclick="GARDEN.flOpen(${fi},${pi})"></button>`).join("");
      const body = f.count
        ? `<div class="flb-thumbs">${thumbs}${f.count > 12 ? `<span class="flb-more">+${f.count - 12}</span>` : ""}</div>`
        : `<div class="flb-thumbs"><a class="flb-empty" href="${f.folderUrl}" target="_blank" rel="noopener">＋ 사진 추가</a></div>`;
      const date = f.photos && f.photos[0] ? f.photos[0].updated : "—";
      return `<div class="flb-row">
        <div class="flb-head"><span class="flb-name">${esc(f.name)}</span><span class="flb-count">${f.count}</span></div>
        ${body}
        <div class="flb-meta"><span class="flb-date">${esc(date)}</span>
          <a class="flb-folder" href="${f.folderUrl}" target="_blank" rel="noopener">🔗 폴더</a></div>
      </div>`;
    }).join("");
    return `<div class="fl-board">${rows}</div>`;
  }
  function floorsSkeleton() {
    return `<div class="fl-board">` + Array.from({ length: 6 }).map(() =>
      `<div class="flb-row"><div class="flb-head"><span class="fl-sk fl-sk--name"></span></div>
        <div class="fl-sk fl-sk--strip"></div><div></div></div>`).join("") + `</div>`;
  }
  function floorsEmpty(msg) {
    return `<div class="fl-empty"><p>${esc(msg)}</p>
      <a class="btn btn--sm" href="https://drive.google.com/drive/folders/${FLOOR_PARENT}" target="_blank" rel="noopener">🔗 드라이브 폴더 열기</a></div>`;
  }

  /* 라이트박스 팝업 */
  let _lb = { fi: 0, pi: 0 };
  function flPhotos(fi) { return (_floorsCache && _floorsCache[fi] && _floorsCache[fi].photos) || []; }
  function flKey(e) {
    if (e.key === "Escape") GARDEN.flClose();
    else if (e.key === "ArrowLeft") GARDEN.flNav(-1);
    else if (e.key === "ArrowRight") GARDEN.flNav(1);
  }
  function flShow() {
    const floor = _floorsCache && _floorsCache[_lb.fi];
    const ph = flPhotos(_lb.fi);
    const p = ph[_lb.pi];
    if (!floor || !p) return;
    let elm = document.getElementById("lightbox");
    if (!elm) {
      elm = document.createElement("div");
      elm.id = "lightbox"; elm.className = "lightbox";
      document.body.appendChild(elm);
      document.addEventListener("keydown", flKey);
    }
    const big = "https://drive.google.com/thumbnail?id=" + p.id + "&sz=w1600";
    const nav = ph.length > 1;
    elm.innerHTML = `
      <div class="lightbox__backdrop" onclick="GARDEN.flClose()"></div>
      <button class="lightbox__close" onclick="GARDEN.flClose()" title="닫기 (Esc)">×</button>
      ${nav ? `<button class="lightbox__nav lightbox__nav--prev" onclick="GARDEN.flNav(-1)" title="이전">‹</button>` : ""}
      <figure class="lightbox__fig">
        <img class="lightbox__img" src="${big}" alt="${esc(p.name)}"/>
        <figcaption class="lightbox__cap"><b>${esc(floor.name)}</b> · ${esc(p.name)}
          <span>${esc(p.updated)} · ${_lb.pi + 1}/${ph.length}</span>
          <a href="${p.view}" target="_blank" rel="noopener">🔗 원본 열기</a></figcaption>
      </figure>
      ${nav ? `<button class="lightbox__nav lightbox__nav--next" onclick="GARDEN.flNav(1)" title="다음">›</button>` : ""}`;
  }

  /* ===== 산업안전보건 (정기회의 · 정기 안전점검 — 시트 / 안전매뉴얼 — 드라이브) ===== */
  let _safetyCache = null; // { manual:[], folderUrl:"" }
  const SAFETY_MANUAL_LIMIT = 3;
  const SAFETY_BOARD_LIMIT = 3;
  // 목록별 "더보기" 펼침 상태
  let _safetyExpand = { manual: false, meetings: false, checks: false, incidents: false };
  function moreToggleBtn(key, total, limit) {
    if (total <= limit) return "";
    const expanded = !!_safetyExpand[key];
    return `<button class="board-more" onclick="GARDEN.safetyToggle('${key}')">${expanded ? "접기" : `더보기 (${total - limit}건 더)`}</button>`;
  }
  const extBadge = (name, mime) => {
    const m = String(name || "").match(/\.([a-zA-Z0-9]+)$/);
    if (m) return m[1].toUpperCase();
    mime = mime || "";
    if (mime.indexOf("pdf") >= 0) return "PDF";
    if (mime.indexOf("image/") === 0) return "IMG";
    if (mime.indexOf("spreadsheet") >= 0) return "XLS";
    if (mime.indexOf("document") >= 0 || mime.indexOf("word") >= 0) return "DOC";
    return "FILE";
  };
  function safetyManualBody(files, folderUrl) {
    if (!files || !files.length) {
      return `<div class="sf-empty">
        <p>아직 등록된 안전매뉴얼이 없습니다. 드라이브 폴더에 파일을 올리면 게시판에 자동으로 추가됩니다.</p>
        <a class="btn btn--primary btn--sm" href="${folderUrl}" target="_blank" rel="noopener">＋ 매뉴얼 업로드</a>
      </div>`;
    }
    const shown = _safetyExpand.manual ? files : files.slice(0, SAFETY_MANUAL_LIMIT);
    const rows = shown.map((f) => `<div class="sf-row">
      <span class="sf-ext">${extBadge(f.name, f.mimeType)}</span>
      <span class="sf-name" title="${esc(f.name)}">${esc(f.name)}</span>
      <span class="sf-date">${esc(f.updated)}</span>
      <a class="sf-open" href="${f.view}" target="_blank" rel="noopener">🔗 열기</a>
    </div>`).join("");
    return `<div class="sf-list">${rows}</div>${moreToggleBtn("manual", files.length, SAFETY_MANUAL_LIMIT)}`;
  }
  function safetySkeleton() {
    return `<div class="sf-list">` + Array.from({ length: 2 }).map(() =>
      `<div class="sf-row"><span class="fl-sk fl-sk--name"></span><div class="fl-sk fl-sk--strip" style="flex:1;margin:0 12px"></div></div>`).join("") + `</div>`;
  }

  /* 정기회의 (게시판) */
  const SAFETY_KEY = "garden-safety-meetings";
  let _safetyMeetings = null;
  function normalizeSafetyMeetings(arr) {
    return (arr || []).map((m) => ({ date: m.date || "", org: m.org || "", title: m.title || "", attendees: m.attendees || "", link: m.link || "" }));
  }
  function getSafetyMeetings() {
    if (_safetyMeetings) return _safetyMeetings;
    try { const s = localStorage.getItem(SAFETY_KEY); if (s) _safetyMeetings = normalizeSafetyMeetings(JSON.parse(s)); } catch (e) {}
    if (!_safetyMeetings) _safetyMeetings = normalizeSafetyMeetings(D.safetyMeetings || []);
    return _safetyMeetings;
  }
  function saveSafetyMeetings() {
    try { localStorage.setItem(SAFETY_KEY, JSON.stringify(_safetyMeetings)); } catch (e) {}
    pushSafetyMeetingsRemote();
  }
  let _pushSMT = null;
  function pushSafetyMeetingsRemote() {
    const url = (window.CONFIG && window.CONFIG.API_URL || "").trim();
    if (!url || !(window.CONFIG && window.CONFIG.WRITE_BACK) || !_safetyMeetings) return;
    clearTimeout(_pushSMT);
    _pushSMT = setTimeout(() => {
      fetch(url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ type: "safetyMeetings", data: _safetyMeetings }) })
        .catch((e) => console.warn("[GARDEN] 산업안전보건 회의기록 저장 실패:", e));
    }, 700);
  }
  function reSafety() { app.innerHTML = views.safety(); }

  function safetyMeetingCard(m, i) {
    const [mm, dd] = (m.date || "").split("-").slice(1);
    return `<div class="tf-card">
      <div class="tf-date"><b>${mm && dd ? `${mm}/${dd}` : "—"}</b><span>${(m.date || "").slice(0, 4)}</span></div>
      <div class="tf-body">
        ${m.org ? `<span class="tf-tag">${esc(m.org)}</span>` : ""}${m.link ? `<a class="tf-link" href="${esc(m.link)}" target="_blank" rel="noopener" title="자료 링크 열기">🔗</a>` : ""}
        <p class="tf-title">${esc(m.title) || "제목 없음"}</p>
        ${m.attendees ? `<p class="tf-attendees">참석자 · ${esc(m.attendees)}</p>` : ""}
      </div>
      <div class="tf-acts">
        <button class="btn btn--sm" onclick="GARDEN.safetyMeetingOpen(${i})">수정</button>
        <button class="btn btn--sm btn--danger" onclick="GARDEN.safetyMeetingQuickDelete(${i})">삭제</button>
      </div>
    </div>`;
  }
  function safetyMeetingModal(i) {
    const isNew = i == null;
    const m = isNew ? { date: "", org: "", title: "", attendees: "", link: "" } : getSafetyMeetings()[i];
    if (!m) return "";
    return `<div class="gmodal" id="safetyMeetingModal">
      <div class="gmodal__bd" onclick="GARDEN.safetyMeetingClose()"></div>
      <div class="gmodal__card">
        <div class="gmodal__head"><h3>${isNew ? "회의 기록 추가" : "회의 기록 수정"}</h3>
          <button class="gmodal__x" onclick="GARDEN.safetyMeetingClose()">×</button></div>
        <div class="gform">
          <div class="fld-row">
            <label class="fld"><span>회의일</span><input id="sm_date" value="${esc(m.date)}" placeholder="예: 2026-07-21"/></label>
            <label class="fld"><span>주관/협의체</span><input id="sm_org" value="${esc(m.org)}" placeholder="예: 카카오안전보건협의체"/></label>
          </div>
          <label class="fld"><span>안건</span><input id="sm_title" value="${esc(m.title)}" placeholder="예: 4월 안전보건 이슈사항 공유"/></label>
          <label class="fld"><span>참석자</span><input id="sm_attendees" value="${esc(m.attendees)}" placeholder="쉼표로 구분 (예: 제이미, 데이지)"/></label>
          <label class="fld"><span>자료 링크</span><input id="sm_link" value="${esc(m.link)}" placeholder="구글 드라이브 · 문서 URL(선택)"/></label>
        </div>
        <div class="gmodal__foot">
          ${isNew ? "" : `<button class="btn btn--sm btn--danger" onclick="GARDEN.safetyMeetingDelete(${i})">삭제</button><span class="gmodal__spacer"></span>`}
          <button class="btn btn--sm" onclick="GARDEN.safetyMeetingClose()">취소</button>
          <button class="btn btn--primary btn--sm" onclick="GARDEN.safetyMeetingSave(${isNew ? "null" : i})">저장</button>
        </div>
      </div></div>`;
  }

  /* 정기 안전점검 (게시판) */
  const CHECK_KEY = "garden-safety-checks";
  const CHECK_RESULTS = { "양호": "var(--green)", "일부개선필요": "var(--amber)", "미흡": "var(--red)" };
  let _safetyChecks = null;
  function normalizeSafetyChecks(arr) {
    return (arr || []).map((c) => ({
      title: c.title || "", date: c.date || "", org: c.org || "", result: c.result || "양호",
      action: c.action || "", sentDate: c.sentDate || "", driveUrl: c.driveUrl || "", done: !!c.done,
    }));
  }
  function getSafetyChecks() {
    if (_safetyChecks) return _safetyChecks;
    try { const s = localStorage.getItem(CHECK_KEY); if (s) _safetyChecks = normalizeSafetyChecks(JSON.parse(s)); } catch (e) {}
    if (!_safetyChecks) _safetyChecks = normalizeSafetyChecks(D.safetyChecks || []);
    return _safetyChecks;
  }
  function saveSafetyChecks() {
    try { localStorage.setItem(CHECK_KEY, JSON.stringify(_safetyChecks)); } catch (e) {}
    pushSafetyChecksRemote();
  }
  let _pushSCT = null;
  function pushSafetyChecksRemote() {
    const url = (window.CONFIG && window.CONFIG.API_URL || "").trim();
    if (!url || !(window.CONFIG && window.CONFIG.WRITE_BACK) || !_safetyChecks) return;
    clearTimeout(_pushSCT);
    _pushSCT = setTimeout(() => {
      fetch(url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ type: "safetyChecks", data: _safetyChecks }) })
        .catch((e) => console.warn("[GARDEN] 산업안전보건 점검기록 저장 실패:", e));
    }, 700);
  }

  function safetyCheckCard(c, i) {
    const sent = c.sentDate
      ? `<span class="chk-sent chk-sent--ok">${esc(c.sentDate)}</span>`
      : `<span class="chk-sent chk-sent--warn">미송부</span>`;
    const driveBtn = c.driveUrl
      ? `<a class="btn btn--sm" href="${esc(c.driveUrl)}" target="_blank" rel="noopener">🔗 자료 링크</a>`
      : `<span class="muted" style="font-size:11px">링크 없음</span>`;
    return `<div class="chk-card">
      <div class="chk-head">
        <p class="chk-title">${esc(c.title) || "제목 없음"}</p>
        <span class="badge ${c.done ? "badge--active" : "badge--leave"}">${c.done ? "완료" : "진행중"}</span>
        <button class="btn btn--sm" onclick="GARDEN.safetyCheckOpen(${i})">수정</button>
        <button class="btn btn--sm btn--danger" onclick="GARDEN.safetyCheckQuickDelete(${i})">삭제</button>
      </div>
      <div class="chk-grid">
        <div><span class="chk-label">점검일</span><b>${esc(c.date) || "—"}</b></div>
        <div><span class="chk-label">점검지 / 기관</span><b>${esc(c.org) || "—"}</b></div>
        <div><span class="chk-label">점검 결과</span><b style="color:${CHECK_RESULTS[c.result] || "var(--ink)"}">${esc(c.result) || "—"}</b></div>
      </div>
      <div class="chk-row"><span class="chk-label">개선 사항</span><p>${esc(c.action) || "해당 없음"}</p></div>
      <div class="chk-row chk-row--sent"><span class="chk-label">개선자료 송부일</span>${sent}${driveBtn}</div>
    </div>`;
  }
  function safetyCheckModal(i) {
    const isNew = i == null;
    const c = isNew ? { title: "", date: "", org: "", result: "양호", action: "", sentDate: "", driveUrl: "", done: false } : getSafetyChecks()[i];
    if (!c) return "";
    const opt = (v) => `<option value="${v}" ${c.result === v ? "selected" : ""}>${v}</option>`;
    return `<div class="gmodal" id="safetyCheckModal">
      <div class="gmodal__bd" onclick="GARDEN.safetyCheckClose()"></div>
      <div class="gmodal__card">
        <div class="gmodal__head"><h3>${isNew ? "점검 기록 추가" : "점검 기록 수정"}</h3>
          <button class="gmodal__x" onclick="GARDEN.safetyCheckClose()">×</button></div>
        <div class="gform">
          <label class="fld"><span>제목</span><input id="chk_title" value="${esc(c.title)}" placeholder="예: 카카오안전보건협의체"/></label>
          <div class="fld-row">
            <label class="fld"><span>점검일</span><input id="chk_date" value="${esc(c.date)}" placeholder="예: 2026-06-08"/></label>
            <label class="fld"><span>점검지 / 기관</span><input id="chk_org" value="${esc(c.org)}" placeholder="예: 카카오 켄드릭"/></label>
          </div>
          <div class="fld-row">
            <label class="fld"><span>점검 결과</span><select id="chk_result">${opt("양호")}${opt("일부개선필요")}${opt("미흡")}</select></label>
            <label class="fld"><span>진행 상태</span><select id="chk_done">
              <option value="1" ${c.done ? "selected" : ""}>완료</option>
              <option value="0" ${!c.done ? "selected" : ""}>진행중</option>
            </select></label>
          </div>
          <label class="fld"><span>개선 사항</span><input id="chk_action" value="${esc(c.action)}" placeholder="예: 안전관련 사이니지 정리 및 안전장비 관리 개선"/></label>
          <div class="fld-row">
            <label class="fld"><span>개선자료 송부일</span><input id="chk_sent" value="${esc(c.sentDate)}" placeholder="비우면 미송부로 표시"/></label>
            <label class="fld"><span>드라이브 링크</span><input id="chk_drive" value="${esc(c.driveUrl)}" placeholder="구글 드라이브 공유 링크(선택)"/></label>
          </div>
        </div>
        <div class="gmodal__foot">
          ${isNew ? "" : `<button class="btn btn--sm btn--danger" onclick="GARDEN.safetyCheckDelete(${i})">삭제</button><span class="gmodal__spacer"></span>`}
          <button class="btn btn--sm" onclick="GARDEN.safetyCheckClose()">취소</button>
          <button class="btn btn--primary btn--sm" onclick="GARDEN.safetyCheckSave(${isNew ? "null" : i})">저장</button>
        </div>
      </div></div>`;
  }

  /* ===== 사고 대응 이력 (게시판 · 누적) ===== */
  const SIC_KEY = "garden-safety-incidents";
  const INCIDENT_TYPES = ["안전사고", "아차사고", "화재", "설비사고", "질병", "기타"];
  const INCIDENT_STATUS = ["접수", "조사중", "조치중", "완료"];
  let _safetyIncidents = null;
  function normalizeIncidents(arr) {
    return (arr || []).map((x) => ({
      date: x.date || "", type: x.type || "안전사고", place: x.place || "",
      status: x.status || "접수", resolvedDate: x.resolvedDate || "",
      content: x.content || "", action: x.action || "", memo: x.memo || "",
    }));
  }
  function getIncidents() {
    if (_safetyIncidents) return _safetyIncidents;
    try { const s = localStorage.getItem(SIC_KEY); if (s) _safetyIncidents = normalizeIncidents(JSON.parse(s)); } catch (e) {}
    if (!_safetyIncidents) _safetyIncidents = normalizeIncidents(D.safetyIncidents || []);
    return _safetyIncidents;
  }
  function saveIncidents() {
    try { localStorage.setItem(SIC_KEY, JSON.stringify(_safetyIncidents)); } catch (e) {}
    pushIncidentsRemote();
  }
  let _pushSICT = null;
  function pushIncidentsRemote() {
    const url = (window.CONFIG && window.CONFIG.API_URL || "").trim();
    if (!url || !(window.CONFIG && window.CONFIG.WRITE_BACK) || !_safetyIncidents) return;
    clearTimeout(_pushSICT);
    _pushSICT = setTimeout(() => {
      fetch(url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ type: "safetyIncidents", data: _safetyIncidents }) })
        .catch((e) => console.warn("[GARDEN] 사고 이력 저장 실패:", e));
    }, 700);
  }

  function incidentCard(x, i) {
    const done = x.status === "완료";
    return `<div class="chk-card">
      <div class="chk-head">
        <p class="chk-title">${esc(x.type)}${x.date ? ` · ${esc(x.date)}` : ""}</p>
        <span class="iss-tag ${done ? "iss-tag--done" : ""}">${esc(x.status)}</span>
        <button class="btn btn--sm" onclick="GARDEN.incidentOpen(${i})">수정</button>
        <button class="btn btn--sm btn--danger" onclick="GARDEN.incidentQuickDelete(${i})">삭제</button>
      </div>
      <div class="chk-grid">
        <div><span class="chk-label">발생일</span><b>${esc(x.date) || "—"}</b></div>
        <div><span class="chk-label">발생 장소</span><b>${esc(x.place) || "—"}</b></div>
        <div><span class="chk-label">해결일</span><b>${esc(x.resolvedDate) || "—"}</b></div>
      </div>
      <div class="chk-row"><span class="chk-label">사고 내용</span><p>${esc(x.content) || "—"}</p></div>
      ${x.action ? `<div class="chk-row"><span class="chk-label">조치 내용</span><p>${esc(x.action)}</p></div>` : ""}
      ${x.memo ? `<div class="chk-row"><span class="chk-label">비고</span><p>${esc(x.memo)}</p></div>` : ""}
    </div>`;
  }
  function incidentModal(i) {
    const isNew = i == null;
    const x = isNew ? { date: "", type: "안전사고", place: "", status: "접수", resolvedDate: "", content: "", action: "", memo: "" } : getIncidents()[i];
    if (!x) return "";
    const typeOpts = INCIDENT_TYPES.map((t) => `<option ${x.type === t ? "selected" : ""}>${t}</option>`).join("");
    const statusOpts = INCIDENT_STATUS.map((s) => `<option ${x.status === s ? "selected" : ""}>${s}</option>`).join("");
    return `<div class="gmodal" id="incidentModal">
      <div class="gmodal__bd" onclick="GARDEN.incidentClose()"></div>
      <div class="gmodal__card gmodal__card--wide">
        <div class="gmodal__head"><h3>${isNew ? "사고 이력 등록" : "사고 이력 수정"}</h3>
          <button class="gmodal__x" onclick="GARDEN.incidentClose()">×</button></div>
        <div class="gform">
          <div class="fld-row fld-row--3">
            <label class="fld"><span>발생일 *</span><input id="sic_date" type="date" value="${esc(x.date)}"/></label>
            <label class="fld"><span>사고 유형 *</span><select id="sic_type">${typeOpts}</select></label>
            <label class="fld"><span>발생 장소</span><input id="sic_place" value="${esc(x.place)}" placeholder="예: 4층 북아지트"/></label>
          </div>
          <div class="fld-row">
            <label class="fld"><span>처리 상태</span><select id="sic_status">${statusOpts}</select></label>
            <label class="fld"><span>해결일</span><input id="sic_resolved" type="date" value="${esc(x.resolvedDate)}"/></label>
          </div>
          <label class="fld"><span>사고 내용 *</span><textarea id="sic_content" rows="3" placeholder="언제·어디서·무슨 일이 있었는지">${esc(x.content)}</textarea></label>
          <label class="fld"><span>조치 내용</span><textarea id="sic_action" rows="2" placeholder="어떻게 대응했는지">${esc(x.action)}</textarea></label>
          <label class="fld"><span>비고</span><input id="sic_memo" value="${esc(x.memo)}" placeholder="기타 특이사항(선택)"/></label>
        </div>
        <div class="gmodal__foot">
          ${isNew ? "" : `<button class="btn btn--sm btn--danger" onclick="GARDEN.incidentDelete(${i})">삭제</button><span class="gmodal__spacer"></span>`}
          <button class="btn btn--sm" onclick="GARDEN.incidentClose()">취소</button>
          <button class="btn btn--primary btn--sm" onclick="GARDEN.incidentSave(${isNew ? "null" : i})">저장</button>
        </div>
      </div></div>`;
  }

  /* ===== 식물 상태 점검 ===== */
  const PL_KEY = "garden-plants";
  const PLANT_GRADES = ["A", "B", "C", "D"];
  const GRADE_COLORS = { A: "var(--green)", B: "var(--blue)", C: "var(--amber)", D: "var(--red)" };
  let _plants = null, _plantTab = "matrix", _plantRound = null, _plantAdmin = false;

  function getPlants() {
    if (_plants) return _plants;
    try { const s = localStorage.getItem(PL_KEY); if (s) _plants = JSON.parse(s); } catch (e) {}
    if (!_plants) {
      const hasSheet = D.plants && (Object.keys(D.plants.grades || {}).length || Object.keys(D.plants.issues || {}).length || (D.plants.removed || []).length);
      if (hasSheet) {
        _plants = JSON.parse(JSON.stringify(D.plants));   // 시트 데이터
      } else {
        _plants = { grades: JSON.parse(JSON.stringify(D.plantGrades || {})), issues: {}, removed: [] }; // 시드
      }
    }
    _plants.grades = _plants.grades || {};
    _plants.issues = _plants.issues || {};
    _plants.removed = _plants.removed || [];
    _plants.added = _plants.added || [];
    return _plants;
  }
  // 실제 점검 대상 구역 = 기본 설정 + 관리자 추가 − 관리자 삭제
  function activeZones() {
    const p = getPlants();
    const removed = new Set(p.removed || []);
    const map = new Map();
    (D.plantZones || []).forEach((g) => map.set(g.area, g.zones.slice()));
    (p.added || []).forEach((a) => {
      if (!a || !a.zone) return;
      const area = a.area || "추가 구역";
      if (!map.has(area)) map.set(area, []);
      const zs = map.get(area);
      if (zs.indexOf(a.zone) < 0) zs.push(a.zone);
    });
    const out = [];
    map.forEach((zones, area) => {
      const filtered = zones.filter((z) => !removed.has(z));
      if (filtered.length) out.push({ area, zones: filtered });
    });
    return out;
  }
  function savePlants() {
    try { localStorage.setItem(PL_KEY, JSON.stringify(_plants)); } catch (e) {}
    pushPlantsRemote();
  }
  let _pushPT = null;
  function pushPlantsRemote() {
    const url = (window.CONFIG && window.CONFIG.API_URL || "").trim();
    if (!url || !(window.CONFIG && window.CONFIG.WRITE_BACK) || !_plants) return;
    clearTimeout(_pushPT);
    _pushPT = setTimeout(() => {
      fetch(url, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ type: "plants", data: _plants }),
      }).catch((e) => console.warn("[GARDEN] 식물점검 시트 저장 실패:", e));
    }, 700);
  }
  function gradeOf(z, r) { const p = getPlants(); return (p.grades[z] && p.grades[z][r]) || ""; }
  function issueOf(z, r) { const p = getPlants(); return (p.issues[z] && p.issues[z][r]) || ""; }
  function curRound() {
    if (_plantRound) return _plantRound;
    const rounds = D.plantRounds || [];
    const mk = (_now.getMonth() + 1) + "월";
    _plantRound = rounds.indexOf(mk) >= 0 ? mk : (rounds[rounds.length - 1] || "");
    return _plantRound;
  }
  function rePlants() { app.innerHTML = views.plants(); }

  function plantInputBody(round) {
    return activeZones().map((g) => {
      const rows = g.zones.map((z) => {
        const cur = gradeOf(z, round);
        const segs = PLANT_GRADES.map((gr) =>
          `<button class="pgrade ${cur === gr ? "is-on" : ""}" style="--gc:${GRADE_COLORS[gr]}"
            onclick="GARDEN.plantGrade('${esc(z)}','${round}','${gr}')">${gr}</button>`).join("");
        const clr = `<button class="pgrade pgrade--clr ${!cur ? "is-on" : ""}" title="미점검"
          onclick="GARDEN.plantGrade('${esc(z)}','${round}','')">—</button>`;
        return `<div class="prow prow--admin">
          <span class="prow__z">${esc(z)}</span>
          <span class="pgrades">${segs}${clr}</span>
          <input class="prow__issue" placeholder="이슈 메모 (선택)" value="${esc(issueOf(z, round))}"
            onchange="GARDEN.plantIssue('${esc(z)}','${round}',this.value)"/>
          <button class="prow__del" title="구역 삭제" onclick="GARDEN.plantZoneDelete('${esc(z)}')">×</button>
        </div>`;
      }).join("");
      const gdone = g.zones.filter((z) => gradeOf(z, round)).length;
      return `<div class="pgroup">
        <div class="pgroup__head"><span class="pgroup__name">${esc(g.area)}</span>
          <span class="pgroup__n">${gdone} / ${g.zones.length}</span></div>
        ${rows}
        <button class="prow-add" onclick="GARDEN.plantZoneAdd('${esc(g.area)}')">＋ ${esc(g.area)} 구역 추가</button>
      </div>`;
    }).join("");
  }
  function plantMatrixBody() {
    const rounds = D.plantRounds || [];
    const cr = curRound();
    const head = `<th class="pm-z">구역</th>` + rounds.map((r) =>
      `<th class="pm-r ${r === cr ? "is-cur" : ""}">${r}</th>`).join("");
    const body = activeZones().map((g) => {
      const sec = `<tr class="pm-sec"><td colspan="${rounds.length + 1}">${esc(g.area)}</td></tr>`;
      const rows = g.zones.map((z) => {
        const cells = rounds.map((r) => {
          const gr = gradeOf(z, r);
          return `<td class="pm-cell ${r === cr ? "is-cur" : ""}">${gr
            ? `<span class="pgrade-dot" style="--gc:${GRADE_COLORS[gr]}">${gr}</span>`
            : '<span class="muted">—</span>'}</td>`;
        }).join("");
        return `<tr><td class="pm-z">${esc(z)}</td>${cells}</tr>`;
      }).join("");
      return sec + rows;
    }).join("");
    return `<div class="table-wrap"><table class="grid-table pm-table">
      <thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }
  function plantStatsBody(round) {
    const allZones = activeZones().flatMap((g) => g.zones);
    const counts = { A: 0, B: 0, C: 0, D: 0, none: 0 };
    allZones.forEach((z) => { const gr = gradeOf(z, round); if (gr) counts[gr] = (counts[gr] || 0) + 1; else counts.none++; });
    const cards = PLANT_GRADES.map((gr) =>
      `<div class="pstat" style="--gc:${GRADE_COLORS[gr]}"><div class="pstat__g">${gr}</div>
        <div class="pstat__n">${counts[gr] || 0}<small>개</small></div></div>`).join("")
      + `<div class="pstat pstat--none"><div class="pstat__g">미점검</div>
        <div class="pstat__n">${counts.none}<small>개</small></div></div>`;
    const issues = [];
    allZones.forEach((z) => { const t = issueOf(z, round); if (t) issues.push({ z, t, g: gradeOf(z, round) }); });
    const issueHtml = issues.length
      ? issues.map((i) => `<div class="pissue"><span class="pgrade-dot" style="--gc:${GRADE_COLORS[i.g] || "var(--slate)"}">${i.g || "—"}</span>
          <b>${esc(i.z)}</b><span>${esc(i.t)}</span></div>`).join("")
      : `<p class="muted" style="margin:6px 0">기록된 이슈가 없습니다.</p>`;
    return `<div class="pstats">${cards}</div>
      <div class="dash-card" style="margin-top:16px">
        <div class="card-head"><h3>이슈 기록</h3><span class="chip-mono">${issues.length}건</span></div>
        ${issueHtml}</div>`;
  }
  function plantAdminModal() {
    return `<div class="gmodal" id="plantAdminModal">
      <div class="gmodal__bd" onclick="GARDEN.plantAdminClose()"></div>
      <div class="gmodal__card" style="max-width:340px">
        <div class="gmodal__head"><h3>관리자 인증</h3><button class="gmodal__x" onclick="GARDEN.plantAdminClose()">×</button></div>
        <div class="gform">
          <label class="fld"><span>관리자 비밀번호 (4자리)</span>
            <input id="plant_pw" class="plant-pw" type="password" inputmode="numeric" maxlength="4" placeholder="••••"
              autocomplete="off" onkeydown="if(event.key==='Enter')GARDEN.plantAdminSubmit()"/></label>
          <p class="edu-hint">점검 입력·구역 삭제는 <b>관리자</b>만 가능합니다.<br>현황 매트릭스·통계 요약은 누구나 조회할 수 있어요.</p>
        </div>
        <div class="gmodal__foot">
          <button class="btn btn--sm" onclick="GARDEN.plantAdminClose()">취소</button>
          <button class="btn btn--primary btn--sm" onclick="GARDEN.plantAdminSubmit()">확인</button>
        </div>
      </div></div>`;
  }
  /* ===== 식물 이슈 관리 (칸반 · 게시판 · 상세) ===== */
  const PI_KEY = "garden-plant-issues";
  const ISS_STATUS = ["접수", "확인중", "조치중", "관찰중", "완료"];
  const ISS_URGENCY = ["일반", "주의", "긴급"];
  const ISS_BUILDINGS = ["A동", "B동", "공용부", "외부"];
  const ISS_CATEGORIES = ["미화 관련", "유지관리 관련", "병해충", "관수/급수", "시설/환경", "기타"];
  const ISSUE_DRIVE_URL = "https://drive.google.com/drive/folders/1h4a18kLTyOhLhg0FMWOUaJLtGR6R8gPr";
  let _issues = null, _issueQuery = "";
  let _issuePeriodMode = "year", _issueYear = new Date().getFullYear(), _issueMonth = new Date().getMonth() + 1;

  function normalizeIssues(arr) {
    return (arr || []).map((x) => ({
      date: x.date || "", building: x.building || "A동", location: x.location || "",
      category: x.category || "미화 관련", detail: x.detail || "", species: x.species || "",
      urgency: x.urgency || "일반", status: x.status || "접수", assignee: x.assignee || "",
      action: x.action || "", photoUrl: x.photoUrl || "", recur: !!x.recur,
      doneAt: x.doneAt || "", memo: x.memo || "",
    }));
  }
  function getIssues() {
    if (_issues) return _issues;
    try { const s = localStorage.getItem(PI_KEY); if (s) _issues = normalizeIssues(JSON.parse(s)); } catch (e) {}
    if (!_issues) _issues = normalizeIssues(D.plantIssues || []);
    return _issues;
  }
  function saveIssues() {
    try { localStorage.setItem(PI_KEY, JSON.stringify(_issues)); } catch (e) {}
    pushIssuesRemote();
  }
  let _pushIT = null;
  function pushIssuesRemote() {
    const url = (window.CONFIG && window.CONFIG.API_URL || "").trim();
    if (!url || !(window.CONFIG && window.CONFIG.WRITE_BACK) || !_issues) return;
    clearTimeout(_pushIT);
    _pushIT = setTimeout(() => {
      fetch(url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ type: "plantIssues", data: _issues }) })
        .catch((e) => console.warn("[GARDEN] 식물 이슈 저장 실패:", e));
    }, 700);
  }
  function reIssues() { app.innerHTML = views.issues(); }
  function issueTodayStr() { return `${_now.getFullYear()}-${_pad(_now.getMonth() + 1)}-${_pad(_now.getDate())}`; }
  function issueInPeriod(x) {
    const d = String(x.date || "");
    if (_issuePeriodMode === "year") return d.slice(0, 4) === String(_issueYear);
    return d.slice(0, 7) === `${_issueYear}-${_pad(_issueMonth)}`;
  }
  function issueMatch(x) {
    if (!issueInPeriod(x)) return false;
    if (_issueQuery) {
      const hay = [x.date, x.building, x.location, x.category, x.detail, x.species, x.assignee, x.action, x.memo]
        .join(" ").toLowerCase();
      if (!hay.includes(_issueQuery)) return false;
    }
    return true;
  }
  const issTag = (t) => `<span class="iss-tag">${esc(t)}</span>`;
  const issUrgText = (u) => `<span class="iss-urgtext" data-u="${esc(u)}">${esc(u)}</span>`;

  function issueList(withIdx) {
    if (!withIdx.length) return `<div class="iss-empty"><p>해당 기간에 등록된 이슈가 없습니다.</p></div>`;
    const sorted = withIdx.slice().sort((a, b) => (a.x.date < b.x.date ? 1 : -1));
    const rows = sorted.map(({ x, i }) => `<tr class="${x.status === "완료" ? "is-done" : ""}" onclick="GARDEN.issueOpen(${i})">
      <td class="mono">${esc(x.date) || "—"}</td>
      <td>${esc(x.building)}</td>
      <td>${esc(x.location) || "—"}</td>
      <td>${esc(x.category)}</td>
      <td class="iss-td-title">${esc(x.detail) || "—"}${x.recur ? ` <span class="iss-recur-sm">반복</span>` : ""}</td>
      <td><span class="iss-row__urg" data-u="${esc(x.urgency)}">${esc(x.urgency)}</span></td>
      <td>${issTag(x.status)}</td>
      <td class="mono">${x.doneAt ? esc(x.doneAt) : "—"}</td>
      <td>${esc(x.assignee) || "—"}</td>
    </tr>`).join("");
    return `<div class="table-wrap"><table class="grid-table iss-table">
      <thead><tr><th>발생일</th><th>구역</th><th>상세구역</th><th>이슈분류</th><th>이슈세부</th><th>긴급도</th><th>처리상태</th><th>완료일</th><th>담당자</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }
  function renderIssueBody() {
    const withIdx = getIssues().map((x, i) => ({ x, i })).filter(({ x }) => issueMatch(x));
    return issueList(withIdx);
  }

  function issueDetailModal(i) {
    const x = getIssues()[i];
    if (!x) return "";
    const row = (label, val) => `<div class="issd-row"><span class="issd-lbl">${label}</span><span class="issd-val">${val}</span></div>`;
    const done = x.status === "완료";
    return `<div class="gmodal" id="issueDetailModal">
      <div class="gmodal__bd" onclick="GARDEN.issueDetailClose()"></div>
      <div class="gmodal__card gmodal__card--wide">
        <div class="gmodal__head">
          <div class="issd-head">${issTag(x.status)}${issUrgText(x.urgency)}${x.recur ? `<span class="iss-recur-sm">반복</span>` : ""}
            <h3>${esc(x.detail) || "이슈 상세"}</h3></div>
          <button class="gmodal__x" onclick="GARDEN.issueDetailClose()">×</button>
        </div>
        <div class="issd-grid">
          ${row("발생일", esc(x.date) || "—")}
          ${row("구역", esc(x.building))}
          ${row("상세구역", esc(x.location) || "—")}
          ${row("이슈 분류", esc(x.category))}
          ${row("대상 식물", esc(x.species) || "—")}
          ${row("담당자", esc(x.assignee) || "—")}
          ${row("처리 완료 일시", esc(x.doneAt) || "—")}
          ${row("재발 여부", x.recur ? "반복 이슈" : "—")}
        </div>
        ${x.action ? `<div class="issd-block"><span class="issd-lbl">조치 내용</span><p>${esc(x.action)}</p></div>` : ""}
        ${x.memo ? `<div class="issd-block"><span class="issd-lbl">비고</span><p>${esc(x.memo)}</p></div>` : ""}
        ${x.photoUrl ? `<a class="btn btn--sm issd-photo" href="${esc(x.photoUrl)}" target="_blank" rel="noopener">🔗 사진 열기</a>` : ""}
        <div class="gmodal__foot">
          <button class="btn btn--sm btn--danger" onclick="GARDEN.issueDelete(${i})">삭제</button>
          <span class="gmodal__spacer"></span>
          ${done ? "" : `<button class="btn btn--sm" onclick="GARDEN.issueQuickDone(${i})">완료 처리</button>`}
          <button class="btn btn--primary btn--sm" onclick="GARDEN.issueEdit(${i})">수정</button>
        </div>
      </div></div>`;
  }
  function issueFormModal(i) {
    const isNew = i == null;
    const x = isNew
      ? { date: "", building: "A동", location: "", category: "미화 관련", detail: "", species: "",
          urgency: "일반", status: "접수", assignee: "", action: "", photoUrl: "", recur: false, doneAt: "", memo: "" }
      : getIssues()[i];
    if (!x) return "";
    const opt = (arr, cur) => arr.map((v) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(v)}</option>`).join("");
    return `<div class="gmodal" id="issueFormModal">
      <div class="gmodal__bd" onclick="GARDEN.issueClose()"></div>
      <div class="gmodal__card gmodal__card--wide">
        <div class="gmodal__head"><h3>${isNew ? "새 이슈 등록" : "이슈 수정"}</h3>
          <button class="gmodal__x" onclick="GARDEN.issueClose()">×</button></div>
        <div class="gform">
          <div class="fld-row fld-row--3">
            <label class="fld"><span>발생일 *</span><input id="if_date" type="date" value="${esc(x.date)}"/></label>
            <label class="fld"><span>구역 *</span><select id="if_building">${opt(ISS_BUILDINGS, x.building)}</select></label>
            <label class="fld"><span>상세구역</span><input id="if_loc" value="${esc(x.location)}" placeholder="예: 1층 바닥 플랜트박스"/></label>
          </div>
          <div class="fld-row fld-row--3">
            <label class="fld"><span>이슈 분류 *</span><select id="if_cat">${opt(ISS_CATEGORIES, x.category)}</select></label>
            <label class="fld"><span>이슈 세부</span><input id="if_detail" value="${esc(x.detail)}" placeholder="예: 총채벌레 발생"/></label>
            <label class="fld"><span>긴급도 *</span><select id="if_urg">${opt(ISS_URGENCY, x.urgency)}</select></label>
          </div>
          <div class="fld-row fld-row--3">
            <label class="fld"><span>처리 상태 *</span><select id="if_status">${opt(ISS_STATUS, x.status)}</select></label>
            <label class="fld"><span>담당자</span><input id="if_assignee" value="${esc(x.assignee)}" placeholder="예: 데이지"/></label>
            <label class="fld"><span>대상 식물</span><input id="if_species" value="${esc(x.species)}" placeholder="예: 테이블야자"/></label>
          </div>
          <div class="fld-row">
            <label class="fld"><span>처리 완료 일시</span><input id="if_done" type="date" value="${esc(x.doneAt)}"/></label>
            <label class="fld"><span>사진 링크</span><input id="if_photo" value="${esc(x.photoUrl)}" placeholder="사진 URL 붙여넣기(선택)"/>
              <a class="fld-hint" href="${ISSUE_DRIVE_URL}" target="_blank" rel="noopener">🔗 이슈 드라이브 폴더 열기</a></label>
          </div>
          <label class="fld"><span>조치 내용</span><textarea id="if_action" rows="2" placeholder="어떻게 조치했는지 기록">${esc(x.action)}</textarea></label>
          <label class="fld"><span>비고</span><textarea id="if_memo" rows="2" placeholder="기타 특이사항">${esc(x.memo)}</textarea></label>
          <label class="fld-check"><input id="if_recur" type="checkbox" ${x.recur ? "checked" : ""}/><span>재발 · 반복 이슈로 표시</span></label>
        </div>
        <div class="gmodal__foot">
          <button class="btn btn--sm" onclick="GARDEN.issueClose()">취소</button>
          <button class="btn btn--primary btn--sm" onclick="GARDEN.issueSave(${isNew ? "null" : i})">저장</button>
        </div>
      </div></div>`;
  }

  const statusMap = {
    active: { cls: "badge--active", label: "재직", dot: "var(--green)" },
    leave:  { cls: "badge--leave",  label: "휴직", dot: "var(--amber)" },
    out:    { cls: "badge--out",    label: "퇴사", dot: "var(--slate)" },
  };

  /* ---------- DONUT (crew mix) ---------- */
  function donut(items) {
    const total = items.reduce((s, i) => s + i.val, 0);
    const R = 70, C = 2 * Math.PI * R;
    let offset = 0;
    const rings = items.map((i) => {
      const len = (i.val / total) * C;
      const seg = `<circle cx="95" cy="95" r="${R}" fill="none" stroke="${i.color}" stroke-width="20"
        stroke-dasharray="0 ${C}" stroke-dashoffset="${-offset}" data-len="${len}" transform="rotate(-90 95 95)"/>`;
      offset += len;
      return seg;
    }).join("");
    const legend = items.map((i) =>
      `<li class="dleg__row"><span class="dleg__dot" style="background:${i.color}"></span>
        <span class="dleg__label">${i.label}</span>
        <span class="dleg__val">${i.val}<small>명</small></span></li>`
    ).join("");
    return `
      <div class="dash-card dash-card--donut">
        <div class="card-head"><h3>크루 구성</h3><span class="asof">총 ${total}명</span></div>
        <div class="donut-wrap">
          <svg class="donut" viewBox="0 0 190 190">
            ${rings}
            <text class="donut__num" x="95" y="92" text-anchor="middle">${total}</text>
            <text class="donut__unit" x="95" y="110" text-anchor="middle">CREW</text>
          </svg>
          <ul class="dleg">${legend}</ul>
        </div>
      </div>`;
  }

  /* ---------- BARS (store sales) ---------- */
  function bars(items) {
    const rows = items.map((i) =>
      `<div class="tbar">
        <span class="tbar__label">${i.label}</span>
        <span class="tbar__track"><span class="tbar__fill" data-pct="${i.pct}" style="background:var(--accent)"></span></span>
        <span class="tbar__val">${i.val}<small>M</small></span>
      </div>`
    ).join("");
    return `
      <div class="dash-card">
        <div class="card-head"><h3>매장별 매출</h3><span class="chip-mono">7월</span><span class="asof" style="margin-left:auto">단위: 백만원</span></div>
        <div class="tbars">${rows}</div>
      </div>`;
  }

  /* ---------- SPARKLINE (week trend) ---------- */
  function spark(items) {
    const W = 520, H = 120, pad = 8;
    const max = Math.max(...items.map((i) => i.v)) * 1.15;
    const min = Math.min(...items.map((i) => i.v)) * 0.7;
    const x = (i) => pad + (i * (W - pad * 2)) / (items.length - 1);
    const y = (v) => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
    const pts = items.map((i, idx) => [x(idx), y(i.v)]);
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = `${line} L${x(items.length - 1)} ${H} L${x(0)} ${H} Z`;
    const dots = pts.map((p) => `<circle class="dotp" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3"/>`).join("");
    const labels = items.map((i) => `<span>${i.d}</span>`).join("");
    return `
      <div class="dash-card">
        <div class="card-head"><h3>주간 매출 추이</h3><span class="asof">최근 7일 · 백만원</span></div>
        <svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          <defs><linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity=".35"/>
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
          </linearGradient></defs>
          <path class="area" d="${area}"/>
          <path class="line" d="${line}"/>
          ${dots}
        </svg>
        <div class="spark-x">${labels}</div>
      </div>`;
  }

  /* ---------- TODAY todos ---------- */
  function todos(items) {
    const li = items.map((t) =>
      `<li class="${t.done ? "done" : ""}"><span class="todo__tick">✓</span>
        <span class="todo__time">${t.time}</span>
        <span class="todo__txt">${t.text}</span></li>`
    ).join("");
    const done = items.filter((t) => t.done).length;
    return `
      <div class="dash-card">
        <div class="card-head"><h3>오늘 할 일</h3><span class="asof">${done}/${items.length} 완료</span></div>
        <ul class="todo">${li}</ul>
      </div>`;
  }

  /* ===== 크루 교육 관리 (4대 법정의무교육 이수 · 이수증 드라이브) ===== */
  const EDU_KEY = "garden-training";
  const EDU_TRAININGS = [
    { key: "harass",     label: "성희롱<br>예방",     full: "성희롱예방교육" },
    { key: "bully",      label: "직장내<br>괴롭힘",   full: "직장내괴롭힘예방교육" },
    { key: "disability", label: "장애인<br>인식개선", full: "장애인인식개선교육" },
    { key: "privacy",    label: "개인정보<br>보호",   full: "개인정보보호교육" },
  ];
  const EDU_METHODS = ["온라인", "집합교육", "직장교육", "외부교육"];
  const EDU_DRIVE_URL = "https://drive.google.com/drive/folders/1XxOT_SdPj7ppXQE7d1hkN3X_ZnWOWwdY"; // 이수증 드라이브 폴더
  let _training = null, _eduYear = null;

  function normalizeTraining(arr) {
    return (arr || []).map((r) => ({
      name: r.name || "", key: r.key || "", year: String(r.year || ""),
      date: r.date || "", method: r.method || "", certUrl: r.certUrl || "", memo: r.memo || "",
    }));
  }
  function getTraining() {
    if (_training) return _training;
    try { const s = localStorage.getItem(EDU_KEY); if (s) _training = normalizeTraining(JSON.parse(s)); } catch (e) {}
    if (!_training) _training = normalizeTraining(D.trainingRecords || []);
    return _training;
  }
  function saveTraining() {
    try { localStorage.setItem(EDU_KEY, JSON.stringify(_training)); } catch (e) {}
    pushTrainingRemote();
  }
  let _pushTRT = null;
  function pushTrainingRemote() {
    const url = (window.CONFIG && window.CONFIG.API_URL || "").trim();
    if (!url || !(window.CONFIG && window.CONFIG.WRITE_BACK) || !_training) return;
    clearTimeout(_pushTRT);
    _pushTRT = setTimeout(() => {
      fetch(url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ type: "trainingRecords", data: _training }) })
        .catch((e) => console.warn("[GARDEN] 크루 교육 저장 실패:", e));
    }, 700);
  }
  function reTraining() { app.innerHTML = views.training(); }
  function eduCurYear() { return _eduYear || String(_now.getFullYear()); }
  function eduYears() {
    const set = {};
    getTraining().forEach((r) => { if (r.year) set[r.year] = 1; });
    const cy = _now.getFullYear();
    for (let y = cy; y >= cy - 2; y--) set[String(y)] = 1;
    return Object.keys(set).sort((a, b) => b - a);
  }
  function eduCrew() { return getCrew().filter((c) => c.status !== "out"); }
  function eduRecOf(name, key, year) {
    return getTraining().find((r) => r.name === name && r.key === key && String(r.year) === String(year)) || null;
  }

  function trainingModal(name, key) {
    const year = eduCurYear();
    const existing = (name && key) ? eduRecOf(name, key, year) : null;
    const r = existing || { name: name || "", key: key || "", date: "", method: "", certUrl: "", memo: "" };
    const crewOpts = ['<option value="">크루 선택</option>']
      .concat(eduCrew().map((c) => `<option value="${esc(c.name)}" ${c.name === r.name ? "selected" : ""}>${esc(c.name)}</option>`)).join("");
    const trainOpts = EDU_TRAININGS.map((t) => `<option value="${t.key}" ${t.key === r.key ? "selected" : ""}>${t.full}</option>`).join("");
    const methodOpts = ['<option value="">방식 선택</option>']
      .concat(EDU_METHODS.map((m) => `<option ${m === r.method ? "selected" : ""}>${m}</option>`)).join("");
    const isEdit = !!existing;
    return `<div class="gmodal" id="trainingModal">
      <div class="gmodal__bd" onclick="GARDEN.trainingClose()"></div>
      <div class="gmodal__card">
        <div class="gmodal__head"><h3>${isEdit ? "이수 기록 수정" : "이수 기록 추가"}</h3>
          <button class="gmodal__x" onclick="GARDEN.trainingClose()">×</button></div>
        <div class="gform">
          <div class="fld-row">
            <label class="fld"><span>가드너 *</span><select id="tf_name">${crewOpts}</select></label>
            <label class="fld"><span>교육 *</span><select id="tf_key">${trainOpts}</select></label>
          </div>
          <div class="fld-row">
            <label class="fld"><span>이수일 *</span><input id="tf_date" type="date" value="${esc(r.date)}"/></label>
            <label class="fld"><span>교육 방식</span><select id="tf_method">${methodOpts}</select></label>
          </div>
          <label class="fld"><span>비고</span><input id="tf_memo" value="${esc(r.memo)}" placeholder="메모(선택)"/>
            ${EDU_DRIVE_URL ? `<a class="fld-hint" href="${EDU_DRIVE_URL}" target="_blank" rel="noopener">🔗 이수증 폴더 열기</a>` : ""}</label>
          <p class="edu-hint">이수일을 비우고 저장하면 <b>미이수</b>로 처리됩니다 · 기준 연도: <b>${year}</b></p>
        </div>
        <div class="gmodal__foot">
          ${isEdit ? `<button class="btn btn--sm btn--danger" onclick="GARDEN.trainingDelete()">미이수 처리</button><span class="gmodal__spacer"></span>` : ""}
          <button class="btn btn--sm" onclick="GARDEN.trainingClose()">취소</button>
          <button class="btn btn--primary btn--sm" onclick="GARDEN.trainingSave()">저장</button>
        </div>
      </div></div>`;
  }

  /* ===== 운영 정산 관리 (비용 집행 원장 · 명세서 드라이브) ===== */
  const STL_KEY = "garden-settlement";
  const STL_PLACES = ["카카오", "아지뜰", "기타"]; // 장소
  const STL_CATEGORIES = ["식물 구매", "자재비", "인건비", "유지보수", "시설/공사", "기타"]; // 유형(구분)
  const STL_STATUS = ["예정", "청구", "정산완료"];
  const SETTLE_DRIVE_URL = ""; // 명세서 드라이브 폴더 (별도 생성 예정 — URL 받으면 연결)
  let _settle = null, _settlePlace = "all", _settleQuery = "";

  function normalizeSettle(arr) {
    return (arr || []).map((x) => ({
      date: x.date || "", place: x.place || "", category: x.category || "기타", title: x.title || "",
      vendor: x.vendor || "", amount: Number(x.amount) || 0, status: x.status || "예정",
      paidDate: x.paidDate || "", statementUrl: x.statementUrl || "", memo: x.memo || "",
    }));
  }
  function getSettle() {
    if (_settle) return _settle;
    try { const s = localStorage.getItem(STL_KEY); if (s) _settle = normalizeSettle(JSON.parse(s)); } catch (e) {}
    if (!_settle) _settle = normalizeSettle(D.settlement || []);
    return _settle;
  }
  function saveSettle() {
    try { localStorage.setItem(STL_KEY, JSON.stringify(_settle)); } catch (e) {}
    pushSettleRemote();
  }
  let _pushSTL = null;
  function pushSettleRemote() {
    const url = (window.CONFIG && window.CONFIG.API_URL || "").trim();
    if (!url || !(window.CONFIG && window.CONFIG.WRITE_BACK) || !_settle) return;
    clearTimeout(_pushSTL);
    _pushSTL = setTimeout(() => {
      fetch(url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ type: "settlement", data: _settle }) })
        .catch((e) => console.warn("[GARDEN] 정산 저장 실패:", e));
    }, 700);
  }
  function reSettle() { app.innerHTML = views.settlement(); }
  const won = (n) => "₩" + (Number(n) || 0).toLocaleString("en-US");
  function settleMatch(x) {
    if (_settlePlace !== "all" && x.place !== _settlePlace) return false;
    if (_settleQuery) {
      const hay = [x.date, x.place, x.category, x.title, x.vendor, x.status, x.memo].join(" ").toLowerCase();
      if (hay.indexOf(_settleQuery) < 0) return false;
    }
    return true;
  }
  function settleRows() {
    const list = getSettle().map((x, i) => ({ x, i })).filter(({ x }) => settleMatch(x))
      .sort((a, b) => (a.x.date < b.x.date ? 1 : -1));
    if (!list.length) return `<tr><td colspan="9" class="stl-empty">등록된 정산 내역이 없습니다.</td></tr>`;
    return list.map(({ x, i }) => {
      const done = x.status === "정산완료";
      const stmt = x.statementUrl
        ? `<a class="stl-stmt" href="${esc(x.statementUrl)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🔗 명세서</a>`
        : `<span class="muted" style="font-size:11px">—</span>`;
      return `<tr onclick="GARDEN.settleOpen(${i})">
        <td class="mono">${esc(x.date) || "—"}</td>
        <td>${esc(x.place) || "—"}</td>
        <td>${esc(x.category)}</td>
        <td class="stl-title">${esc(x.title) || "—"}</td>
        <td>${esc(x.vendor) || "—"}</td>
        <td class="stl-amt">${won(x.amount)}</td>
        <td><span class="iss-tag ${done ? "iss-tag--done" : ""}">${esc(x.status)}</span></td>
        <td>${stmt}</td>
      </tr>`;
    }).join("");
  }
  function settleModal(i) {
    const isNew = i == null;
    const x = isNew ? { date: "", place: "카카오", category: "식물 구매", title: "", vendor: "", amount: "", status: "예정", paidDate: "", statementUrl: "", memo: "" } : getSettle()[i];
    if (!x) return "";
    const placeOpts = STL_PLACES.map((p) => `<option ${x.place === p ? "selected" : ""}>${p}</option>`).join("");
    const catOpts = STL_CATEGORIES.map((c) => `<option ${x.category === c ? "selected" : ""}>${c}</option>`).join("");
    const stOpts = STL_STATUS.map((s) => `<option ${x.status === s ? "selected" : ""}>${s}</option>`).join("");
    return `<div class="gmodal" id="settleModal">
      <div class="gmodal__bd" onclick="GARDEN.settleClose()"></div>
      <div class="gmodal__card gmodal__card--wide">
        <div class="gmodal__head"><h3>${isNew ? "정산 등록" : "정산 수정"}</h3>
          <button class="gmodal__x" onclick="GARDEN.settleClose()">×</button></div>
        <div class="gform">
          <div class="fld-row fld-row--3">
            <label class="fld"><span>작업일 *</span><input id="st_date" type="date" value="${esc(x.date)}"/></label>
            <label class="fld"><span>장소 *</span><select id="st_place">${placeOpts}</select></label>
            <label class="fld"><span>구분 *</span><select id="st_cat">${catOpts}</select></label>
          </div>
          <label class="fld"><span>작업 내용 *</span><input id="st_title" value="${esc(x.title)}" placeholder="예: 4층 북아지트 관엽 교체"/></label>
          <div class="fld-row">
            <label class="fld"><span>거래처</span><input id="st_vendor" value="${esc(x.vendor)}" placeholder="업체/거래처명"/></label>
            <label class="fld"><span>비용(원) *</span><input id="st_amount" type="number" inputmode="numeric" value="${x.amount === "" ? "" : esc(x.amount)}" placeholder="0"/></label>
          </div>
          <div class="fld-row">
            <label class="fld"><span>정산 상태</span><select id="st_status">${stOpts}</select></label>
            <label class="fld"><span>정산일</span><input id="st_paid" type="date" value="${esc(x.paidDate)}"/></label>
          </div>
          <label class="fld"><span>명세서 링크</span><input id="st_stmt" value="${esc(x.statementUrl)}" placeholder="구글 드라이브 명세서 파일 URL"/>
            ${SETTLE_DRIVE_URL ? `<a class="fld-hint" href="${SETTLE_DRIVE_URL}" target="_blank" rel="noopener">🔗 명세서 폴더 열기</a>` : ""}</label>
          <label class="fld"><span>비고</span><input id="st_memo" value="${esc(x.memo)}" placeholder="기타 특이사항(선택)"/></label>
        </div>
        <div class="gmodal__foot">
          ${isNew ? "" : `<button class="btn btn--sm btn--danger" onclick="GARDEN.settleDelete(${i})">삭제</button><span class="gmodal__spacer"></span>`}
          <button class="btn btn--sm" onclick="GARDEN.settleClose()">취소</button>
          <button class="btn btn--primary btn--sm" onclick="GARDEN.settleSave(${isNew ? "null" : i})">저장</button>
        </div>
      </div></div>`;
  }

  /* ===== 로딩 스켈레톤 (시트 최초 로드 중) ===== */
  function sproutLoader(text) {
    return `<div class="boot">
      <svg class="sprout" viewBox="0 0 48 60" aria-hidden="true">
        <path class="sprout__stem" d="M24 58 V28"/>
        <path class="sprout__leaf sprout__leaf--l" d="M24 34 C10 34 6 22 9 13 C21 14 27 25 24 34 Z"/>
        <path class="sprout__leaf sprout__leaf--r" d="M24 30 C38 30 42 18 39 9 C27 10 21 21 24 30 Z"/>
      </svg>
      <span class="boot__label">${esc(text || "불러오는 중")}</span>
    </div>`;
  }
  function skRows(n, cols) {
    cols = cols || [38, 18, 14, 12];
    return `<div class="sk-rows">` + Array.from({ length: n }).map(() =>
      `<div class="sk-row">${cols.map((w) => `<span class="sk sk-line" style="width:${w}%"></span>`).join("")}</div>`).join("") + `</div>`;
  }
  function dashSkeleton() {
    return `<section class="view">
      <div class="page-head"><div><p class="eyebrow">Overview</p><h2>운영 대시보드</h2>
        <p class="sub">현황을 불러오고 있어요</p></div></div>
      ${sproutLoader("대시보드 불러오는 중")}
      <div class="dash-grid"><div class="sk sk-card"></div><div class="sk sk-card"></div></div>
    </section>`;
  }
  function crewSkeleton() {
    return `<section class="view">
      <div class="page-head"><div><p class="eyebrow">Crew</p><h2>크루 로스터</h2>
        <p class="sub">명단을 불러오고 있어요</p></div></div>
      ${sproutLoader("크루 명단 불러오는 중")}
      <div class="dash-grid"><div class="sk sk-card"></div><div class="sk sk-card"></div></div>
      <div class="table-wrap">${skRows(6)}</div>
    </section>`;
  }
  function trainingSkeleton() {
    return `<section class="view">
      <div class="page-head"><div><p class="eyebrow">Crew · 교육</p><h2>크루 교육 관리</h2>
        <p class="sub">이수 현황을 불러오고 있어요</p></div></div>
      ${sproutLoader("교육 현황 불러오는 중")}
      <div class="dash-card"><div class="sk sk-card sk-card--flat"></div></div>
      <div class="table-wrap" style="margin-top:14px">${skRows(4, [24, 60])}</div>
    </section>`;
  }

  /* ---------- VIEWS ---------- */
  const views = {
    dashboard() {
      if (_booting && !getCrew().length) return dashSkeleton();
      return `
        <section class="view">
          <div class="page-head">
            <div>
              <p class="eyebrow">Overview · ${D.asOf || ""}</p>
              <h2>운영 대시보드</h2>
              <p class="sub">근무 인원 · 장애유형 현황</p>
            </div>
          </div>
          <div class="dash-grid">${crewStatusCard("근무 인원 현황")}${crewTypeCard()}</div>
        </section>`;
    },

    crew() {
      if (_booting && !getCrew().length) return crewSkeleton();
      const list = getCrew();
      const disType = (c) => (c.disability == null ? "" : String(c.disability).trim());
      const rank = { active: 0, leave: 1, out: 2 };
      const order = list.map((c, i) => ({ c, i })).sort((a, b) => (rank[a.c.status] ?? 3) - (rank[b.c.status] ?? 3));

      const rows = order.map(({ c, i }) => {
        const s = statusMap[c.status] || statusMap.active;
        const tags = (c.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
        const d = disType(c);
        const disCell = d
          ? `<span class="dis" style="--dc:${disColor(d)}"><span class="dis__dot"></span>${esc(d)}</span>`
          : `<span class="muted">—</span>`;
        const ten = tenure(c.since, c.status === "out" ? c.left : "");
        const leftInfo = (c.status === "out" && c.left) ? `<span class="crew-left">${esc(c.left)} 퇴사</span>` : "";
        return `<tr class="${c.status === "out" ? "crew-out" : ""}">
          <td class="crew-name"><span class="gdot" style="background:${s.dot}"></span>
            <button class="crew-name-btn" onclick="GARDEN.crewOpen(${i})" title="정보 보기 · 수정 · 삭제">${esc(c.name)}</button>
            <span class="t">${esc(c.store)}</span></td>
          <td class="mono">${esc(c.role)}</td>
          <td class="mono-cell">
            <span class="crew-since">${esc(c.since) || "—"}</span>
            ${ten ? `<span class="crew-ten">${ten}</span>` : ""}
          </td>
          <td class="crew-status">
            <div class="crew-status__row"><span class="badge ${s.cls}">${s.label}</span>${leftInfo}</div>
          </td>
          <td>${disCell}</td>
          <td><div class="tagset">${tags}</div></td>
          <td><span class="crew-memo">${esc(c.memo) || "—"}</span></td>
        </tr>`;
      }).join("");
      const cnt = (st) => list.filter((c) => c.status === st).length;

      return `
        <section class="view">
          <div class="page-head">
            <div><p class="eyebrow">Crew</p><h2>크루 로스터</h2>
              <p class="sub">재직 ${cnt("active")} · 휴직 ${cnt("leave")} · 퇴사 ${cnt("out")}</p></div>
            <button class="btn btn--primary btn--sm" onclick="GARDEN.crewAddOpen()">＋ 크루 등록</button>
          </div>
          <div class="dash-grid">${crewStatusCard("근무 인원 현황")}${crewTypeCard()}</div>
          <div class="toolbar-row">
            <input class="searchbox" placeholder="이름 · 매장 · 태그 · 장애유형 검색" oninput="GARDEN.filterCrew(this.value)"/>
          </div>
          <div class="table-wrap">
            <table class="grid-table">
              <thead><tr><th>이름 / 매장</th><th>구분</th><th class="num">입사 · 재직</th><th>상태</th><th>장애유형</th><th>태그</th><th>비고</th></tr></thead>
              <tbody id="crewBody">${rows}</tbody>
            </table>
          </div>
        </section>`;
    },

    schedule() {
      const b = getBoard();
      const tk = todayKey();

      // 요일 헤더 (날짜 없음)
      const headCols = b.days.map((d) =>
        `<th class="wb-th ${d.key === tk ? "is-today" : ""}"><span class="wb-th__d">${d.label}</span></th>`
      ).join("");

      // 영역 행
      const rows = b.areas.map((area, ai) => {
        const cells = b.days.map((d) => {
          const items = (area.cells[d.key] || []);
          const lis = items.map((t, ii) =>
            `<div class="wbitem">
              <span class="wbitem__t" contenteditable="true" spellcheck="false"
                    data-a="${ai}" data-day="${d.key}" data-i="${ii}"
                    onblur="GARDEN.wbEdit(this)" onkeydown="GARDEN.wbKey(event,this)">${esc(t)}</span>
              <button class="wbitem__x" title="삭제" onclick="GARDEN.wbDel(${ai},'${d.key}',${ii})">×</button>
            </div>`
          ).join("");
          return `<td class="wbcell ${d.key === tk ? "is-today" : ""}">
            <div class="wbcell__body">${lis || '<span class="wbcell__empty">–</span>'}</div>
            <button class="wbadd" title="항목 추가" onclick="GARDEN.wbAdd(${ai},'${d.key}')">＋ 추가</button>
          </td>`;
        }).join("");
        return `<tr>
          <th class="wb-area" style="--ac:${area.color}">
            <span class="wb-area__t" contenteditable="true" spellcheck="false"
                  data-a="${ai}" onblur="GARDEN.wbArea(this)" onkeydown="GARDEN.wbKey(event,this)">${esc(area.name)}</span>
            <button class="wb-area__x" title="영역 삭제" onclick="GARDEN.wbDelArea(${ai})">×</button>
          </th>${cells}
        </tr>`;
      }).join("");

      // 특이사항
      const noteRow = `<tr>
        <th class="wb-area wb-area--note">특이사항</th>
        <td class="wbnote" colspan="${b.days.length}">
          <span class="wbnote__t" contenteditable="true" spellcheck="false"
                onblur="GARDEN.wbNote(this)">${esc(b.note || "")}</span>
        </td>
      </tr>`;

      return `
        <section class="view">
          <div class="page-head">
            <div><p class="eyebrow">Operation</p><h2>월간 스케줄</h2>
              <p class="sub">매주 반복 · 월–금 상시 스케줄 · 관리 위치 동일</p></div>
            <div class="seg">
              <button class="btn btn--sm" onclick="GARDEN.wbReset()">초기화</button>
              <button class="btn btn--primary btn--sm" onclick="GARDEN.wbAddArea()">＋ 영역 추가</button>
            </div>
          </div>
          <div class="wb-layout">
            ${calendarCard(b)}
            <div class="wb-board">
              <div class="wb-board__head">
                <h3>주간 기본 스케줄</h3>
                <span class="wb-board__badge">월–금 · 상시</span>
              </div>
              <div class="wb-scroll">
                <table class="wb-table">
                  <thead><tr><th class="wb-corner">영역</th>${headCols}</tr></thead>
                  <tbody>${rows}${noteRow}</tbody>
                </table>
              </div>
            </div>
          </div>
        </section>`;
    },

    sales() {
      return `
        <section class="view">
          <div class="page-head">
            <div><p class="eyebrow">Operation</p><h2>매출 리포트</h2>
              <p class="sub">매장별 · 추이 분석</p></div>
          </div>
          <div class="dash-grid">${bars(D.storeSales)}${spark(D.weekTrend)}</div>
        </section>`;
    },

    plants() {
      if (!_plantAdmin && _plantTab === "input") _plantTab = "matrix";
      const round = curRound();
      const allZones = activeZones().flatMap((g) => g.zones);
      const total = allZones.length;
      const done = allZones.filter((z) => gradeOf(z, round)).length;
      const pctDone = total ? Math.round((done / total) * 100) : 0;
      const RCR = 2 * Math.PI * 30;

      const tabDefs = _plantAdmin
        ? [["input", "점검 입력"], ["matrix", "현황 매트릭스"], ["stats", "통계 요약"]]
        : [["matrix", "현황 매트릭스"], ["stats", "통계 요약"]];
      const tabs = tabDefs
        .map(([k, l]) => `<button class="ptab ${_plantTab === k ? "is-on" : ""}" onclick="GARDEN.plantTab('${k}')">${l}</button>`).join("");
      const roundSel = (D.plantRounds || [])
        .map((r) => `<button class="pround ${r === round ? "is-on" : ""}" onclick="GARDEN.plantRound('${r}')">${r}</button>`).join("");

      let body;
      if (_plantTab === "input" && _plantAdmin) body = `<div class="proundbar"><span class="proundbar__lbl">점검 회차</span>${roundSel}</div>${plantInputBody(round)}`;
      else if (_plantTab === "stats") body = `<div class="proundbar"><span class="proundbar__lbl">회차</span>${roundSel}</div>${plantStatsBody(round)}`;
      else body = plantMatrixBody();

      return `
        <section class="view">
          <div class="page-head">
            <div><p class="eyebrow">Crew · 식물 관리</p><h2>식물 상태 점검</h2>
              <p class="sub">구역별 체크리스트로 점검하고 이슈를 기록합니다 · 2개월 주기 (2·4·7·10·12월)</p></div>
            <div class="seg">
              ${_plantAdmin
                ? `<span class="plant-admin-badge">관리자</span><button class="btn btn--sm" onclick="GARDEN.plantReset()">초기화</button><button class="btn btn--sm" onclick="GARDEN.plantAdminExit()">관리자 해제</button>`
                : `<button class="btn btn--sm btn--primary" onclick="GARDEN.plantAdminOpen()">관리자 모드</button>`}
            </div>
          </div>
          <div class="phead">
            <div class="phead__prog">
              <svg class="pring" viewBox="0 0 72 72">
                <circle class="pring__bg" cx="36" cy="36" r="30"/>
                <circle class="pring__fg" cx="36" cy="36" r="30" stroke-dasharray="${(pctDone / 100) * RCR} ${RCR}" transform="rotate(-90 36 36)"/>
                <text class="pring__t" x="36" y="40" text-anchor="middle">${pctDone}%</text>
              </svg>
              <div class="phead__meta">
                <div class="phead__round">${round} 점검</div>
                <div class="phead__done">완료 <b>${done}</b> / ${total}개 구역</div>
              </div>
            </div>
            <div class="ptabs">${tabs}</div>
          </div>
          ${body}
        </section>`;
    },

    floors() {
      return `
        <section class="view">
          <div class="page-head">
            <div><p class="eyebrow">Crew · 시설</p><h2>각층 현황</h2>
              <p class="sub">층별 현장 사진을 구글 드라이브에서 불러옵니다 · 담당자 업로드 즉시 반영</p></div>
            <div class="seg">
              <a class="btn btn--sm" href="https://drive.google.com/drive/folders/${FLOOR_PARENT}" target="_blank" rel="noopener">🔗 드라이브 열기</a>
              <button class="btn btn--primary btn--sm" onclick="GARDEN.loadFloors(true)">↻ 새로고침</button>
            </div>
          </div>
          <div id="floorsBody">${_floorsCache ? floorsRender(_floorsCache) : floorsSkeleton()}</div>
        </section>`;
    },

    safety() {
      const manual = _safetyCache && _safetyCache.manual;
      const folderUrl = (_safetyCache && _safetyCache.folderUrl) || "";
      const meetingList = getSafetyMeetings();
      const meetingsAll = meetingList.map((m, i) => ({ m, i })).sort((a, b) => (a.m.date < b.m.date ? 1 : -1));
      const meetingsShown = _safetyExpand.meetings ? meetingsAll : meetingsAll.slice(0, SAFETY_BOARD_LIMIT);
      const meetingCards = meetingsShown.length
        ? meetingsShown.map(({ m, i }) => safetyMeetingCard(m, i)).join("")
        : `<p class="muted" style="margin:6px 0">등록된 회의 기록이 없습니다.</p>`;
      const checkList = getSafetyChecks();
      const checksAll = checkList.map((c, i) => ({ c, i })).sort((a, b) => (a.c.date < b.c.date ? 1 : -1));
      const checksShown = _safetyExpand.checks ? checksAll : checksAll.slice(0, SAFETY_BOARD_LIMIT);
      const checkCards = checksShown.length
        ? checksShown.map(({ c, i }) => safetyCheckCard(c, i)).join("")
        : `<p class="muted" style="margin:6px 0">등록된 점검 기록이 없습니다.</p>`;
      const incidentList = getIncidents();
      const incidentsAll = incidentList.map((x, i) => ({ x, i })).sort((a, b) => (a.x.date < b.x.date ? 1 : -1));
      const incidentsShown = _safetyExpand.incidents ? incidentsAll : incidentsAll.slice(0, SAFETY_BOARD_LIMIT);
      const incidentCards = incidentsShown.length
        ? incidentsShown.map(({ x, i }) => incidentCard(x, i)).join("")
        : `<p class="muted" style="margin:6px 0">등록된 사고 이력이 없습니다.</p>`;

      return `
        <section class="view">
          <div class="page-head">
            <div><p class="eyebrow">Crew · 안전</p><h2>산업안전보건</h2>
              <p class="sub">정기회의 · 정기 안전점검 · 안전매뉴얼</p></div>
            <button class="btn btn--primary btn--sm" onclick="GARDEN.loadSafetyFiles(true)">↻ 새로고침</button>
          </div>

          <div class="dash-card sf-card">
            <div class="card-head"><h3>안전매뉴얼</h3>
              ${folderUrl ? `<a class="chip-mono sf-folder" href="${folderUrl}" target="_blank" rel="noopener">🔗 드라이브 폴더</a>` : ""}</div>
            <div id="safetyManualBody">${manual ? safetyManualBody(manual, folderUrl) : safetySkeleton()}</div>
          </div>

          <div class="sf-grid" style="margin-top:16px">
            <div class="dash-card">
              <div class="card-head"><h3>정기회의</h3>
                <button class="btn btn--primary btn--sm" style="margin-left:auto" onclick="GARDEN.safetyMeetingOpen(null)">＋ 회의 기록</button></div>
              <div class="tf-board">${meetingCards}</div>
              ${moreToggleBtn("meetings", meetingsAll.length, SAFETY_BOARD_LIMIT)}
            </div>
            <div class="dash-card">
              <div class="card-head"><h3>정기 안전점검</h3>
                <button class="btn btn--primary btn--sm" style="margin-left:auto" onclick="GARDEN.safetyCheckOpen(null)">＋ 점검 기록</button></div>
              <div class="chk-board">${checkCards}</div>
              ${moreToggleBtn("checks", checksAll.length, SAFETY_BOARD_LIMIT)}
            </div>
          </div>

          <div class="dash-card" style="margin-top:16px">
            <div class="card-head"><h3>사고 대응 이력</h3>
              <div class="seg" style="margin-left:auto">
                <button class="btn btn--sm" onclick="GARDEN.incidentCsv()">CSV 내보내기</button>
                <button class="btn btn--primary btn--sm" onclick="GARDEN.incidentOpen(null)">＋ 사고 등록</button>
              </div>
            </div>
            <div class="chk-board">${incidentCards}</div>
            ${moreToggleBtn("incidents", incidentsAll.length, SAFETY_BOARD_LIMIT)}
          </div>
        </section>`;
    },

    issues() {
      const all = getIssues().filter((x) => issueMatch(x));
      const total = all.length;
      const doneN = all.filter((x) => x.status === "완료").length;
      const openN = total - doneN;
      const workN = all.filter((x) => x.status === "확인중" || x.status === "조치중").length;
      const urgentN = all.filter((x) => x.urgency === "긴급" && x.status !== "완료").length;
      const rate = total ? Math.round((doneN / total) * 100) : 0;
      const stat = (label, val, unit, numMod) =>
        `<div class="iss-stat"><div class="iss-stat__n ${numMod || ""}">${val}<small>${unit}</small></div><div class="iss-stat__l">${label}</div></div>`;
      const periodTitle = _issuePeriodMode === "year" ? `${_issueYear}년` : `${_issueYear}년 ${_issueMonth}월`;

      return `
        <section class="view">
          <div class="page-head">
            <div><p class="eyebrow">Crew · 식물 관리</p><h2>식물 이슈 관리</h2>
              <p class="sub">발생한 식물 이슈를 접수부터 완료까지 한눈에 추적합니다 · 행을 누르면 상세가 열립니다</p></div>
            <div class="seg">
              <a class="btn btn--sm" href="${ISSUE_DRIVE_URL}" target="_blank" rel="noopener">🔗 드라이브</a>
              <button class="btn btn--primary btn--sm" onclick="GARDEN.issueAddOpen()">＋ 이슈 등록</button>
            </div>
          </div>
          <div class="iss-stats">
            ${stat("총 이슈", total, "건")}
            ${stat("미완료", openN, "건")}
            ${stat("처리중", workN, "건")}
            ${stat("긴급", urgentN, "건", urgentN ? "iss-stat__n--red" : "")}
            ${stat("해결률", rate, "%", "iss-stat__n--acid")}
          </div>
          <div class="iss-period">
            <button class="iss-nav" onclick="GARDEN.issuePeriodStep(-1)" title="이전">←</button>
            <span class="iss-period__title">${periodTitle}</span>
            <button class="iss-nav" onclick="GARDEN.issuePeriodStep(1)" title="다음">→</button>
            <div class="iss-modeseg">
              <button class="iss-modebtn ${_issuePeriodMode === "month" ? "is-on" : ""}" onclick="GARDEN.issueMode('month')">월간</button>
              <button class="iss-modebtn ${_issuePeriodMode === "year" ? "is-on" : ""}" onclick="GARDEN.issueMode('year')">연간</button>
            </div>
          </div>
          <div class="iss-toolbar">
            <input class="searchbox iss-search" placeholder="구역 · 이슈 · 담당자 검색" value="${esc(_issueQuery)}" oninput="GARDEN.issueSearch(this.value)"/>
          </div>
          <div id="issBody">${renderIssueBody()}</div>
        </section>`;
    },

    training() {
      if (_booting && !getCrew().length) return trainingSkeleton();
      const year = eduCurYear();
      const crew = eduCrew();
      const recs = getTraining().filter((r) => String(r.year) === String(year));
      const doneOf = (name, key) => recs.find((r) => r.name === name && r.key === key) || null;
      const total = crew.length;

      // 교육별 이수 현황 (카운트 타일 · % 없음)
      const overview = EDU_TRAININGS.map((t) => {
        const done = crew.filter((c) => doneOf(c.name, t.key)).length;
        const mod = (total > 0 && done === total) ? "is-full" : done === 0 ? "is-zero" : "";
        return `<div class="edu-ov">
          <span class="edu-ov__name">${t.full}</span>
          <span class="edu-ov__val ${mod}">${done}<small> / ${total}명 이수</small></span>
        </div>`;
      }).join("");

      // 크루별 이수 현황 (매트릭스 · 이수/미이수 칩)
      const heads = EDU_TRAININGS.map((t) => `<th class="edu-col">${t.label}</th>`).join("");
      const body = total
        ? crew.map((c) => {
            const cells = EDU_TRAININGS.map((t) => {
              const r = doneOf(c.name, t.key);
              if (r) {
                const d = esc(r.date).slice(5).replace("-", "/");
                return `<td class="edu-cell" onclick="GARDEN.trainingOpen('${esc(c.name)}','${t.key}')" title="이수일 ${esc(r.date)} · 수정">
                  <span class="edu-chip edu-chip--done">✓ 이수</span><span class="edu-cell-date">${d}</span></td>`;
              }
              return `<td class="edu-cell" onclick="GARDEN.trainingOpen('${esc(c.name)}','${t.key}')" title="이수 기록 추가">
                <span class="edu-chip edu-chip--miss">미이수</span></td>`;
            }).join("");
            return `<tr>
              <td class="edu-name"><b>${esc(c.name)}</b>${c.role ? `<span class="t">${esc(c.role)}</span>` : ""}</td>
              ${cells}
            </tr>`;
          }).join("")
        : `<tr><td colspan="${EDU_TRAININGS.length + 1}" class="edu-empty">등록된 크루가 없습니다 · 크루 로스터에서 먼저 등록하세요.</td></tr>`;

      const yearSel = `<select class="edu-year" onchange="GARDEN.trainingYear(this.value)">${
        eduYears().map((y) => `<option value="${y}" ${String(y) === String(year) ? "selected" : ""}>${y}년</option>`).join("")}</select>`;

      return `
        <section class="view">
          <div class="page-head">
            <div><p class="eyebrow">Crew · 교육</p><h2>크루 교육 관리</h2>
              <p class="sub">4대 법정의무교육 이수 현황 · 셀을 누르면 이수 기록을 남기고 이수증을 연결합니다</p></div>
            <div class="seg">
              ${EDU_DRIVE_URL ? `<a class="btn btn--sm" href="${EDU_DRIVE_URL}" target="_blank" rel="noopener">🔗 이수증 확인</a>` : ""}
              <button class="btn btn--primary btn--sm" onclick="GARDEN.trainingAddOpen()">＋ 이수 기록 추가</button>
            </div>
          </div>

          <div class="dash-card">
            <div class="card-head"><h3>교육별 이수 현황</h3>
              <span class="asof" style="margin-left:auto">${year}년 기준</span></div>
            <div class="edu-ovgrid">${overview}</div>
          </div>

          <div class="edu-mtx-head">
            <h3>크루별 이수 현황</h3>
            <div class="seg">
              ${yearSel}
              <button class="btn btn--sm" onclick="GARDEN.trainingCsv()">CSV 내보내기</button>
            </div>
          </div>
          <div class="table-wrap edu-wrap">
            <table class="grid-table edu-table">
              <thead><tr><th>가드너</th>${heads}</tr></thead>
              <tbody>${body}</tbody>
            </table>
          </div>
        </section>`;
    },

    settlement() {
      const list = getSettle();
      const total = list.reduce((s, x) => s + (Number(x.amount) || 0), 0);
      const doneTotal = list.filter((x) => x.status === "정산완료").reduce((s, x) => s + (Number(x.amount) || 0), 0);
      const pending = total - doneTotal;
      const catChips = ["all"].concat(STL_PLACES).map((c) =>
        `<button class="iss-chip ${_settlePlace === c ? "is-on" : ""}" onclick="GARDEN.settlePlace('${c}')">${c === "all" ? "전체" : c}</button>`).join("");

      return `
        <section class="view stl">
          <div class="page-head">
            <div><p class="eyebrow">Operation</p><h2>운영 정산 관리</h2>
              <p class="sub">비용 집행 내역과 명세서를 관리합니다 · 행을 누르면 상세가 열립니다</p></div>
            <div class="seg">
              ${SETTLE_DRIVE_URL ? `<a class="btn btn--sm" href="${SETTLE_DRIVE_URL}" target="_blank" rel="noopener">🔗 명세서 폴더</a>` : ""}
              <button class="btn btn--sm" onclick="GARDEN.settleCsv()">CSV 내보내기</button>
              <button class="btn btn--primary btn--sm" onclick="GARDEN.settleAddOpen()">＋ 정산 등록</button>
            </div>
          </div>

          <div class="stl-bento">
            <div class="bento bento--total">
              <span class="bento__lbl">총 집행 비용</span>
              <span class="bento__num">${won(total)}</span>
              <span class="bento__sub">${list.length}건 집행</span>
            </div>
            <div class="bento bento--done">
              <span class="bento__lbl">정산 완료</span>
              <span class="bento__num">${won(doneTotal)}</span>
            </div>
            <div class="bento bento--pending">
              <span class="bento__lbl">미정산</span>
              <span class="bento__num">${won(pending)}</span>
            </div>
            <div class="bento bento--count">
              <span class="bento__lbl">건수</span>
              <span class="bento__num">${list.length}<small>건</small></span>
            </div>
          </div>

          <div class="stl-toolbar">
            <div class="iss-chips">${catChips}</div>
            <input class="searchbox stl-search" placeholder="작업 내용 · 거래처 · 비고 검색" value="${esc(_settleQuery)}" oninput="GARDEN.settleSearch(this.value)"/>
          </div>

          <div class="stl-board">
            <table class="stl-table">
              <thead><tr>
                <th>작업일</th><th>장소</th><th>구분</th><th>작업 내용</th><th>거래처</th>
                <th class="stl-col-amt">비용</th><th>상태</th><th>명세서</th>
              </tr></thead>
              <tbody>${settleRows()}</tbody>
            </table>
          </div>
        </section>`;
    },
  };

  const crumbMap = {
    dashboard: "MAIN / DASHBOARD",
    crew: "CREW / ROSTER",
    training: "CREW / TRAINING",
    settlement: "OPERATION / SETTLEMENT",
    issues: "CREW / PLANT ISSUES",
    plants: "CREW / PLANT CHECK",
    floors: "CREW / FLOOR STATUS",
    safety: "CREW / SAFETY & HEALTH",
    schedule: "OPERATION / SCHEDULE",
    sales: "OPERATION / SALES",
  };

  /* ---------- router ---------- */
  function render(view) {
    view = views[view] ? view : "dashboard";
    app.innerHTML = views[view]();
    crumb.textContent = crumbMap[view] || "MAIN / DASHBOARD";
    document.querySelectorAll(".nav__item").forEach((n) =>
      n.classList.toggle("is-active", n.dataset.view === view));
    // animate bars/donut after paint
    requestAnimationFrame(() => {
      document.querySelectorAll(".tbar__fill").forEach((b) => { b.style.width = b.dataset.pct + "%"; });
      document.querySelectorAll(".donut circle").forEach((c) => {
        const R = 70, C = 2 * Math.PI * R;
        c.setAttribute("stroke-dasharray", `${c.dataset.len} ${C}`);
      });
    });
    if (view === "floors") GARDEN.loadFloors();
    if (view === "safety") GARDEN.loadSafetyFiles();
    window.scrollTo(0, 0);
  }

  function currentView() { return (location.hash || "#dashboard").replace("#", ""); }
  window.addEventListener("hashchange", () => render(currentView()));

  /* ---------- weekBoard state (localStorage overlay) ---------- */
  const WB_KEY = "garden-weekboard";
  const WORK_DAYS = [
    { key: "mon", label: "월" }, { key: "tue", label: "화" }, { key: "wed", label: "수" },
    { key: "thu", label: "목" }, { key: "fri", label: "금" },
  ];
  const _now = new Date();
  let _calYM = { y: _now.getFullYear(), m: _now.getMonth() };
  const _pad = (n) => (n < 10 ? "0" : "") + n;
  const todayKey = () => ({ 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri" }[_now.getDay()] || "");

  let _board = null;
  function normalizeBoard(b) {
    b = b || {};
    b.areas = (b.areas || []).map((a) => {
      const cells = {};
      WORK_DAYS.forEach((d) => { cells[d.key] = Array.isArray(a.cells && a.cells[d.key]) ? a.cells[d.key] : []; });
      return { name: a.name || "", color: a.color || "var(--accent)", cells };
    });
    b.days = WORK_DAYS.map((d) => ({ key: d.key, label: d.label }));
    b.exceptions = Array.isArray(b.exceptions) ? b.exceptions : [];
    if (b.month == null) b.month = "";
    if (b.note == null) b.note = "";
    return b;
  }
  function getBoard() {
    if (_board) return _board;
    try {
      const saved = localStorage.getItem(WB_KEY);
      if (saved) { _board = normalizeBoard(JSON.parse(saved)); return _board; }
    } catch (e) {}
    _board = normalizeBoard(JSON.parse(JSON.stringify(D.weekBoard || {})));
    return _board;
  }
  /* 동적 월간 달력 (변동사항 있는 날만 점 표시) */
  function calendarCard(b) {
    const y = _calYM.y, m = _calYM.m;
    const startDow = new Date(y, m, 1).getDay(); // 일=0 (일요일 시작)
    const dim = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const exMap = {};
    (b.exceptions || []).forEach((e) => { exMap[e.date] = e.label; });
    const isThisMonth = (y === _now.getFullYear() && m === _now.getMonth());

    let grid = "";
    for (let i = 0; i < cells.length; i += 7) {
      const week = cells.slice(i, i + 7).map((d, ci) => {
        if (d == null) return `<span class="mc__d mc__d--pad"></span>`;
        const ds = `${y}-${_pad(m + 1)}-${_pad(d)}`;
        const isToday = isThisMonth && d === _now.getDate();
        const wknd = ci === 0 || ci === 6;
        const ex = exMap[ds];
        return `<button class="mc__d ${isToday ? "is-today" : ""} ${wknd ? "is-wknd" : ""} ${ex ? "has-ex" : ""}"
          title="${ex ? esc(ex) : "변동사항 추가"}" onclick="GARDEN.wbException('${ds}')">${d}${ex ? '<i class="mc__dot"></i>' : ""}</button>`;
      }).join("");
      grid += `<div class="mc__row">${week}</div>`;
    }

    const wd = ["일", "월", "화", "수", "목", "금", "토"].map((w, i) =>
      `<span class="${i === 0 || i === 6 ? "is-wknd" : ""}">${w}</span>`).join("");

    // 변동사항 목록은 현재 달력에 표시 중인 달(y-m)의 항목만 노출
    const ym = `${y}-${_pad(m + 1)}`;
    const exList = (b.exceptions || []).filter((e) => e.date.indexOf(ym) === 0).slice().sort((a, c) => a.date.localeCompare(c.date));
    const exHtml = exList.length
      ? `<div class="mc__ex">` + exList.map((e) =>
          `<button class="mc__exrow" onclick="GARDEN.wbException('${e.date}')" title="수정 / 삭제">
            <i class="mc__exdot"></i><b>${e.date.slice(5).replace("-", "/")}</b><span>${esc(e.label)}</span>
          </button>`).join("") + `</div>`
      : `<p class="mc__hint">이번 달 변동사항이 없습니다.<br>날짜를 눌러 연휴·변경을 추가하세요.</p>`;

    return `
      <div class="mcal">
        <div class="mcal__head">
          <button class="mcal__nav" onclick="GARDEN.wbMonth(-1)" title="이전 달">‹</button>
          <span class="mcal__title">${y}년 ${m + 1}월</span>
          <button class="mcal__nav" onclick="GARDEN.wbMonth(1)" title="다음 달">›</button>
        </div>
        <div class="mc__wd">${wd}</div>
        <div class="mc__grid">${grid}</div>
        <div class="mcal__foot">
          <span class="mcal__legend"><i class="mc__dot mc__dot--legend"></i> 변동사항</span>
        </div>
        ${exHtml}
      </div>`;
  }

  function saveBoard() {
    try { localStorage.setItem(WB_KEY, JSON.stringify(_board)); } catch (e) {}
    pushBoardRemote();
  }
  function reBoard() { app.innerHTML = views.schedule(); }

  /* 비밀번호 확인 공통 헬퍼 */
  function checkPassword(pw, message) {
    if (!pw) return true;
    const input = window.prompt(message || "비밀번호를 입력하세요:");
    if (input === null) return false;
    if (input.trim() !== pw) { toast("비밀번호가 올바르지 않습니다", true); return false; }
    return true;
  }
  // 세션 통합 관리자 인증 — 한 번 확인하면 새로고침 전까지 유지
  let _adminOK = false;
  function ensureAdmin() {
    if (_adminOK) return true;
    const pw = String((window.CONFIG && (window.CONFIG.ADMIN_PASSWORD || window.CONFIG.RESET_PASSWORD)) || "").trim();
    if (!pw) { _adminOK = true; return true; }
    const input = window.prompt("관리자 확인 — 비밀번호를 입력하세요 (4자리)");
    if (input === null) return false;
    if (input.trim() !== pw) { toast("비밀번호가 올바르지 않습니다", true); return false; }
    _adminOK = true;
    return true;
  }
  function checkResetPw() { return ensureAdmin(); }
  function checkCrewPw() { return ensureAdmin(); }
  function checkSafetyPw() { return ensureAdmin(); }

  /* 시트 쓰기 (no-cors, debounce) */
  let _pushT = null;
  function pushBoardRemote() {
    const url = (window.CONFIG && window.CONFIG.API_URL || "").trim();
    if (!url || !(window.CONFIG && window.CONFIG.WRITE_BACK) || !_board) return;
    clearTimeout(_pushT);
    _pushT = setTimeout(() => {
      toast("시트에 저장 중…");
      fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ type: "weekBoard", data: _board }),
      })
        .then(() => toast("시트에 저장됨 ✓"))
        .catch((e) => { console.warn("[GARDEN] 시트 저장 실패:", e); toast("저장 실패 — 로컬만 저장됨", true); });
    }, 700);
  }

  /* 토스트 */
  let _toastEl = null, _toastT = null;
  function toast(msg, err) {
    if (!_toastEl) {
      _toastEl = document.createElement("div");
      _toastEl.className = "toast";
      document.body.appendChild(_toastEl);
    }
    _toastEl.textContent = msg;
    _toastEl.classList.toggle("toast--err", !!err);
    _toastEl.classList.add("is-on");
    clearTimeout(_toastT);
    _toastT = setTimeout(() => _toastEl.classList.remove("is-on"), 2000);
  }

  /* ---------- crew filter + board editing ---------- */
  const GARDEN = {
    filterCrew(q) {
      q = q.trim().toLowerCase();
      document.querySelectorAll("#crewBody tr").forEach((tr) => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    },

    /* --- 항목 편집 --- */
    wbEdit(elm) {
      const b = getBoard();
      const ai = +elm.dataset.a, day = elm.dataset.day, i = +elm.dataset.i;
      const val = elm.textContent.trim();
      if (!b.areas[ai]) return;
      if (val === "") { b.areas[ai].cells[day].splice(i, 1); saveBoard(); reBoard(); return; }
      b.areas[ai].cells[day][i] = val; saveBoard();
    },
    wbDel(ai, day, i) {
      if (!ensureAdmin()) return;
      const b = getBoard();
      b.areas[ai].cells[day].splice(i, 1); saveBoard(); reBoard();
    },
    wbAdd(ai, day) {
      const b = getBoard();
      (b.areas[ai].cells[day] = b.areas[ai].cells[day] || []).push("");
      saveBoard(); reBoard();
      // 새 항목에 포커스
      const spans = document.querySelectorAll(`.wbitem__t[data-a="${ai}"][data-day="${day}"]`);
      const last = spans[spans.length - 1];
      if (last) { last.focus(); }
    },
    wbArea(elm) {
      const b = getBoard();
      const ai = +elm.dataset.a;
      if (b.areas[ai]) { b.areas[ai].name = elm.textContent.trim(); saveBoard(); }
    },
    wbDelArea(ai) {
      if (!ensureAdmin()) return;
      const b = getBoard();
      if (b.areas.length <= 1) return;
      b.areas.splice(ai, 1); saveBoard(); reBoard();
    },
    wbAddArea() {
      const b = getBoard();
      const palette = ["var(--accent)", "var(--blue)", "var(--violet)", "var(--amber)", "var(--green)"];
      const cells = {}; b.days.forEach((d) => (cells[d.key] = []));
      b.areas.push({ name: "새 영역", color: palette[b.areas.length % palette.length], cells });
      saveBoard(); reBoard();
    },
    wbNote(elm) {
      const b = getBoard();
      b.note = elm.textContent.trim(); saveBoard();
    },
    wbReset() {
      if (!checkResetPw()) return;
      try { localStorage.removeItem(WB_KEY); } catch (e) {}
      _board = null; reBoard(); toast("기본값으로 초기화됨");
    },
    wbKey(ev, elm) {
      if (ev.key === "Enter") { ev.preventDefault(); elm.blur(); }
    },

    /* --- 달력 월 이동 --- */
    wbMonth(delta) {
      let m = _calYM.m + delta, y = _calYM.y;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      _calYM = { y, m };
      reBoard();
    },

    /* --- 변동사항 추가/수정/삭제 --- */
    /* --- 크루 로스터 --- */
    crewAddOpen() {
      if (document.getElementById("crewModal")) return;
      document.body.insertAdjacentHTML("beforeend", crewModal());
      const n = document.getElementById("cf_name"); if (n) n.focus();
    },
    crewAddClose() { const m = document.getElementById("crewModal"); if (m) m.remove(); },

    /* --- 크루 정보 보기 · 수정 · 삭제 --- */
    crewOpen(i) {
      if (document.getElementById("crewDetailModal")) return;
      document.body.insertAdjacentHTML("beforeend", crewDetailModal(i));
    },
    crewDetailClose() { const m = document.getElementById("crewDetailModal"); if (m) m.remove(); },
    crewDetailStatusChange(sel) {
      const fld = document.getElementById("cd_left_fld");
      if (fld) fld.style.display = sel.value === "out" ? "" : "none";
    },
    crewDetailSave(i) {
      const cr = getCrew(); if (!cr[i]) return;
      if (!checkCrewPw()) return;
      const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
      const name = v("cd_name");
      if (!name) { const n = document.getElementById("cd_name"); if (n) { n.focus(); n.style.borderColor = "var(--red)"; } return; }
      const status = v("cd_status") || "active";
      cr[i] = normalizeCrew([{
        name, store: v("cd_store"), role: v("cd_role"), since: v("cd_since"),
        status, disability: v("cd_dis"), tags: v("cd_tags"),
        left: status === "out" ? v("cd_left") : "", memo: v("cd_memo"),
      }])[0];
      saveCrew(); this.crewDetailClose(); reCrew(); toast("크루 정보 저장됨 ✓");
    },
    crewDetailDelete(i) {
      const cr = getCrew(); if (!cr[i]) return;
      if (!checkCrewPw()) return;
      if (!window.confirm(`${cr[i].name}님을 명단에서 삭제할까요? 되돌릴 수 없습니다.`)) return;
      cr.splice(i, 1); saveCrew(); this.crewDetailClose(); reCrew(); toast("크루 삭제됨 ✓");
    },
    crewAddSubmit() {
      const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
      const name = v("cf_name");
      if (!name) { const n = document.getElementById("cf_name"); if (n) { n.focus(); n.style.borderColor = "var(--red)"; } return; }
      const cr = getCrew();
      cr.push(normalizeCrew([{
        name, store: v("cf_store"), role: v("cf_role"), since: v("cf_since"),
        status: v("cf_status") || "active", disability: v("cf_dis"), tags: v("cf_tags"), memo: v("cf_memo"),
      }])[0]);
      saveCrew(); this.crewAddClose(); reCrew(); toast("크루 등록됨 ✓");
    },

    /* --- 각층 현황 --- */
    loadFloors(force) {
      const url = (window.CONFIG && window.CONFIG.API_URL || "").trim();
      const body = document.getElementById("floorsBody");
      if (!url) { if (body) body.innerHTML = floorsEmpty("API가 연결되지 않았습니다. js/config.js의 API_URL을 확인하세요."); return; }
      // 메모리 캐시 즉시 표시 (수동 새로고침이 아니면)
      if (_floorsCache && !force) { if (body) body.innerHTML = floorsRender(_floorsCache); return; }
      // 로컬 캐시가 있으면 즉시 표시 후 백그라운드 갱신 (stale-while-revalidate)
      if (!force && !_floorsCache) {
        const cached = readFloorsCache();
        if (cached) _floorsCache = cached;
      }
      if (_floorsCache) { if (body) body.innerHTML = floorsRender(_floorsCache); }
      else if (body) body.innerHTML = floorsSkeleton();
      // 백그라운드(또는 최초) 갱신 — 수동 새로고침 시 서버 캐시 우회
      fetch(url + "?action=floors&cb=" + Date.now() + (force ? "&refresh=1" : ""))
        .then((r) => r.json())
        .then((j) => {
          _floorsCache = j.floors || [];
          writeFloorsCache(_floorsCache);
          const b = document.getElementById("floorsBody"); if (b) b.innerHTML = floorsRender(_floorsCache);
        })
        .catch((e) => {
          console.warn("[GARDEN] 각층 현황 로드 실패:", e);
          const b = document.getElementById("floorsBody");
          if (b && !_floorsCache) b.innerHTML = floorsEmpty("불러오기에 실패했습니다. 새로고침을 눌러주세요.");
        });
    },
    flOpen(fi, pi) { _lb = { fi, pi }; flShow(); },
    flNav(d) { const ph = flPhotos(_lb.fi); if (!ph.length) return; _lb.pi = (_lb.pi + d + ph.length) % ph.length; flShow(); },
    flClose() { const el = document.getElementById("lightbox"); if (el) el.remove(); document.removeEventListener("keydown", flKey); },

    /* --- 산업안전보건 --- */
    loadSafetyFiles(force) {
      const url = (window.CONFIG && window.CONFIG.API_URL || "").trim();
      const mBody = document.getElementById("safetyManualBody");
      if (!url) {
        if (mBody) mBody.innerHTML = `<p class="muted">API가 연결되지 않았습니다. js/config.js의 API_URL을 확인하세요.</p>`;
        return;
      }
      if (_safetyCache && !force) {
        if (mBody) mBody.innerHTML = safetyManualBody(_safetyCache.manual, _safetyCache.folderUrl);
        return;
      }
      if (mBody) mBody.innerHTML = safetySkeleton();
      fetch(url + "?action=safety&cb=" + Date.now())
        .then((r) => r.json())
        .then((j) => {
          _safetyCache = { manual: j.manual || [], folderUrl: j.folderUrl || "" };
          const mb = document.getElementById("safetyManualBody"); if (mb) mb.innerHTML = safetyManualBody(_safetyCache.manual, _safetyCache.folderUrl);
        })
        .catch((e) => {
          console.warn("[GARDEN] 산업안전보건 자료 로드 실패:", e);
          const mb = document.getElementById("safetyManualBody"); if (mb) mb.innerHTML = `<p class="muted">불러오기에 실패했습니다. 새로고침을 눌러주세요.</p>`;
        });
    },
    safetyToggle(key) {
      _safetyExpand[key] = !_safetyExpand[key];
      if (key === "manual") {
        const mb = document.getElementById("safetyManualBody");
        if (mb && _safetyCache) mb.innerHTML = safetyManualBody(_safetyCache.manual, _safetyCache.folderUrl);
      } else {
        reSafety();
      }
    },
    safetyMeetingOpen(i) {
      if (document.getElementById("safetyMeetingModal")) return;
      document.body.insertAdjacentHTML("beforeend", safetyMeetingModal(i));
    },
    safetyMeetingClose() { const m = document.getElementById("safetyMeetingModal"); if (m) m.remove(); },
    safetyMeetingSave(i) {
      if (!checkSafetyPw()) return;
      const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
      const date = v("sm_date");
      if (!date) { const n = document.getElementById("sm_date"); if (n) { n.focus(); n.style.borderColor = "var(--red)"; } return; }
      const rec = { date, org: v("sm_org"), title: v("sm_title"), attendees: v("sm_attendees"), link: v("sm_link") };
      const list = getSafetyMeetings();
      if (i == null) list.push(rec); else if (list[i]) list[i] = rec; else return;
      saveSafetyMeetings(); this.safetyMeetingClose(); reSafety(); toast("회의 기록 저장됨 ✓");
    },
    safetyMeetingDelete(i) {
      if (!checkSafetyPw()) return;
      const list = getSafetyMeetings(); if (!list[i]) return;
      if (!window.confirm("이 회의 기록을 삭제할까요? 되돌릴 수 없습니다.")) return;
      list.splice(i, 1); saveSafetyMeetings(); this.safetyMeetingClose(); reSafety(); toast("회의 기록 삭제됨 ✓");
    },
    safetyMeetingQuickDelete(i) {
      if (!checkSafetyPw()) return;
      const list = getSafetyMeetings(); if (!list[i]) return;
      if (!window.confirm("이 회의 기록을 삭제할까요? 되돌릴 수 없습니다.")) return;
      list.splice(i, 1); saveSafetyMeetings(); reSafety(); toast("회의 기록 삭제됨 ✓");
    },

    safetyCheckOpen(i) {
      if (document.getElementById("safetyCheckModal")) return;
      document.body.insertAdjacentHTML("beforeend", safetyCheckModal(i));
    },
    safetyCheckClose() { const m = document.getElementById("safetyCheckModal"); if (m) m.remove(); },
    safetyCheckSave(i) {
      if (!checkSafetyPw()) return;
      const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
      const title = v("chk_title");
      if (!title) { const n = document.getElementById("chk_title"); if (n) { n.focus(); n.style.borderColor = "var(--red)"; } return; }
      const rec = {
        title, date: v("chk_date"), org: v("chk_org"), result: v("chk_result"),
        action: v("chk_action"), sentDate: v("chk_sent"), driveUrl: v("chk_drive"), done: v("chk_done") === "1",
      };
      const list = getSafetyChecks();
      if (i == null) list.push(rec); else if (list[i]) list[i] = rec; else return;
      saveSafetyChecks(); this.safetyCheckClose(); reSafety(); toast("점검 기록 저장됨 ✓");
    },
    safetyCheckDelete(i) {
      if (!checkSafetyPw()) return;
      const list = getSafetyChecks(); if (!list[i]) return;
      if (!window.confirm("이 점검 기록을 삭제할까요? 되돌릴 수 없습니다.")) return;
      list.splice(i, 1); saveSafetyChecks(); this.safetyCheckClose(); reSafety(); toast("점검 기록 삭제됨 ✓");
    },
    safetyCheckQuickDelete(i) {
      if (!checkSafetyPw()) return;
      const list = getSafetyChecks(); if (!list[i]) return;
      if (!window.confirm("이 점검 기록을 삭제할까요? 되돌릴 수 없습니다.")) return;
      list.splice(i, 1); saveSafetyChecks(); reSafety(); toast("점검 기록 삭제됨 ✓");
    },

    /* --- 사고 대응 이력 --- */
    incidentOpen(i) {
      if (document.getElementById("incidentModal")) return;
      document.body.insertAdjacentHTML("beforeend", incidentModal(i));
      const n = document.getElementById("sic_date"); if (n && i == null) n.focus();
    },
    incidentClose() { const m = document.getElementById("incidentModal"); if (m) m.remove(); },
    incidentSave(i) {
      if (!checkSafetyPw()) return;
      const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
      const date = v("sic_date");
      if (!date) { const n = document.getElementById("sic_date"); if (n) { n.focus(); n.style.borderColor = "var(--red)"; } return; }
      const content = v("sic_content");
      if (!content) { const n = document.getElementById("sic_content"); if (n) { n.focus(); n.style.borderColor = "var(--red)"; } return; }
      const rec = {
        date, type: v("sic_type") || "안전사고", place: v("sic_place"), status: v("sic_status") || "접수",
        resolvedDate: v("sic_resolved"), content, action: v("sic_action"), memo: v("sic_memo"),
      };
      const list = getIncidents();
      if (i == null) list.unshift(rec); else if (list[i]) list[i] = rec; else return;
      saveIncidents(); this.incidentClose(); reSafety(); toast("사고 이력 저장됨 ✓");
    },
    incidentDelete(i) {
      if (!checkSafetyPw()) return;
      const list = getIncidents(); if (!list[i]) return;
      if (!window.confirm("이 사고 이력을 삭제할까요? 되돌릴 수 없습니다.")) return;
      list.splice(i, 1); saveIncidents(); this.incidentClose(); reSafety(); toast("사고 이력 삭제됨 ✓");
    },
    incidentQuickDelete(i) {
      if (!checkSafetyPw()) return;
      const list = getIncidents(); if (!list[i]) return;
      if (!window.confirm("이 사고 이력을 삭제할까요? 되돌릴 수 없습니다.")) return;
      list.splice(i, 1); saveIncidents(); reSafety(); toast("사고 이력 삭제됨 ✓");
    },
    incidentCsv() {
      const list = getIncidents();
      const head = ["발생일", "사고유형", "발생장소", "처리상태", "해결일", "사고내용", "조치내용", "비고"];
      const rows = list.map((x) => [x.date, x.type, x.place, x.status, x.resolvedDate, x.content, x.action, x.memo]);
      const csv = [head].concat(rows).map((r) => r.map((c) => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `사고대응이력_${issueTodayStr()}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("CSV 내보내기 완료 ✓");
    },

    /* --- 식물 상태 점검 --- */
    plantTab(t) {
      if (t === "input" && !_plantAdmin) { this.plantAdminOpen(); return; }
      _plantTab = t; rePlants();
    },
    plantRound(r) { _plantRound = r; rePlants(); },
    plantGrade(z, r, g) {
      if (!_plantAdmin) { toast("관리자만 점검 입력이 가능합니다", true); return; }
      const p = getPlants();
      p.grades[z] = p.grades[z] || {};
      if (g === "") delete p.grades[z][r]; else p.grades[z][r] = g;
      savePlants(); toast("점검 저장됨 ✓"); rePlants();
    },
    plantIssue(z, r, v) {
      if (!_plantAdmin) { toast("관리자만 입력이 가능합니다", true); return; }
      const p = getPlants();
      p.issues[z] = p.issues[z] || {};
      if (String(v).trim() === "") delete p.issues[z][r]; else p.issues[z][r] = String(v).trim();
      savePlants(); toast("이슈 저장됨 ✓");
    },
    plantReset() {
      if (!_plantAdmin) { toast("관리자만 초기화할 수 있습니다", true); return; }
      if (!checkResetPw()) return;
      try { localStorage.removeItem(PL_KEY); } catch (e) {}
      _plants = null; rePlants(); toast("기본값으로 초기화됨");
    },

    /* --- 식물 점검 관리자 모드 --- */
    plantAdminOpen() {
      if (document.getElementById("plantAdminModal")) return;
      document.body.insertAdjacentHTML("beforeend", plantAdminModal());
      const n = document.getElementById("plant_pw"); if (n) n.focus();
    },
    plantAdminClose() { const m = document.getElementById("plantAdminModal"); if (m) m.remove(); },
    plantAdminSubmit() {
      const el = document.getElementById("plant_pw");
      const pw = el ? el.value.trim() : "";
      const target = String((window.CONFIG && window.CONFIG.PLANT_PASSWORD) || (window.CONFIG && window.CONFIG.RESET_PASSWORD) || "1234").trim();
      if (target && pw !== target) { toast("비밀번호가 올바르지 않습니다", true); if (el) { el.value = ""; el.focus(); } return; }
      _plantAdmin = true; _adminOK = true; _plantTab = "input"; this.plantAdminClose(); rePlants(); toast("관리자 모드 ✓");
    },
    plantAdminExit() { _plantAdmin = false; _plantTab = "matrix"; rePlants(); toast("관리자 모드 해제"); },
    plantZoneDelete(z) {
      if (!_plantAdmin) { toast("관리자만 구역을 삭제할 수 있습니다", true); return; }
      if (!window.confirm(`'${z}' 구역을 점검 목록에서 삭제할까요?\n해당 구역의 등급·이슈 기록도 함께 삭제됩니다.`)) return;
      const p = getPlants();
      p.removed = p.removed || [];
      p.added = (p.added || []).filter((a) => a.zone !== z); // 추가했던 구역이면 추가 목록에서 제거
      if (p.removed.indexOf(z) < 0) p.removed.push(z);
      delete p.grades[z]; delete p.issues[z];
      savePlants(); rePlants(); toast(`'${z}' 삭제됨 ✓`);
    },
    plantZoneAdd(area) {
      if (!_plantAdmin) { toast("관리자만 구역을 추가할 수 있습니다", true); return; }
      const input = window.prompt(`'${area}'에 추가할 관리 구역 이름을 입력하세요.\n(예: 일반오피스 2A)`, "");
      if (input === null) return;
      const zone = input.trim();
      if (!zone) return;
      const p = getPlants();
      p.removed = (p.removed || []).filter((z) => z !== zone); // 삭제됐던 동명 구역이면 복원
      p.added = p.added || [];
      const inConfig = (D.plantZones || []).some((g) => g.zones.indexOf(zone) >= 0);
      const inAdded = p.added.some((a) => a.zone === zone);
      if (!inConfig && !inAdded) p.added.push({ area, zone });
      savePlants(); rePlants(); toast(`'${zone}' 추가됨 ✓`);
    },

    /* --- 식물 이슈 관리 --- */
    issueMode(m) {
      _issuePeriodMode = m;
      if (m === "month") { const n = new Date(); if (_issueYear === n.getFullYear() && !_issueMonth) _issueMonth = n.getMonth() + 1; }
      reIssues();
    },
    issuePeriodStep(delta) {
      if (_issuePeriodMode === "year") { _issueYear += delta; }
      else {
        _issueMonth += delta;
        if (_issueMonth > 12) { _issueMonth = 1; _issueYear += 1; }
        if (_issueMonth < 1) { _issueMonth = 12; _issueYear -= 1; }
      }
      reIssues();
    },
    issueSearch(v) {
      _issueQuery = String(v).trim().toLowerCase();
      const b = document.getElementById("issBody");
      if (b) b.innerHTML = renderIssueBody();
    },
    issueAddOpen() {
      if (document.getElementById("issueFormModal")) return;
      document.body.insertAdjacentHTML("beforeend", issueFormModal(null));
      const n = document.getElementById("if_date"); if (n) n.focus();
    },
    issueEdit(i) {
      this.issueDetailClose();
      if (document.getElementById("issueFormModal")) return;
      document.body.insertAdjacentHTML("beforeend", issueFormModal(i));
    },
    issueClose() { const m = document.getElementById("issueFormModal"); if (m) m.remove(); },
    issueSave(i) {
      if (i != null && !ensureAdmin()) return; // 기존 이슈 수정은 관리자 확인
      const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
      const date = v("if_date");
      if (!date) { const n = document.getElementById("if_date"); if (n) { n.focus(); n.style.borderColor = "var(--red)"; } return; }
      const chk = document.getElementById("if_recur");
      const rec = {
        date, building: v("if_building"), location: v("if_loc"), category: v("if_cat"),
        detail: v("if_detail"), species: v("if_species"), urgency: v("if_urg"), status: v("if_status") || "접수",
        assignee: v("if_assignee"), action: v("if_action"), photoUrl: v("if_photo"), recur: !!(chk && chk.checked),
        doneAt: v("if_done"), memo: v("if_memo"),
      };
      if (rec.status === "완료" && !rec.doneAt) rec.doneAt = issueTodayStr();
      const list = getIssues();
      if (i == null) list.unshift(rec); else if (list[i]) list[i] = rec; else return;
      saveIssues(); this.issueClose(); reIssues(); toast("이슈 저장됨 ✓");
    },
    issueOpen(i) {
      if (document.getElementById("issueDetailModal")) return;
      document.body.insertAdjacentHTML("beforeend", issueDetailModal(i));
    },
    issueDetailClose() { const m = document.getElementById("issueDetailModal"); if (m) m.remove(); },
    issueDelete(i) {
      if (!ensureAdmin()) return;
      const list = getIssues(); if (!list[i]) return;
      if (!window.confirm("이 이슈를 삭제할까요? 되돌릴 수 없습니다.")) return;
      list.splice(i, 1); saveIssues(); this.issueDetailClose(); reIssues(); toast("이슈 삭제됨 ✓");
    },
    issueQuickDone(i) {
      if (!ensureAdmin()) return;
      const list = getIssues(); if (!list[i]) return;
      list[i].status = "완료";
      if (!list[i].doneAt) list[i].doneAt = issueTodayStr();
      saveIssues(); this.issueDetailClose(); reIssues(); toast("완료 처리됨 ✓");
    },

    /* --- 크루 교육 관리 --- */
    trainingYear(y) { _eduYear = String(y); reTraining(); },
    trainingOpen(name, key) {
      if (document.getElementById("trainingModal")) return;
      document.body.insertAdjacentHTML("beforeend", trainingModal(name, key));
    },
    trainingAddOpen() {
      if (document.getElementById("trainingModal")) return;
      document.body.insertAdjacentHTML("beforeend", trainingModal(null, null));
      const n = document.getElementById("tf_name"); if (n) n.focus();
    },
    trainingClose() { const m = document.getElementById("trainingModal"); if (m) m.remove(); },
    trainingSave() {
      const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
      const name = v("tf_name"), key = v("tf_key"), date = v("tf_date");
      if (!name) { const n = document.getElementById("tf_name"); if (n) { n.focus(); n.style.borderColor = "var(--red)"; } return; }
      const year = eduCurYear();
      const list = getTraining();
      const idx = list.findIndex((r) => r.name === name && r.key === key && String(r.year) === String(year));
      if (idx >= 0 && !ensureAdmin()) return; // 기존 이수 기록 수정/해제는 관리자 확인
      if (!date) {
        // 이수일 없음 → 미이수 처리 (기존 기록 제거)
        if (idx >= 0) { list.splice(idx, 1); saveTraining(); this.trainingClose(); reTraining(); toast("미이수로 처리됨"); return; }
        const n = document.getElementById("tf_date"); if (n) { n.focus(); n.style.borderColor = "var(--red)"; } return;
      }
      const rec = { name, key, year, date, method: v("tf_method"), certUrl: "", memo: v("tf_memo") };
      if (idx >= 0) list[idx] = rec; else list.push(rec);
      saveTraining(); this.trainingClose(); reTraining(); toast("이수 기록 저장됨 ✓");
    },
    trainingDelete() {
      if (!ensureAdmin()) return;
      const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
      const name = v("tf_name"), key = v("tf_key"), year = eduCurYear();
      const list = getTraining();
      const idx = list.findIndex((r) => r.name === name && r.key === key && String(r.year) === String(year));
      if (idx >= 0) { list.splice(idx, 1); saveTraining(); }
      this.trainingClose(); reTraining(); toast("미이수로 변경됨");
    },
    trainingCsv() {
      const year = eduCurYear();
      const crew = eduCrew();
      const recs = getTraining().filter((r) => String(r.year) === String(year));
      const doneOf = (name, key) => recs.find((r) => r.name === name && r.key === key) || null;
      const head = ["가드너"].concat(EDU_TRAININGS.map((t) => t.full)).concat(["완료율"]);
      const rows = crew.map((c) => {
        let d = 0;
        const cells = EDU_TRAININGS.map((t) => {
          const r = doneOf(c.name, t.key);
          if (r) { d++; return r.date + (r.method ? " (" + r.method + ")" : ""); }
          return "미이수";
        });
        return [c.name].concat(cells).concat([Math.round((d / EDU_TRAININGS.length) * 100) + "%"]);
      });
      const csv = [head].concat(rows).map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\r\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `크루교육이수_${year}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("CSV 내보내기 완료 ✓");
    },

    /* --- 운영 정산 관리 --- */
    settlePlace(c) { _settlePlace = c; reSettle(); },
    settleSearch(v) {
      _settleQuery = String(v).trim().toLowerCase();
      const b = document.querySelector(".stl-table tbody");
      if (b) b.innerHTML = settleRows();
    },
    settleAddOpen() {
      if (document.getElementById("settleModal")) return;
      document.body.insertAdjacentHTML("beforeend", settleModal(null));
      const n = document.getElementById("st_date"); if (n) n.focus();
    },
    settleOpen(i) {
      if (document.getElementById("settleModal")) return;
      document.body.insertAdjacentHTML("beforeend", settleModal(i));
    },
    settleClose() { const m = document.getElementById("settleModal"); if (m) m.remove(); },
    settleSave(i) {
      if (i != null && !ensureAdmin()) return; // 기존 정산 내역 수정은 관리자 확인
      const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
      const date = v("st_date"), title = v("st_title"), amount = v("st_amount");
      if (!date) { const n = document.getElementById("st_date"); if (n) { n.focus(); n.style.borderColor = "var(--red)"; } return; }
      if (!title) { const n = document.getElementById("st_title"); if (n) { n.focus(); n.style.borderColor = "var(--red)"; } return; }
      if (amount === "") { const n = document.getElementById("st_amount"); if (n) { n.focus(); n.style.borderColor = "var(--red)"; } return; }
      const rec = {
        date, place: v("st_place") || "", category: v("st_cat") || "기타", title, vendor: v("st_vendor"),
        amount: Number(amount) || 0, status: v("st_status") || "예정",
        paidDate: v("st_paid"), statementUrl: v("st_stmt"), memo: v("st_memo"),
      };
      const list = getSettle();
      if (i == null) list.unshift(rec); else if (list[i]) list[i] = rec; else return;
      saveSettle(); this.settleClose(); reSettle(); toast("정산 내역 저장됨 ✓");
    },
    settleDelete(i) {
      if (!ensureAdmin()) return;
      const list = getSettle(); if (!list[i]) return;
      if (!window.confirm("이 정산 내역을 삭제할까요? 되돌릴 수 없습니다.")) return;
      list.splice(i, 1); saveSettle(); this.settleClose(); reSettle(); toast("정산 내역 삭제됨 ✓");
    },
    settleCsv() {
      const list = getSettle();
      const head = ["작업일", "장소", "구분", "작업내용", "거래처", "비용", "상태", "정산일", "명세서", "비고"];
      const rows = list.map((x) => [x.date, x.place, x.category, x.title, x.vendor, x.amount, x.status, x.paidDate, x.statementUrl, x.memo]);
      const total = list.reduce((s, x) => s + (Number(x.amount) || 0), 0);
      rows.push(["합계", "", "", "", "", total, "", "", "", ""]);
      const csv = [head].concat(rows).map((r) => r.map((c) => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `운영정산_${issueTodayStr()}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("CSV 내보내기 완료 ✓");
    },

    wbException(dateStr) {
      const b = getBoard();
      b.exceptions = b.exceptions || [];
      const idx = b.exceptions.findIndex((e) => e.date === dateStr);
      const cur = idx >= 0 ? b.exceptions[idx].label : "";
      const md = dateStr.slice(5).replace("-", "/");
      const val = window.prompt(md + " 변동사항 (예: 제헌절 휴무 · 연차 · 우천 순연)\n비우면 삭제됩니다.", cur);
      if (val === null) return;
      if (val.trim() === "") {
        if (idx >= 0) b.exceptions.splice(idx, 1);
      } else if (idx >= 0) {
        b.exceptions[idx].label = val.trim();
      } else {
        b.exceptions.push({ date: dateStr, label: val.trim() });
      }
      saveBoard(); reBoard();
    },
  };
  window.GARDEN = GARDEN;

  /* ---------- theme ---------- */
  const root = document.documentElement;
  const themeBtn = document.getElementById("themeToggle");
  const themeLabel = document.getElementById("themeLabel");
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    themeLabel.textContent = t === "dark" ? "DARK" : "LIGHT";
    try { localStorage.setItem("garden-theme", t); } catch (e) {}
  }
  themeBtn.addEventListener("click", () =>
    applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark"));
  try {
    const saved = localStorage.getItem("garden-theme");
    if (saved) applyTheme(saved);
  } catch (e) {}

  /* ---------- data source: Apps Script API → fallback mock ---------- */
  function loadRemote() {
    const url = (window.CONFIG && window.CONFIG.API_URL || "").trim();
    if (!url) return; // API 미설정 → 목 데이터 유지
    fetch(url, { redirect: "follow" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json) => {
        _booting = false;
        if (json && typeof json === "object") {
          // 빈 값(빈 배열/빈 문자열)은 무시 → 백엔드 미설정 시 목 데이터 보존
          Object.keys(json).forEach((k) => {
            const v = json[k];
            if (v == null) return;
            if (Array.isArray(v) && v.length === 0) return;
            if (typeof v === "string" && v === "") return;
            D[k] = v;
          });
          // 로컬 편집이 없으면 시트 데이터로 보드 갱신
          let hasLocal = false;
          try { hasLocal = !!localStorage.getItem(WB_KEY); } catch (e) {}
          if (!hasLocal) _board = null;
          let hasPl = false;
          try { hasPl = !!localStorage.getItem(PL_KEY); } catch (e) {}
          if (!hasPl) _plants = null;   // 로컬 편집 없으면 시트 데이터로 갱신
          // 크루는 시트가 항상 최신 소스 — 로컬 캐시가 있어도 새로 불러온 시트 데이터로 갱신
          // (편집은 어차피 즉시 시트로 저장되므로, 로컬 캐시를 우선하면 시트 직접 수정분이 반영되지 않음)
          _crew = null;
          try { localStorage.removeItem(CREW_KEY); } catch (e) {}
          // 산업안전보건 회의·점검 기록도 시트가 항상 최신 소스
          _safetyMeetings = null;
          try { localStorage.removeItem(SAFETY_KEY); } catch (e) {}
          _safetyChecks = null;
          try { localStorage.removeItem(CHECK_KEY); } catch (e) {}
          _safetyIncidents = null;
          try { localStorage.removeItem(SIC_KEY); } catch (e) {}
          // 식물 이슈도 시트가 항상 최신 소스 (여러 담당자 이력 누적)
          _issues = null;
          try { localStorage.removeItem(PI_KEY); } catch (e) {}
          // 크루 교육 이수도 시트가 항상 최신 소스
          _training = null;
          try { localStorage.removeItem(EDU_KEY); } catch (e) {}
          // 운영 정산도 시트가 항상 최신 소스
          _settle = null;
          try { localStorage.removeItem(STL_KEY); } catch (e) {}
          render(currentView());    // 다시 렌더
        } else {
          render(currentView());    // 스켈레톤 해제
        }
      })
      .catch((err) => {
        _booting = false;
        console.warn("[GARDEN] API 로드 실패, 목 데이터 사용:", err);
        render(currentView());       // 스켈레톤 해제 (빈 상태/목 데이터 표시)
      });
  }

  /* ---------- boot ---------- */
  if ((window.CONFIG && window.CONFIG.API_URL || "").trim()) _booting = true;
  render(currentView());
  loadRemote();
})();
