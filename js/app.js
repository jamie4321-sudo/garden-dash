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
      const rows = D.crew.map((c) => {
        const s = statusMap[c.status];
        const tags = c.tags.map((t) => `<span class="tag">${t}</span>`).join("");
        return `<tr>
          <td class="crew-name"><span class="gdot" style="background:${s.dot}"></span>
            <b>${c.name}</b><span class="t">${c.store}</span></td>
          <td class="mono">${c.role}</td>
          <td><span class="badge ${s.cls}">${s.label}</span></td>
          <td><div class="tagset">${tags}</div></td>
          <td class="num muted">${c.since}</td>
        </tr>`;
      }).join("");
      return `
        <section class="view">
          <div class="page-head">
            <div><p class="eyebrow">Crew</p><h2>크루 로스터</h2>
              <p class="sub">재직 ${D.crew.filter(c=>c.status==="active").length} · 휴직 ${D.crew.filter(c=>c.status==="leave").length} · 퇴사 ${D.crew.filter(c=>c.status==="out").length}</p></div>
            <button class="btn btn--primary btn--sm">＋ 크루 등록</button>
          </div>
          <div class="toolbar-row">
            <input class="searchbox" placeholder="이름 · 매장 · 태그 검색" oninput="GARDEN.filterCrew(this.value)"/>
          </div>
          <div class="table-wrap">
            <table class="grid-table">
              <thead><tr><th>이름 / 매장</th><th>구분</th><th>상태</th><th>태그</th><th class="num">입사</th></tr></thead>
              <tbody id="crewBody">${rows}</tbody>
            </table>
          </div>
        </section>`;
    },

    schedule() {
      const days = D.schedule.map((d) => {
        const evs = d.events.map((e) =>
          `<div class="evt"><span class="evt__cat" style="background:${e.cat}"></span>
            <span class="evt__body"><span class="evt__time">${e.time}</span>
            <span class="evt__text">${e.text}</span></span></div>`
        ).join("");
        return `<div class="day ${d.today ? "is-today" : ""}">
          <div class="day__head"><span class="day__date">${d.date}<small>${d.day}</small></span>
            <span class="day__count">${d.events.length}건</span></div>
          <div class="day__body">${evs}</div>
        </div>`;
      }).join("");
      return `
        <section class="view">
          <div class="page-head">
            <div><p class="eyebrow">Operation</p><h2>주간 스케줄</h2>
              <p class="sub">2026년 7월 4주차 · 월–금</p></div>
            <button class="btn btn--primary btn--sm">＋ 일정 등록</button>
          </div>
          <p class="week-label">This Week</p>
          <div class="week">${days}</div>
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

  /* ---------- crew filter ---------- */
  const GARDEN = {
    filterCrew(q) {
      q = q.trim().toLowerCase();
      document.querySelectorAll("#crewBody tr").forEach((tr) => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
      });
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

  /* ---------- boot ---------- */
  render(currentView());
})();
