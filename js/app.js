/* =========================================================
   GARDEN — app / router / renderers
   ========================================================= */
(function () {
  "use strict";
  const D = window.DATA;
  const app = document.getElementById("app");
  const crumb = document.getElementById("crumb");

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

  /* ---------- VIEWS ---------- */
  const views = {
    dashboard() {
      const stats = D.kpi.map((k) =>
        `<div class="stat ${k.variant ? "stat--" + k.variant : ""}">
          <div class="stat__num">${k.num}<small>${k.unit}</small></div>
          <div class="stat__label">${k.label}</div>
          <div class="stat__sub ${k.trend}">${k.sub}</div>
        </div>`
      ).join("");
      return `
        <section class="view">
          <div class="page-head">
            <div>
              <p class="eyebrow">Overview · ${D.asOf}</p>
              <h2>운영 대시보드</h2>
              <p class="sub">SNACK &amp; GARDEN 전 매장 현황을 한눈에</p>
            </div>
            <div class="seg">
              <button class="btn btn--sm">주간</button>
              <button class="btn btn--sm is-on">월간</button>
              <button class="btn btn--primary btn--sm">＋ 리포트</button>
            </div>
          </div>
          <div class="stats">${stats}</div>
          <div class="dash-grid">${donut(D.crewMix)}${bars(D.storeSales)}</div>
          <div class="split-2">${spark(D.weekTrend)}${todos(D.todos)}</div>
        </section>`;
    },

    crew() {
      const crew = D.crew || [];
      const total = crew.length;

      // 장애 분류
      const disType = (c) => (c.disability == null ? "" : String(c.disability).trim());
      const isNon = (c) => disType(c) === "비장애";
      const isDis = (c) => { const d = disType(c); return d && d !== "비장애"; };
      const disList = crew.filter(isDis);
      const nonList = crew.filter(isNon);
      const unclCount = total - disList.length - nonList.length;
      const pct = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0);

      // 유형별 집계
      const typeMap = {};
      disList.forEach((c) => { const d = disType(c); typeMap[d] = (typeMap[d] || 0) + 1; });
      const types = Object.keys(typeMap).map((k) => [k, typeMap[k]]).sort((a, b) => b[1] - a[1]);

      // --- 도넛 (장애 · 비장애 현황) ---
      const segs = [
        { label: "장애", val: disList.length, color: "var(--accent)" },
        { label: "비장애", val: nonList.length, color: "var(--slate)" },
      ];
      if (unclCount > 0) segs.push({ label: "미분류", val: unclCount, color: "var(--line)" });
      const dTotal = total || 1;
      const RC = 2 * Math.PI * 70;
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
          <span class="dleg__pct">${pct(s.val)}%</span></li>`
      ).join("");
      const donutCard = `
        <div class="dash-card dash-card--donut">
          <div class="card-head"><h3>장애 · 비장애 현황</h3><span class="chip-mono">${total}명</span>
            <span class="asof" style="margin-left:auto">'26년 7월 기준</span></div>
          <div class="donut-wrap">
            <svg class="donut" viewBox="0 0 190 190">
              ${rings}
              <text class="donut__num" x="95" y="92" text-anchor="middle">${total}</text>
              <text class="donut__unit" x="95" y="110" text-anchor="middle">전체 크루</text>
            </svg>
            <ul class="dleg">${legend}</ul>
          </div>
        </div>`;

      // --- 바 (장애유형별 분포) ---
      const maxT = types.length ? types[0][1] : 1;
      const typeBars = types.length
        ? types.map(([name, val]) =>
            `<div class="tbar">
              <span class="tbar__label"><span class="gdot" style="background:${disColor(name)}"></span>${esc(name)}</span>
              <span class="tbar__track"><span class="tbar__fill" data-pct="${Math.round((val / maxT) * 100)}" style="background:${disColor(name)}"></span></span>
              <span class="tbar__val">${val}<small>명</small></span>
            </div>`
          ).join("")
        : `<p class="muted" style="margin:6px 0">장애 유형 데이터가 없습니다. 시트 <b>crew</b> 탭에 <b>disability</b> 컬럼을 채워주세요.</p>`;
      const typeCard = `
        <div class="dash-card">
          <div class="card-head"><h3>장애유형별 분포</h3><span class="chip-mono">${disList.length}명</span></div>
          <div class="tbars">${typeBars}</div>
        </div>`;

      // --- 테이블 ---
      const rows = crew.map((c) => {
        const s = statusMap[c.status] || statusMap.active;
        const tags = (c.tags || []).map((t) => `<span class="tag">${t}</span>`).join("");
        const d = disType(c);
        const disCell = d
          ? `<span class="dis" style="--dc:${disColor(d)}"><span class="dis__dot"></span>${esc(d)}</span>`
          : `<span class="muted">—</span>`;
        return `<tr>
          <td class="crew-name"><span class="gdot" style="background:${s.dot}"></span>
            <b>${esc(c.name)}</b><span class="t">${esc(c.store)}</span></td>
          <td class="mono">${esc(c.role)}</td>
          <td><span class="badge ${s.cls}">${s.label}</span></td>
          <td>${disCell}</td>
          <td><div class="tagset">${tags}</div></td>
          <td class="num muted">${esc(c.since)}</td>
        </tr>`;
      }).join("");

      return `
        <section class="view">
          <div class="page-head">
            <div><p class="eyebrow">Crew</p><h2>크루 로스터</h2>
              <p class="sub">재직 ${crew.filter(c=>c.status==="active").length} · 휴직 ${crew.filter(c=>c.status==="leave").length} · 퇴사 ${crew.filter(c=>c.status==="out").length}</p></div>
            <button class="btn btn--primary btn--sm">＋ 크루 등록</button>
          </div>
          <div class="dash-grid">${donutCard}${typeCard}</div>
          <div class="toolbar-row">
            <input class="searchbox" placeholder="이름 · 매장 · 태그 · 장애유형 검색" oninput="GARDEN.filterCrew(this.value)"/>
          </div>
          <div class="table-wrap">
            <table class="grid-table">
              <thead><tr><th>이름 / 매장</th><th>구분</th><th>상태</th><th>장애유형</th><th>태그</th><th class="num">입사</th></tr></thead>
              <tbody id="crewBody">${rows}</tbody>
            </table>
          </div>
        </section>`;
    },

    schedule() {
      const b = getBoard();
      const cal = D.cal || { title: "", weeks: [] };

      // 미니 달력
      const calRows = cal.weeks.map((wk) =>
        `<div class="mcal__row">` + wk.map((c) =>
          `<span class="mcal__d ${c.out ? "is-out" : ""} ${c.act ? "is-act" : ""} ${c.today ? "is-today" : ""}">${c.d}</span>`
        ).join("") + `</div>`
      ).join("");
      const calCard = `
        <div class="mcal">
          <div class="mcal__head">
            <button class="mcal__nav" title="이전 달">‹</button>
            <span class="mcal__title">${cal.title}</span>
            <button class="mcal__nav" title="다음 달">›</button>
          </div>
          <div class="mcal__wd">${["월","화","수","목","금","토"].map((d)=>`<span>${d}</span>`).join("")}</div>
          ${calRows}
        </div>`;

      // 헤더 (요일)
      const headCols = b.days.map((d) =>
        `<th class="wb-th ${d.today ? "is-today" : ""}"><span class="wb-th__d">${d.label}</span><span class="wb-th__date">${d.date}</span></th>`
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
          return `<td class="wbcell ${d.today ? "is-today" : ""}">
            <div class="wbcell__body">${lis || '<span class="wbcell__empty">–</span>'}</div>
            <button class="wbadd" title="항목 추가" onclick="GARDEN.wbAdd(${ai},'${d.key}')">＋</button>
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
            <div><p class="eyebrow">Operation</p><h2>영역별 주간 작업 스케줄</h2>
              <p class="sub">${b.month} · ${b.range}</p></div>
            <div class="seg">
              <button class="btn btn--sm" onclick="GARDEN.wbReset()">초기화</button>
              <button class="btn btn--primary btn--sm" onclick="GARDEN.wbAddArea()">＋ 영역 추가</button>
            </div>
          </div>
          <div class="wb-layout">
            ${calCard}
            <div class="wb-board">
              <div class="wb-board__head">
                <h3>주간 스케줄</h3>
                <span class="asof">${b.range}</span>
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
  };

  const crumbMap = {
    dashboard: "MAIN / DASHBOARD",
    crew: "CREW / ROSTER",
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
    window.scrollTo(0, 0);
  }

  function currentView() { return (location.hash || "#dashboard").replace("#", ""); }
  window.addEventListener("hashchange", () => render(currentView()));

  /* ---------- weekBoard state (localStorage overlay) ---------- */
  const WB_KEY = "garden-weekboard";
  let _board = null;
  function getBoard() {
    if (_board) return _board;
    try {
      const saved = localStorage.getItem(WB_KEY);
      if (saved) { _board = JSON.parse(saved); return _board; }
    } catch (e) {}
    _board = JSON.parse(JSON.stringify(D.weekBoard || { days: [], areas: [], note: "" }));
    return _board;
  }
  function saveBoard() {
    try { localStorage.setItem(WB_KEY, JSON.stringify(_board)); } catch (e) {}
    pushBoardRemote();
  }
  function reBoard() { app.innerHTML = views.schedule(); }

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
      if (!confirm("주간 스케줄을 기본값으로 되돌릴까요? (편집 내용 삭제)")) return;
      try { localStorage.removeItem(WB_KEY); } catch (e) {}
      _board = null; reBoard();
    },
    wbKey(ev, elm) {
      if (ev.key === "Enter") { ev.preventDefault(); elm.blur(); }
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
          render(currentView());    // 다시 렌더
        }
      })
      .catch((err) => console.warn("[GARDEN] API 로드 실패, 목 데이터 사용:", err));
  }

  /* ---------- boot ---------- */
  render(currentView());
  loadRemote();
})();
