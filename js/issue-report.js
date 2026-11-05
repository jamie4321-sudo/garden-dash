/* 식물 이슈 관리 — 한 장 보고서 (window.IRP)
   식물 이슈 화면 '📄 보고서' 탭에서 그려짐. 데이터는 app.js 의 window.GD.getIssues() (시트 이슈).
   인쇄(=PDF 저장)는 보고서 종이만 남기고 숨김. */
(function () {
  const pad = (n) => String(n).padStart(2, "0");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const d10 = (v) => { const m = String(v || "").match(/(\d{4})[-./](\d{1,2})(?:[-./](\d{1,2}))?/); return m ? `${m[1]}-${pad(+m[2])}-${pad(m[3] ? +m[3] : 1)}` : ""; };
  const md = (v) => { const d = d10(v); return d ? `${+d.slice(5, 7)}/${+d.slice(8, 10)}` : "—"; };
  const days = (a, b) => Math.round((new Date(d10(b)) - new Date(d10(a))) / 864e5);
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const Y = now.getFullYear(), M = now.getMonth() + 1;

  // 기간
  const lastDay = (y, m) => new Date(y, m, 0).getDate();
  const PERIODS = [
    ["year", `${Y}년 전체`, `${Y}-01-01`, `${Y}-12-31`],
    ["h2", `${Y}년 하반기`, `${Y}-07-01`, `${Y}-12-31`],
    ["h1", `${Y}년 상반기`, `${Y}-01-01`, `${Y}-06-30`],
    ["m3", "최근 3개월", (() => { const d = new Date(Y, M - 3, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`; })(), `${Y}-${pad(M)}-${lastDay(Y, M)}`],
    ["m1", `${M}월`, `${Y}-${pad(M)}-01`, `${Y}-${pad(M)}-${lastDay(Y, M)}`],
    ["m0", `${M === 1 ? 12 : M - 1}월`, (() => { const d = new Date(Y, M - 2, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`; })(), (() => { const d = new Date(Y, M - 2, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${lastDay(d.getFullYear(), d.getMonth() + 1)}`; })()],
    ["all", "전체 기간", "0000-01-01", "9999-12-31"],
  ];
  const S = { p: "year", list: true };
  try { const v = localStorage.getItem("garden-irp"); if (v) Object.assign(S, JSON.parse(v)); } catch (e) {}
  const keep = () => { try { localStorage.setItem("garden-irp", JSON.stringify(S)); } catch (e) {} };
  const per = () => PERIODS.find((p) => p[0] === S.p) || PERIODS[0];

  // 같은 자리 · 같은 문제
  const place = (x) => `${x.building} ${String(x.location || "").replace(/\s+/g, "")}`;
  const words = (x) => String(x.detail || "").replace(/발생|재발|확인|조치|요청|관련|이슈/g, " ").split(/[^0-9A-Za-z가-힣]+/).filter((w) => w.length >= 2);
  const sameProb = (a, b) => { const wa = words(a), wb = words(b); return !wa.length || !wb.length || wa.some((w) => wb.includes(w)); };
  const isDone = (x) => x.status === "완료";
  // 재발 = 같은 자리·같은 문제의 앞선 건이 조치 완료된 '다음 날 이후' 다시 들어온 건 (SLA 3.2와 같은 기준)
  function prevOf(x, all) {
    return all.filter((y) => y !== x && place(y) === place(x) && sameProb(y, x) && d10(y.date) < d10(x.date) && d10(y.doneAt) && d10(y.doneAt) < d10(x.date))
      .sort((a, b) => d10(b.doneAt).localeCompare(d10(a.doneAt)) || d10(b.date).localeCompare(d10(a.date)))[0] || null;
  }

  function data(b) {
    const p = per();
    const all = (window.GD ? GD.getIssues() : []).filter((x) => d10(x.date));
    const scope = all.filter((x) => b === "전체" || x.building === b);
    const is = scope.filter((x) => d10(x.date) >= p[2] && d10(x.date) <= p[3]).sort((a, c) => d10(c.date).localeCompare(d10(a.date)));
    const done = is.filter(isDone);
    const gaps = done.filter((x) => d10(x.doneAt)).map((x) => Math.max(0, days(x.date, x.doneAt)));
    const sameDay = gaps.filter((g) => g === 0).length;
    const vok = is.filter((x) => x.source === "VOK");
    const re = is.map((x) => ({ x, prev: prevOf(x, scope) })).filter((r) => r.prev);
    const open = is.filter((x) => !isDone(x));
    const urgent = is.filter((x) => x.urgency === "긴급");
    // 월별
    const byM = {};
    is.forEach((x) => { const k = d10(x.date).slice(0, 7); (byM[k] = byM[k] || { vok: 0, lkg: 0 }); x.source === "VOK" ? byM[k].vok++ : byM[k].lkg++; });
    let months = Object.keys(byM).sort();
    if (S.p !== "all" && months.length) { // 빈 달도 채움
      const out = []; let [y, m] = p[2].split("-").map(Number); const endK = (p[3] > today ? today : p[3]).slice(0, 7);
      for (let i = 0; i < 24; i++) { const k = `${y}-${pad(m)}`; if (k > endK) break; out.push(k); m++; if (m > 12) { m = 1; y++; } }
      months = out;
    }
    const cnt = (f) => { const o = {}; is.forEach((x) => { const k = f(x); if (k) o[k] = (o[k] || 0) + 1; }); return Object.entries(o).sort((a, c) => c[1] - a[1]); };
    const cats = cnt((x) => x.category || "기타");
    const blds = cnt((x) => x.building || "—");
    const kinds = (() => { const o = {}; is.forEach((x) => { const ws = new Set(words(x)); ws.forEach((w) => { o[w] = (o[w] || 0) + 1; }); }); return Object.entries(o).filter((e) => e[1] >= 2).sort((a, c) => c[1] - a[1]).slice(0, 6); })();
    // 이슈가 잦은 자리
    const pl = {};
    is.forEach((x) => { const k = place(x); (pl[k] = pl[k] || { b: x.building, loc: x.location, n: 0, re: 0, kinds: {} }); pl[k].n++; words(x).forEach((w) => { pl[k].kinds[w] = (pl[k].kinds[w] || 0) + 1; }); });
    re.forEach((r) => { pl[place(r.x)].re++; });
    const spots = Object.values(pl).filter((s) => s.n >= 2).sort((a, c) => c.n - a.n || c.re - a.re).slice(0, 6);
    return { p, b, is, done, gaps, sameDay, vok, re, open, urgent, byM, months, cats, blds, kinds, spots };
  }

  function comments(D) {
    const c = [];
    if (!D.is.length) return ["이 기간에 등록된 식물 이슈가 없어요."];
    c.push(`식물 이슈 ${D.is.length}건 중 ${D.done.length}건(${pct(D.done.length, D.is.length)}%)을 처리했고, 처리한 건의 ${pct(D.sameDay, D.gaps.length)}%는 발견한 날 바로 조치했어요.`);
    c.push(D.vok.length ? `카카오 요청(VOK)은 ${D.vok.length}건, 나머지 ${D.is.length - D.vok.length}건은 크루가 순회 중 먼저 발견한 이슈예요.` : "카카오 요청(VOK) 없이 모두 크루가 순회 중 먼저 발견했어요.");
    if (D.kinds.length) c.push(`가장 많이 나온 이슈는 ${D.kinds.slice(0, 3).map((k) => `${k[0]}(${k[1]}건)`).join(" · ")}예요.`);
    if (D.re.length) {
      const top = D.spots.filter((s) => s.re).slice(0, 2).map((s) => `${s.b} ${s.loc}`).join(", ");
      c.push(`조치 후 같은 자리에서 같은 문제가 다시 나온 재발이 ${D.re.length}건 있어요${top ? ` — ${top}은 집중 관리가 필요해요` : ""}.`);
    } else c.push("조치 후 같은 자리에서 같은 문제가 다시 나온 재발은 없어요.");
    if (D.open.length) c.push(`아직 진행 중인 이슈가 ${D.open.length}건 있어요.`);
    return c;
  }

  const bar = (n, max, cls) => `<span class="irp-bar"><i class="${cls || ""}" style="width:${max ? Math.max(4, Math.round((n / max) * 100)) : 0}%"></i></span>`;
  const stTag = (x) => isDone(x) ? `<span class="irp-st">완료 ${md(x.doneAt)}</span>` : `<span class="irp-st irp-st--open">${esc(x.status || "진행 중")}</span>`;

  function html(b) {
    const D = data(b || "전체");
    const p = D.p;
    const mMax = Math.max(1, ...D.months.map((k) => (D.byM[k] ? D.byM[k].vok + D.byM[k].lkg : 0)));
    const cMax = Math.max(1, ...D.cats.map((c) => c[1]));
    const avg = D.gaps.length ? (D.gaps.reduce((s, g) => s + g, 0) / D.gaps.length) : 0;
    const kpi = [
      ["전체 이슈", D.is.length, "건", `VOK ${D.vok.length} · 자체 발견 ${D.is.length - D.vok.length}`],
      ["처리 완료", pct(D.done.length, D.is.length), "%", `${D.done.length}건 완료 · 진행 중 ${D.open.length}`],
      ["당일 조치", pct(D.sameDay, D.gaps.length), "%", `${D.sameDay}건 발견한 날 조치`],
      ["평균 처리", avg.toFixed(1), "일", "발견 → 완료"],
      ["같은 자리 재발", D.re.length, "건", "조치 후 같은 문제 다시 발생"],
    ];
    const tools = `<div class="irp-tools">
        <div class="irp-seg">${PERIODS.map((x) => `<button class="${x[0] === S.p ? "is-on" : ""}" onclick="IRP.period('${x[0]}')">${x[1]}</button>`).join("")}</div>
        <label class="irp-chk"><input type="checkbox" ${S.list ? "checked" : ""} onchange="IRP.toggleList(this.checked)"/> 전체 목록 포함</label>
        <button class="btn btn--primary btn--sm" onclick="IRP.print()">PDF로 저장 · 인쇄</button>
      </div>`;
    const months = D.months.length ? D.months.map((k) => { const v = D.byM[k] || { vok: 0, lkg: 0 }, n = v.vok + v.lkg;
      return `<div class="irp-mrow"><span>${+k.slice(5)}월</span><span class="irp-stack"><i class="v" style="width:${(v.vok / mMax) * 100}%"></i><i class="l" style="width:${(v.lkg / mMax) * 100}%"></i></span><b>${n}</b></div>`; }).join("")
      : `<p class="irp-none">기록 없음</p>`;
    const cats = D.cats.length ? D.cats.map((c) => `<div class="irp-crow"><span>${esc(c[0])}</span>${bar(c[1], cMax)}<b>${c[1]}</b></div>`).join("") : `<p class="irp-none">기록 없음</p>`;
    const spots = D.spots.length ? `<table class="irp-tbl"><thead><tr><th>자리</th><th>주요 이슈</th><th class="r">건수</th><th class="r">재발</th></tr></thead><tbody>${D.spots.map((s) => {
        const k = Object.entries(s.kinds).sort((a, c) => c[1] - a[1]).slice(0, 2).map((e) => e[0]).join(", ");
        return `<tr><td>${esc(s.b)} ${esc(s.loc)}</td><td class="muted">${esc(k) || "—"}</td><td class="r">${s.n}</td><td class="r">${s.re ? `<b class="irp-red">${s.re}</b>` : "—"}</td></tr>`; }).join("")}</tbody></table>`
      : `<p class="irp-none">같은 자리에서 2번 이상 나온 이슈가 없어요</p>`;
    const reList = D.re.length ? `<table class="irp-tbl"><thead><tr><th>다시 접수</th><th>자리 · 내용</th><th>앞선 건</th><th>출처</th><th class="r">조치 후</th></tr></thead><tbody>${D.re.map((r) =>
        `<tr><td>${md(r.x.date)}</td><td>${esc(r.x.building)} ${esc(r.x.location)} · ${esc(r.x.detail)}</td><td class="muted nw">${md(r.prev.date)} 발생 → ${md(r.prev.doneAt)} 조치</td><td>${esc(r.x.source)}</td><td class="r">${days(r.prev.doneAt, r.x.date)}일 만</td></tr>`).join("")}</tbody></table>`
      : `<p class="irp-none">재발 없음</p>`;
    const openList = D.open.length ? `<table class="irp-tbl"><tbody>${D.open.map((x) =>
        `<tr><td class="w-d">${md(x.date)}</td><td>${esc(x.building)} ${esc(x.location)} · ${esc(x.detail)}${x.urgency === "긴급" ? ` <b class="irp-red">긴급</b>` : ""}</td><td class="muted nw">${esc(x.assignee) || ""}</td><td class="r">${days(x.date, today)}일째</td></tr>`).join("")}</tbody></table>`
      : `<p class="irp-none">진행 중인 이슈 없음 — 모두 처리했어요</p>`;
    const full = S.list ? `<div class="irp-sec irp-full"><h4>전체 이슈 목록 <small>${D.is.length}건 · 최근 순</small></h4>
        ${D.is.length ? `<table class="irp-tbl irp-tbl--full"><thead><tr><th>발견</th><th>동</th><th>자리</th><th>내용</th><th>분류</th><th>출처</th><th>조치</th><th class="r">상태</th></tr></thead><tbody>${D.is.map((x) => {
          const reX = D.re.find((r) => r.x === x);
          return `<tr><td class="w-d">${md(x.date)}</td><td>${esc(x.building)}</td><td>${esc(x.location)}</td><td>${esc(x.detail)}${reX ? ` <b class="irp-red">재발</b>` : ""}</td><td class="muted">${esc(x.category)}</td><td>${esc(x.source)}</td><td class="muted">${esc(x.action)}</td><td class="r">${stTag(x)}</td></tr>`; }).join("")}</tbody></table>` : `<p class="irp-none">기록 없음</p>`}</div>` : "";

    return `${tools}
      <article class="irp-a4" id="irpA4">
        <header class="irp-hd">
          <div><p class="irp-eb">PLANT ISSUE REPORT</p><h3>${esc(p[1])} 식물 이슈 관리 보고서</h3>
            <p class="irp-m">카카오 아지트${b && b !== "전체" ? ` · ${esc(b)}` : ""} · 주식회사 링키지랩 스낵앤가든사업팀 · ${S.p === "all" ? "전체 기록" : `${md(p[2])} ~ ${md(p[3] > today ? today : p[3])}`} · ${today.replace(/-/g, ".")} 작성</p></div>
        </header>
        <div class="irp-kpi">${kpi.map((k) => `<div><span>${k[0]}</span><b>${k[1]}<small>${k[2]}</small></b><em>${k[3]}</em></div>`).join("")}</div>
        <div class="irp-sum"><h4>한눈에 보기</h4><ul>${comments(D).map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>
        <div class="irp-2">
          <div class="irp-sec"><h4>월별 이슈 <small><i class="irp-dot v"></i>VOK <i class="irp-dot l"></i>자체 발견</small></h4>${months}</div>
          <div class="irp-sec"><h4>분류별</h4>${cats}
            ${D.blds.length ? `<p class="irp-bl">${D.blds.map((x) => `${esc(x[0])} <b>${x[1]}</b>`).join(" · ")}</p>` : ""}
            ${D.kinds.length ? `<h4 class="irp-h2">많이 나온 이슈</h4><div class="irp-kinds">${D.kinds.map((k) => `<span>${esc(k[0])} <b>${k[1]}</b></span>`).join("")}</div>` : ""}</div>
        </div>
        <div class="irp-2">
          <div class="irp-sec"><h4>이슈가 잦은 자리</h4>${spots}</div>
          <div class="irp-sec"><h4>진행 중 <small>${D.open.length}건</small></h4>${openList}</div>
        </div>
        <div class="irp-sec"><h4>같은 자리 재발 <small>${D.re.length}건 · 조치 완료 후 같은 문제가 다시 접수된 건</small></h4>${reList}</div>
        ${full}
        <footer class="irp-ft"><span>재발 = 같은 자리 · 같은 문제가 조치 완료 다음 날 이후 다시 접수된 건 (처리 중 들어온 추가 요청은 제외)</span><span>링키지랩 가든관리</span></footer>
      </article>`;
  }

  function repaint() { const el = document.getElementById("irp"); if (el) el.innerHTML = html(el.dataset.b || "전체"); }

  window.IRP = {
    html,
    period(k) { S.p = k; keep(); repaint(); },
    toggleList(on) { S.list = !!on; keep(); repaint(); },
    print() {
      document.body.classList.add("irp-printing");
      const off = () => { document.body.classList.remove("irp-printing"); window.removeEventListener("afterprint", off); };
      window.addEventListener("afterprint", off);
      window.print();
    },
  };
})();
