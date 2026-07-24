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

  /* 크루 요약 카드 (대시보드 · 크루 공용) */
  function crewStatusCard(title) {
    const crew = D.crew || [];
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
    const crew = D.crew || [];
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

  /* ===== 각층 현황 (구글 드라이브) ===== */
  const FLOOR_PARENT = "1JF5VTpU-ldB2jbIZlQUBlPXYof56Bp1s";
  let _floorsCache = null;

  function floorsRender(floors) {
    if (!floors || !floors.length) return floorsEmpty("아직 등록된 층 폴더가 없습니다.");
    const cards = floors.map((f) => {
      const cover = f.photos && f.photos[0];
      const thumbs = (f.photos || []).slice(0, 6).map((p) =>
        `<a class="fl-thumb" href="${p.view}" target="_blank" rel="noopener" title="${esc(p.name)}"
          style="background-image:url('${p.thumb}')"></a>`).join("");
      const coverHtml = cover
        ? `<a class="fl-card__cover" href="${cover.view}" target="_blank" rel="noopener" style="background-image:url('${cover.thumb}')">
            <span class="fl-card__date">${esc(cover.updated)}</span></a>`
        : `<a class="fl-card__cover fl-card__cover--empty" href="${f.folderUrl}" target="_blank" rel="noopener"><span>＋ 사진 추가</span></a>`;
      return `<div class="fl-card">
        ${coverHtml}
        <div class="fl-card__body">
          <div class="fl-card__head"><span class="fl-card__name">${esc(f.name)}</span>
            <span class="fl-card__count">${f.count}장</span></div>
          <div class="fl-thumbs">${thumbs || '<span class="fl-none">담당자가 사진을 올리면 표시됩니다</span>'}</div>
          <a class="fl-card__link" href="${f.folderUrl}" target="_blank" rel="noopener">폴더 열기 ↗</a>
        </div>
      </div>`;
    }).join("");
    return `<div class="fl-grid">${cards}</div>`;
  }
  function floorsSkeleton() {
    return `<div class="fl-grid">` + Array.from({ length: 6 }).map(() =>
      `<div class="fl-card"><div class="fl-sk fl-sk--cover"></div>
        <div class="fl-card__body"><div class="fl-sk fl-sk--line"></div><div class="fl-sk fl-sk--thumbs"></div></div></div>`).join("") + `</div>`;
  }
  function floorsEmpty(msg) {
    return `<div class="fl-empty"><p>${esc(msg)}</p>
      <a class="btn btn--sm" href="https://drive.google.com/drive/folders/${FLOOR_PARENT}" target="_blank" rel="noopener">드라이브 폴더 열기</a></div>`;
  }

  /* ===== 식물 상태 점검 ===== */
  const PL_KEY = "garden-plants";
  const PLANT_GRADES = ["A", "B", "C", "D"];
  const GRADE_COLORS = { A: "var(--green)", B: "var(--blue)", C: "var(--amber)", D: "var(--red)" };
  let _plants = null, _plantTab = "input", _plantRound = null;

  function getPlants() {
    if (_plants) return _plants;
    try { const s = localStorage.getItem(PL_KEY); if (s) _plants = JSON.parse(s); } catch (e) {}
    if (!_plants) _plants = { grades: JSON.parse(JSON.stringify(D.plantGrades || {})), issues: {} };
    _plants.grades = _plants.grades || {};
    _plants.issues = _plants.issues || {};
    return _plants;
  }
  function savePlants() { try { localStorage.setItem(PL_KEY, JSON.stringify(_plants)); } catch (e) {} }
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
    return (D.plantZones || []).map((g) => {
      const rows = g.zones.map((z) => {
        const cur = gradeOf(z, round);
        const segs = PLANT_GRADES.map((gr) =>
          `<button class="pgrade ${cur === gr ? "is-on" : ""}" style="--gc:${GRADE_COLORS[gr]}"
            onclick="GARDEN.plantGrade('${esc(z)}','${round}','${gr}')">${gr}</button>`).join("");
        const clr = `<button class="pgrade pgrade--clr ${!cur ? "is-on" : ""}" title="미점검"
          onclick="GARDEN.plantGrade('${esc(z)}','${round}','')">—</button>`;
        return `<div class="prow">
          <span class="prow__z">${esc(z)}</span>
          <span class="pgrades">${segs}${clr}</span>
          <input class="prow__issue" placeholder="이슈 메모 (선택)" value="${esc(issueOf(z, round))}"
            onchange="GARDEN.plantIssue('${esc(z)}','${round}',this.value)"/>
        </div>`;
      }).join("");
      const gdone = g.zones.filter((z) => gradeOf(z, round)).length;
      return `<div class="pgroup">
        <div class="pgroup__head"><span class="pgroup__name">${esc(g.area)}</span>
          <span class="pgroup__n">${gdone} / ${g.zones.length}</span></div>
        ${rows}
      </div>`;
    }).join("");
  }
  function plantMatrixBody() {
    const rounds = D.plantRounds || [];
    const cr = curRound();
    const head = `<th class="pm-z">구역</th>` + rounds.map((r) =>
      `<th class="pm-r ${r === cr ? "is-cur" : ""}">${r}</th>`).join("");
    const body = (D.plantZones || []).map((g) => {
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
    const allZones = (D.plantZones || []).flatMap((g) => g.zones);
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
      const crew = D.crew || [];
      const disType = (c) => (c.disability == null ? "" : String(c.disability).trim());

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
          <div class="dash-grid">${crewStatusCard("장애 · 비장애 현황")}${crewTypeCard()}</div>
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
      const round = curRound();
      const allZones = (D.plantZones || []).flatMap((g) => g.zones);
      const total = allZones.length;
      const done = allZones.filter((z) => gradeOf(z, round)).length;
      const pctDone = total ? Math.round((done / total) * 100) : 0;
      const RCR = 2 * Math.PI * 30;

      const tabs = [["input", "점검 입력"], ["matrix", "현황 매트릭스"], ["stats", "통계 요약"]]
        .map(([k, l]) => `<button class="ptab ${_plantTab === k ? "is-on" : ""}" onclick="GARDEN.plantTab('${k}')">${l}</button>`).join("");
      const roundSel = (D.plantRounds || [])
        .map((r) => `<button class="pround ${r === round ? "is-on" : ""}" onclick="GARDEN.plantRound('${r}')">${r}</button>`).join("");

      let body;
      if (_plantTab === "matrix") body = plantMatrixBody();
      else if (_plantTab === "stats") body = `<div class="proundbar"><span class="proundbar__lbl">회차</span>${roundSel}</div>${plantStatsBody(round)}`;
      else body = `<div class="proundbar"><span class="proundbar__lbl">점검 회차</span>${roundSel}</div>${plantInputBody(round)}`;

      return `
        <section class="view">
          <div class="page-head">
            <div><p class="eyebrow">Crew · 식물 관리</p><h2>식물 상태 점검</h2>
              <p class="sub">구역별 체크리스트로 점검하고 이슈를 기록합니다 · 2개월 주기 (2·4·7·10·12월)</p></div>
            <button class="btn btn--sm" onclick="GARDEN.plantReset()">초기화</button>
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
              <a class="btn btn--sm" href="https://drive.google.com/drive/folders/${FLOOR_PARENT}" target="_blank" rel="noopener">드라이브 열기</a>
              <button class="btn btn--primary btn--sm" onclick="GARDEN.loadFloors(true)">↻ 새로고침</button>
            </div>
          </div>
          <div id="floorsBody">${_floorsCache ? floorsRender(_floorsCache) : floorsSkeleton()}</div>
        </section>`;
    },
  };

  const crumbMap = {
    dashboard: "MAIN / DASHBOARD",
    crew: "CREW / ROSTER",
    plants: "CREW / PLANT CHECK",
    floors: "CREW / FLOOR STATUS",
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
    const startDow = (new Date(y, m, 1).getDay() + 6) % 7; // 월=0
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
        const wknd = ci >= 5;
        const ex = exMap[ds];
        return `<button class="mc__d ${isToday ? "is-today" : ""} ${wknd ? "is-wknd" : ""} ${ex ? "has-ex" : ""}"
          title="${ex ? esc(ex) : "변동사항 추가"}" onclick="GARDEN.wbException('${ds}')">${d}${ex ? '<i class="mc__dot"></i>' : ""}</button>`;
      }).join("");
      grid += `<div class="mc__row">${week}</div>`;
    }

    const wd = ["월", "화", "수", "목", "금", "토", "일"].map((w, i) =>
      `<span class="${i >= 5 ? "is-wknd" : ""}">${w}</span>`).join("");

    const exList = (b.exceptions || []).slice().sort((a, c) => a.date.localeCompare(c.date));
    const exHtml = exList.length
      ? `<div class="mc__ex">` + exList.map((e) =>
          `<button class="mc__exrow" onclick="GARDEN.wbException('${e.date}')" title="수정 / 삭제">
            <i class="mc__exdot"></i><b>${e.date.slice(5).replace("-", "/")}</b><span>${esc(e.label)}</span>
          </button>`).join("") + `</div>`
      : `<p class="mc__hint">변동사항이 없습니다.<br>날짜를 눌러 연휴·변경을 추가하세요.</p>`;

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

    /* --- 달력 월 이동 --- */
    wbMonth(delta) {
      let m = _calYM.m + delta, y = _calYM.y;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      _calYM = { y, m };
      reBoard();
    },

    /* --- 변동사항 추가/수정/삭제 --- */
    /* --- 각층 현황 --- */
    loadFloors(force) {
      const url = (window.CONFIG && window.CONFIG.API_URL || "").trim();
      const body = document.getElementById("floorsBody");
      if (!url) { if (body) body.innerHTML = floorsEmpty("API가 연결되지 않았습니다. js/config.js의 API_URL을 확인하세요."); return; }
      if (_floorsCache && !force) { if (body) body.innerHTML = floorsRender(_floorsCache); return; }
      if (body) body.innerHTML = floorsSkeleton();
      fetch(url + "?action=floors&cb=" + Date.now())
        .then((r) => r.json())
        .then((j) => { _floorsCache = j.floors || []; const b = document.getElementById("floorsBody"); if (b) b.innerHTML = floorsRender(_floorsCache); })
        .catch((e) => { console.warn("[GARDEN] 각층 현황 로드 실패:", e); const b = document.getElementById("floorsBody"); if (b) b.innerHTML = floorsEmpty("불러오기에 실패했습니다. 새로고침을 눌러주세요."); });
    },

    /* --- 식물 상태 점검 --- */
    plantTab(t) { _plantTab = t; rePlants(); },
    plantRound(r) { _plantRound = r; rePlants(); },
    plantGrade(z, r, g) {
      const p = getPlants();
      p.grades[z] = p.grades[z] || {};
      if (g === "") delete p.grades[z][r]; else p.grades[z][r] = g;
      savePlants(); toast("점검 저장됨 ✓"); rePlants();
    },
    plantIssue(z, r, v) {
      const p = getPlants();
      p.issues[z] = p.issues[z] || {};
      if (String(v).trim() === "") delete p.issues[z][r]; else p.issues[z][r] = String(v).trim();
      savePlants(); toast("이슈 저장됨 ✓");
    },
    plantReset() {
      if (!confirm("식물 점검 데이터를 기본값으로 되돌릴까요? (입력 내용 삭제)")) return;
      try { localStorage.removeItem(PL_KEY); } catch (e) {}
      _plants = null; rePlants();
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
