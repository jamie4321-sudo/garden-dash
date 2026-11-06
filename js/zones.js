/* =========================================================
   GARDEN — 관리 현황 (#zones)
   1안 '한 장 요약': 큰 문장 + 오전/오후 순회 카드 + 동별 카드 + 지금 살펴보는 것
   · 식물 현황 탭 = 층별 목록(누르면 구역별 식물) · 수량 지도는 글자를 눌러야 펼쳐짐
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
  const BS = ["A동", "B동", "공용부"];
  // 시트 원본은 그대로 두고 화면에서만 맞춤법 통일
  const FIX = { "관음중": "관음죽", "샐렘": "셀렘", "셀럼": "셀렘", "아레카아쟈": "아레카야자", "오렌지쟈스민": "오렌지자스민", "수크렁": "수크령", "삼색버들": "삼색버드나무" };

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clean = (x) => { x = (x || "").trim(); return x === "-" ? "" : x; };
  const fmt = (n) => Number(n || 0).toLocaleString("ko-KR");
  const firstNum = (s) => { const m = String(s || "").replace(/,/g, "").match(/\d+/); return m ? +m[0] : 0; };

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
  let Z = [], SUM = {}, state = "loading", lastCSV = "", timer = null;
  let tab = "status", showMap = false, pb = "A동", query = "", openFl = null;

  const cnt = (z, k) => (z.pv[k] || 0) + (z.pb[k] || 0);
  const tot = (z) => SZ.reduce((s, k) => s + cnt(z, k), 0);
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
  const plantsOf = (z) => [...new Set([...z.pvP, ...z.pbP])];
  const flLabel = (f) => (f == null ? "기타" : f < 0 ? "B1" : f + "층");
  const zLabel = (z) => (z.fl == null ? z.z : z.sub);
  const short = (s) => s.replace(" 오아시스", "오아").replace(/\(.*?\)/g, "").trim();
  const T_TXT = { 오전: "오전 7:00–10:45", 오후: "오후 12:00–15:45", 별도: "별도 일정" };
  const T_CLS = { 오전: "am", 오후: "pm", 별도: "ex" };
  const tKey = (z) => z.t || "별도";
  const floorsOf = (b) => [...new Set(Z.filter((z) => z.b === b).map((z) => z.fl))].sort((a, c) => (c ?? -9) - (a ?? -9));
  const zonesAt = (b, f) => Z.filter((z) => z.b === b && z.fl === f);
  const species = (zs) => new Set(zs.flatMap(plantsOf)).size;
  const heat = (v, m) => { const r = v / m; return r > .75 ? 4 : r > .5 ? 3 : r > .25 ? 2 : 1; };
  // 시트 아래 요약 줄 찾기 (띄어쓰기 무시)
  const sn = (k) => { const v = Object.entries(SUM).find(([a]) => a.replace(/\s/g, "").includes(k)); return v ? v[1] : ""; };
  const strip = (s) => String(s || "").replace(/^\s*\d+\s*개\s*:?\s*/, "").trim();

  function kpi() {
    const sumSz = (k) => sum(Z, (z) => cnt(z, k));
    const pick = (key, k) => firstNum(sn(key)) || (k ? sumSz(k) : 0);
    return {
      total: pick("총관리수량") || sum(Z, tot),
      box: pick("수납장총수량", "중형"),
      big: (firstNum(sn("특대수량")) || sumSz("특대")) + (firstNum(sn("대형수량")) || sumSz("대형")),
      small: (firstNum(sn("소형수량")) || sumSz("소형")) + (firstNum(sn("일반화분수량")) || sumSz("일반")),
      garden: pick("정원수량", "정원"),
    };
  }

  function apply(csv) {
    const d = build(csv);
    Z = d.zones; SUM = d.summary;
  }

  /* ---------- 관리 현황 ---------- */
  function statusHTML() {
    if (!Z.length) return emptyHTML();
    const K = kpi(), sp = species(Z);
    const T = { 오전: Z.filter((z) => z.t === "오전"), 오후: Z.filter((z) => z.t === "오후"), 별도: Z.filter((z) => !z.t) };
    const rounds = (k, title, how) => {
      const zs = T[k], fls = new Set(zs.map((z) => z.b + "|" + z.fl));
      const where = BS.map((b) => {
        const f = [...new Set(zs.filter((z) => z.b === b).map((z) => z.fl))].filter((x) => x != null).sort((a, c) => a - c);
        if (!f.length) return "";
        const lab = f.length > 2 ? `${flLabel(f[0])}–${flLabel(f[f.length - 1])}` : f.map(flLabel).join("·");
        return `${b} ${lab}`;
      }).filter(Boolean).join(" · ");
      return `<div class="zn-card zr"><div class="zr-t"><span class="zn-dot2 ${T_CLS[k]}"></span>${T_TXT[k]}</div>
        <h4>${title}</h4><p class="zr-w">${esc(where)}</p>
        <ul>${how.map((h) => `<li>${h}</li>`).join("")}</ul>
        <div class="zr-st"><div><b>${zs.length}</b><span>구역</span></div><div><b>${fmt(sum(zs, tot))}</b><span>관리 수량</span></div><div><b>${fls.size}</b><span>층</span></div></div></div>`;
    };
    const bcard = (b) => {
      const zs = Z.filter((z) => z.b === b), t = sum(zs, tot) || 1;
      const part = (k) => sum(zs.filter((z) => tKey(z) === k), tot) / t * 100;
      return `<div class="zn-card zb"><h4>${b}</h4><p class="zn-muted">${floorsOf(b).length}개 층 · ${zs.length}구역 · <b>${fmt(sum(zs, tot))}</b>개</p>
        <div class="zb-bar" title="관리 시간 비율"><i class="am" style="width:${part("오전")}%"></i><i class="pm" style="width:${part("오후")}%"></i><i class="ex" style="width:${part("별도")}%"></i></div>
        <dl><dt>수납장 플랜트박스</dt><dd>${fmt(sum(zs, (z) => cnt(z, "중형")))}</dd><dt>대형·특대</dt><dd>${fmt(sum(zs, (z) => cnt(z, "특대") + cnt(z, "대형")))}</dd><dt>식물 수종</dt><dd>${species(zs)}종</dd></dl></div>`;
    };
    const noPot = sn("속화분없는"), fake = sn("조화예정"), broke = sn("케이스파손");
    const memo = Z.filter((z) => z.note);
    const chk = [
      noPot && [firstNum(noPot), "속화분 없는 수납장", strip(noPot)],
      fake && [firstNum(fake), "조화 예정 수납장", strip(fake)],
      broke && [firstNum(broke), "케이스 파손", strip(broke).replace(/^\(|\)$/g, "")],
      [memo.length, "구역 메모", memo.map((z) => `${z.b} ${z.z} · ${z.note}`).join(" / ") || "없음"],
    ].filter(Boolean);
    return `
      <div class="zn-card zh">
        <div><h3 class="zh-title">카카오 아지트 <em>${fmt(K.total)}개</em> 식물을<br>하루 두 번 돌아보며 관리하고 있어요</h3>
          <p class="zh-sub">A동·B동·공용부 ${Z.length}개 구역 · ${sp}종 · 오전엔 업무 층, 오후엔 카페·로비·정원</p></div>
        <div class="zh-k">
          <div><b>${fmt(K.box)}</b><span>수납장 플랜트박스</span></div>
          <div><b>${fmt(K.big)}</b><span>대형·특대 화분</span></div>
          <div><b>${fmt(K.small)}</b><span>소형·일반 화분</span></div>
          <div><b>${fmt(K.garden)}</b><span>정원 (실내·외)</span></div>
        </div>
      </div>
      <div class="zr-g">
        ${rounds("오전", "업무 층 순회", ["출근 시간 전후로 층마다 수납장 상태·물 확인", "오아시스·미팅룸 대형 화분 잎 정리", "순회 중 발견한 문제는 바로 식물 이슈로 기록"])}
        ${rounds("오후", "공용부·정원 관리", ["사람이 많은 공용 공간은 점심 이후 관리", "외부 정원·테라스 식재 상태 확인", "대형 바닥 플랜트박스 정리"])}
      </div>
      <div class="zb-g">${BS.map(bcard).join("")}</div>
      <p class="zb-leg"><span><i class="zn-dot2 am"></i>오전</span><span><i class="zn-dot2 pm"></i>오후</span><span><i class="zn-dot2 ex"></i>별도 일정 (의장실·대표실·테라스 등)</span></p>
      <div class="zn-card zc"><div class="zn-bh"><h3>지금 살펴보고 있는 것</h3><p class="zn-muted">관리구역 시트 요약·비고 기준</p></div>
        <div class="zc-g">${chk.map(([n, t, d]) => `<div><b>${n}</b><p>${esc(t)}</p><small>${esc(d)}</small></div>`).join("")}</div></div>
      <div class="zn-maptg"><button class="zn-lk" onclick="ZONES.map()">${showMap ? "구역별 수량 지도 접기 ▴" : "구역별 수량 지도 보기 ▾"}</button><span class="zn-muted">진할수록 수량이 많은 구역 · 구역을 누르면 자세히</span></div>
      ${showMap ? mapHTML() : ""}`;
  }

  /* 구역별 수량 지도 (기존 건물 단면도) */
  function mapHTML() {
    const max = Math.max(...Z.map(tot));
    const col = (b) => `<div class="zn-col"><h4>${b}</h4>${floorsOf(b).map((f) => `<div class="zn-fl"><b>${flLabel(f)}</b><div class="zn-zs">${
      zonesAt(b, f).map((z) => {
        const v = tot(z), h = v ? heat(v, max) : 0;
        return `<button class="zn-z zn-h${h}" onclick="ZONES.open(${z.id})" title="${esc(zLabel(z))}">${esc(short(zLabel(z)))}<small>${v}</small></button>`;
      }).join("")}</div></div>`).join("")}</div>`;
    return `<div class="zn-card zn-block zn-map">
      <div class="zn-sec">${BS.map(col).join("")}</div>
      <div class="zn-legend">관리 수량 <span><i class="zn-h1"></i>적음</span><span><i class="zn-h2"></i></span><span><i class="zn-h3"></i></span><span><i class="zn-h4"></i>많음</span></div>
    </div>`;
  }

  /* ---------- 식물 현황 (층별) ---------- */
  function plantsHTML() {
    if (!Z.length) return emptyHTML();
    const q = query.trim();
    const hl = (p) => (q && p.includes(q) ? `<mark>${esc(p)}</mark>` : esc(p));
    const chip = (p) => `<button class="zn-tag" onclick="event.stopPropagation();ZONES.find('${esc(p)}')">${hl(p)}</button>`;
    const rows = floorsOf(pb).map((f) => {
      const zs = zonesAt(pb, f), cntP = {};
      zs.forEach((z) => plantsOf(z).forEach((p) => (cntP[p] = (cntP[p] || 0) + 1)));
      const ps = Object.keys(cntP).sort((a, c) => cntP[c] - cntP[a]);
      if (q && !ps.some((p) => p.includes(q))) return "";
      const key = pb + "|" + f, open = openFl === key;
      const shown = (q ? ps.filter((p) => p.includes(q)).concat(ps.filter((p) => !p.includes(q))) : ps).slice(0, 8);
      const times = [...new Set(zs.map(tKey))].map((t) => T_TXT[t]).join(" · ");
      return `<div class="pv-row${open ? " is-open" : ""}" onclick="ZONES.fl('${key}')">
          <span class="pv-fl">${flLabel(f)}</span>
          <span class="pv-meta"><b>${fmt(sum(zs, tot))}</b>개 · ${zs.length}구역<br>${ps.length}종 · ${times}</span>
          <span class="zn-tags">${shown.map(chip).join("")}${ps.length > 8 ? `<span class="zn-tag zn-tag--more">+${ps.length - 8}</span>` : ""}</span>
          <span class="pv-ar">›</span>
        </div>
        ${open ? `<div class="pv-dt">${zs.map((z) => `<div class="pv-z"><button class="pv-zn" onclick="ZONES.open(${z.id})">${esc(zLabel(z))}</button>
          <span class="pv-zq">${tot(z)}개 <span class="zn-t ${T_CLS[tKey(z)]}">${tKey(z)}</span></span>
          <span class="zn-tags">${plantsOf(z).map(chip).join("") || `<span class="zn-muted">식물 미기재</span>`}${z.note ? `<span class="zn-tag zn-warn">${esc(z.note)}</span>` : ""}</span></div>`).join("")}</div>` : ""}`;
    }).join("");
    return `<div class="pv-top">
        <div class="seg">${BS.map((b) => `<button class="btn btn--sm${pb === b ? " btn--primary" : ""}" onclick="ZONES.b('${b}')">${b} <small>${fmt(sum(Z.filter((z) => z.b === b), tot))}</small></button>`).join("")}</div>
        <input class="zn-srch" id="znSrch" type="search" placeholder="식물 이름 찾기 (예: 몬스테라)" value="${esc(query)}" oninput="ZONES.find(this.value)" />
        <span class="zn-muted">층을 누르면 구역별 식물이 펼쳐져요 · 전체 ${species(Z)}종</span>
      </div>
      <div class="zn-card pv-list">${rows || `<div class="zn-empty">‘${esc(q)}’ 이(가) 있는 층이 ${pb}에 없어요${otherB(q)}</div>`}</div>`;
  }
  function otherB(q) {
    if (!q) return "";
    const bs = BS.filter((b) => b !== pb && Z.some((z) => z.b === b && plantsOf(z).some((p) => p.includes(q))));
    return bs.length ? ` · ${bs.map((b) => `<button class="zn-lk" onclick="ZONES.b('${b}')">${b}에서 보기</button>`).join(" ")}` : "";
  }

  function emptyHTML() {
    return `<div class="zn-card zn-empty">${state === "error" ? "관리구역 시트를 불러오지 못했어요 · 시트 공유가 ‘링크가 있는 모든 사용자 보기’인지 확인해 주세요 <button class=\"btn btn--sm\" onclick=\"ZONES.load(true)\">다시 시도</button>" : "불러오는 중…"}</div>`;
  }

  function bodyHTML() { return tab === "plants" ? plantsHTML() : statusHTML(); }
  function paint() {
    const el = document.getElementById("znBody"); if (!el) return;
    el.innerHTML = bodyHTML();
    const sg = document.getElementById("znTabs");
    if (sg) sg.innerHTML = tabsHTML();
  }
  function tabsHTML() {
    return [["status", "관리 현황"], ["plants", "식물 현황"]].map(([k, l]) =>
      `<button class="btn btn--sm${tab === k ? " btn--primary" : ""}" onclick="ZONES.tab('${k}')">${l}</button>`).join("");
  }

  function drawerHTML(z) {
    const tags = (ps) => `<div class="zn-tags">${ps.map((p) => `<button class="zn-tag" onclick="ZONES.close();ZONES.tab('plants');ZONES.find('${esc(p)}')">${esc(p)}</button>`).join("")}</div>`;
    const box = SZ.filter((k) => cnt(z, k)).map((k) => `<div><b>${cnt(z, k)}</b><span>${k === "중형" ? "수납장(중형)" : k}</span></div>`).join("");
    return `<button class="zn-x" onclick="ZONES.close()" aria-label="닫기">✕</button>
      <p class="eyebrow">${esc(z.b)} · ${esc(T_TXT[tKey(z)])}</p>
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
      const changed = csv !== lastCSV;
      if (changed || force || !Z.length) apply(csv);
      lastCSV = csv; state = "live";
      try { localStorage.setItem(CACHE_KEY, csv); } catch (e) {}
      if (!changed && !force) return; // 바뀐 게 없으면 다시 그리지 않음(펼친 상태·검색 유지)
    } catch (e) {
      state = Z.length ? "cache" : "error";
    }
    paint();
  }

  function onVisible() { if (!document.hidden && document.getElementById("znBody")) load(); }

  window.ZONES = {
    html() {
      return `<section class="view zn">
        <div class="page-head">
          <div><p class="eyebrow">Crew · 관리 현황</p><h2>관리 현황</h2></div>
          <div class="seg" id="znTabs">${tabsHTML()}</div>
        </div>
        <div id="znBody">${bodyHTML()}</div>
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
      timer = setInterval(() => { if (document.getElementById("znBody")) load(); else clearInterval(timer); }, REFRESH_MS);
    },
    load,
    tab(t) { tab = t; paint(); },
    map() { showMap = !showMap; paint(); },
    b(x) { pb = x; openFl = null; paint(); },
    fl(k) { openFl = openFl === k ? null : k; paint(); },
    find(v) {
      query = v || "";
      // 찾는 식물이 지금 동에 없으면 있는 동으로 옮김
      const q = query.trim();
      if (q && !Z.some((z) => z.b === pb && plantsOf(z).some((p) => p.includes(q)))) {
        const nb = BS.find((b) => Z.some((z) => z.b === b && plantsOf(z).some((p) => p.includes(q))));
        if (nb) { pb = nb; openFl = null; }
      }
      paint();
      const s = document.getElementById("znSrch");
      if (s && document.activeElement !== s) { s.focus(); }
      if (s) s.setSelectionRange(s.value.length, s.value.length);
    },
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
