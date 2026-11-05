/* =========================================================
   GARDEN — 조경관리 SLA (#sla)
   채용 키트식 3단(항목 목록 · 평가기준→진행 내역→가채점 · 점수) + 기준표 + 보고서
   - 기준: 「SLA 평가 등급구간표」·「조경관리 SLA 평가항목」 (2026)
   - 진행 내역: 크루 로스터·교육·산업안전보건·식물 이슈·체감온도·교체·정산 기록을 그대로 읽어 옴(window.GD)
   - 가채점: 반기별로 이 기기에 저장(garden-sla). 인센티브는 보고서 탭에만.
   ========================================================= */
(function () {
  "use strict";

  const KEY = "garden-sla";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const gd = () => window.GD || {};
  const list = (fn) => { try { return (gd()[fn] && gd()[fn]()) || []; } catch (e) { return []; } };

  /* ---------- 기준 (보내 주신 표 그대로) ---------- */
  const GRADES = [
    ["O", 98, 100, 100, "대부분의 업적이 목표나 기대수준을 훨씬 뛰어넘음", ""],
    ["S", 94, 98, 70, "대부분의 업적이 목표나 기대수준 이상", ""],
    ["E", 90, 94, 40, "대부분의 업적이 목표나 기대수준", "연장 요건 충족"],
    ["M", 82, 90, 20, "대부분의 업적이 목표나 기대수준", "연장 요건 최소 충족"],
    ["B", 50, 82, 0, "대부분의 업적이 목표나 기대수준", "연장 여부 검토 가능"],
    ["N", 25, 50, -20, "대부분의 업적이 목표나 기대수준", "계약 해지"],
    ["U", 0, 25, -50, "목표나 기대수준에 미치지 못함", "계약 해지"],
  ];
  const CATS = [
    { no: 1, name: "인력운영 관리", w: 25, cycle: "반기" },
    { no: 2, name: "법정의무교육", w: 5, cycle: "반기" },
    { no: 3, name: "서비스품질 관리", w: 40, cycle: "월 1회" },
    { no: 4, name: "안전 관리", w: 15, cycle: "월 1회" },
    { no: 5, name: "운영 관리", w: 15, cycle: "월 1회" },
  ];
  const ITEMS = [
    { c: 1, code: "1.1", name: "계약된 인력 유지", max: 100, per: 5, unit: "명",
      crit: ["비장애 채용 기한(2개월 내) 준수 못할 시 (1명)", "장애 채용 기한(3개월 내) 준수 못할 시 (3명)", "결원 발생 시, 대체 지원인력 투입"],
      note: "고용시장 특성 고려", pre: ["채용 기한 준수"], src: "crew" },
    { c: 2, code: "2.1", name: "4대 법정교육 진행", max: 50, per: 5, unit: "명",
      crit: ["반기별 근무 인원의 교육 미이수 시", "교육 진행 여부 증빙자료 미제출 시"],
      note: "성희롱 예방 · 직장 내 괴롭힘 예방 · 장애인 인식개선 · 개인정보보호 교육", pre: ["법정의무교육 입사 시 이수 완료 → 증빙자료 · 교육스탬 확인 필요"], src: "training" },
    { c: 2, code: "2.2", name: "산업안전 보건협의체 운영", max: 50, per: 5, unit: "건",
      crit: ["산업안전보건협의체 정기회의 미참여 시", "자료 제출 및 현장 적용 미준수 시"],
      note: "", pre: ["안전TF 주관 정기 미팅 참석 완료, 관련 자료 제출 기한 준수"], src: "safety" },
    { c: 3, code: "3.1", name: "조경관리 품질 유지", max: 50, per: 3, unit: "건",
      crit: ["월간 관리 스케줄 이행 여부(보고 기준)", "관리 기준 미준수로 내부 의견(VOK) 발생 시"],
      note: "관리 담당자 라운딩 의견 포함", pre: ["관리 스케줄 이행 완료", "관리 기준 준수"], src: "issues" },
    { c: 3, code: "3.2", name: "VOK 대응", max: 50, per: 3, unit: "건",
      crit: ["요청 접수 기준 최초 대응(당일) 미준수 시", "조치 완료 후, 동일 문제(민원) 재발 시"],
      note: "영업시간 기준 · 관리 담당자 라운딩 의견 포함", pre: ["요청 접수 기준 업무 시간 내 대응 완료"], src: "vok" },
    { c: 4, code: "4.1", name: "작업환경 안전 관리", max: 50, per: 5, unit: "건",
      crit: ["작업 보호구(마스크, 보호안경 등) 미착용 식별 시", "안전수칙 위반(약품 사용, 폭염 야외작업, 기타 장비 사용작업)"],
      note: "관리 담당자 라운딩 의견 포함 · 폭염, 온도 기준 포함", pre: ["작업 보호구 상시 착용", "안전 수칙 위반 없음"], src: "heat" },
    { c: 4, code: "4.2", name: "사고 대응", max: 50, per: 10, unit: "건",
      crit: ["장비, 환경 요인으로 병원 치료 이상 발생 시", "사고 미보고, 보고 지연"],
      note: "", pre: ["병원 치료 이상 발생 0건", "사고 미보고, 보고 지연 없음"], src: "incident" },
    { c: 5, code: "5.1", name: "운영 리포트 관리", max: 50, per: 5, unit: "건",
      crit: ["분기별 화단 제안, 설치, 철수 미진행 시", "계획 대비 설치 품질, 유지기간 기준 미준수 시"],
      note: "계획 기준 - 품질, 유지기간 기준", pre: ["분기별 화단 제안, 설치, 철수", "1분기(1월~3월): 소진업서스 300포트 입고 삭제 → 1분기 화단 x -5감점", "2분기(4월~6월): 1층 정문방향(4종 식재)"], src: "ops" },
    { c: 5, code: "5.2", name: "조경 부자재 관리", max: 50, per: 3, unit: "건",
      crit: ["식물 부자재, 소모품 관리 미흡으로 작업지연, 품질저하 발생 시", "장비 관리 미흡으로 작업 영향, 비용 손실 발생 시", "개선 가이드 제시 후 동일 문제 재발 시"],
      note: "관리 담당자 라운딩 의견 포함 - 재발 기준", pre: ["식물 부자재, 소모품 관리 미흡으로 작업지연, 품질 저하 없음", "장비 관리 미흡으로 작업 영향, 비용 손실 없음"], src: "supply" },
  ];
  // 2026 상반기는 보내 주신 표의 소계를 처음 값으로 (1.1 95 · 3.1 44 · 3.2 44)
  const SEED = { "2026-H1": { n: { "1.1": 1, "3.1": 2, "3.2": 2 }, memo: {} } };
  // 자동 기록 기본 고침값 (Jamie 확인 내용) — 기간 · 항목 · 날짜 · 내용 앞부분으로 찾아서 적용
  const DEF_FIX = [
    { p: "2026-H2", code: "1.1", d: "6/26", start: "헨리 퇴사", fix: { c: "중증장애인턴 TO 전환", k: "info" } },
    { p: "2026-H2", code: "1.1", d: "7/6", start: "루카 · ", fix: { t: "루카 · 7/6자로 TO변경 — 중증장애인턴제 영입크루" } },
    { p: "2026-H2", code: "1.1", d: "8/3", start: "에드윈 입사", fix: { c: "하절기 단기 TO 충원", k: "ok" } },
  ];
  // 평가기준(기준 문구 · 비고 · 감점 점수) 고치기 — 반기와 상관없이 하나로 저장
  const CKEY = "garden-sla-crit";
  // 기록·기준·가채점 고치기는 제이미만 (로그인 이름에 '제이미'가 들어간 경우)
  const isJamie = () => { try { return (localStorage.getItem("garden-entry-who") || "").indexOf("제이미") >= 0; } catch (e) { return false; } };
  ITEMS.forEach((it) => { it._d = { crit: it.crit.slice(), note: it.note, per: it.per }; });
  function critStore() { try { return JSON.parse(localStorage.getItem(CKEY) || "{}"); } catch (e) { return {}; } }
  function applyCrit() {
    const all = critStore();
    ITEMS.forEach((it) => { const o = all[it.code] || {};
      it.crit = Array.isArray(o.crit) ? o.crit : it._d.crit.slice();
      it.note = "note" in o ? o.note : it._d.note;
      it.per = Number(o.per) > 0 ? Number(o.per) : it._d.per; });
  }
  applyCrit();

  /* ---------- 상태 ---------- */
  const now = new Date();
  const S = { year: now.getFullYear(), half: now.getMonth() < 6 ? 1 : 2, sel: 0, tab: "score", ed: null };
  const pkey = () => `${S.year}-H${S.half}`;
  function store() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function rec() {
    const all = store(), k = pkey();
    return all[k] || JSON.parse(JSON.stringify(SEED[k] || { n: {}, memo: {} }));
  }
  function save(r) { const all = store(); all[pkey()] = r; try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {} }
  const nOf = (it, r) => Math.max(0, Number((r || rec()).n[it.code]) || 0);
  const scoreOf = (it, r) => Math.max(0, it.max - nOf(it, r) * it.per);
  const catScore = (c, r) => { const l = ITEMS.filter((i) => i.c === c.no); return l.reduce((s, i) => s + scoreOf(i, r), 0) / l.reduce((s, i) => s + i.max, 0) * c.w; };
  const total = (r) => Math.round(CATS.reduce((s, c) => s + catScore(c, r), 0) * 100) / 100;
  const gradeOf = (t) => GRADES.find((g) => t >= g[1]) || GRADES[GRADES.length - 1];
  const f2 = (v) => { const x = Math.round(v * 100) / 100; return Number.isInteger(x) ? String(x) : x.toFixed(2).replace(/0$/, ""); };

  /* ---------- 기간 ---------- */
  const pad = (n) => (n < 10 ? "0" : "") + n;
  const range = () => ({ from: `${S.year}-${S.half === 1 ? "01" : "07"}-01`, to: `${S.year}-${S.half === 1 ? "06-30" : "12-31"}` });
  const d10 = (v) => { const m = String(v || "").match(/(\d{4})[-./](\d{1,2})(?:[-./](\d{1,2}))?/); return m ? `${m[1]}-${pad(+m[2])}-${pad(m[3] ? +m[3] : 1)}` : ""; };
  const inP = (v) => { const d = d10(v), r = range(); return d && d >= r.from && d <= r.to; };
  const md = (v) => { const d = d10(v); return d ? `${+d.slice(5, 7)}/${+d.slice(8, 10)}` : "—"; };
  const days = (a, b) => Math.round((new Date(d10(b)) - new Date(d10(a))) / 864e5);
  const todayStr = () => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const periodEnd = () => { const t = todayStr(), r = range(); return t < r.to ? t : r.to; };

  /* ---------- 진행 내역 (대시보드 연동) ----------
     각 항목: { sum: 한 줄 요약, good: 잘 지킨 점, rows: [[날짜, 내용, 상태칩]], sug: 감점 후보 수, sugWhy, go: 메뉴 } */
  const vokKey = (x) => [d10(x.date), x.building, x.location, x.detail].join("|");
  function evidence(it, rc) {
    rc = rc || rec();
    const r = range();
    switch (it.src) {
      case "crew": {
        // 기간(하반기면 7/1~) 안의 입사·퇴사 기록을 날짜순으로 정리하고, 결원마다 채용 기한(비장애 2개월 · 장애 3개월) 준수를 판정
        const crew = list("getCrew"), dis = (c) => { const d = String(c.disability || "").trim(); return d && d !== "비장애"; };
        const typ = (c) => (dis(c) ? "장애" : "비장애");
        const active = crew.filter((c) => c.status !== "out" || (d10(c.left) && d10(c.left) > r.to));
        const allOut = crew.filter((c) => c.status === "out" && d10(c.left)).sort((a, b) => d10(a.left).localeCompare(d10(b.left)));
        const joins = crew.filter((c) => inP(c.since));
        const leavers = allOut.filter((c) => inP(c.left));
        // 전체 이력으로 퇴사자 ↔ 다음 입사자 짝짓기 (앞 반기 결원이 이번 기간에 채워진 경우도 잡기 위해)
        const used = new Set(), fill = new Map();
        allOut.forEach((c) => {
          const next = crew.filter((x) => x !== c && !used.has(x) && d10(x.since) && d10(x.since) >= d10(c.left)).sort((a, b) => d10(a.since).localeCompare(d10(b.since)))[0];
          if (next) { used.add(next); fill.set(c, next); }
        });
        const filledBy = new Map(); fill.forEach((n, c) => filledBy.set(n, c));
        // 판정 대상 결원 = 이 기간 퇴사자 + 앞 기간 퇴사했는데 기간 시작 때 아직 비어 있던 자리
        const carry = allOut.filter((c) => d10(c.left) < r.from && (!fill.get(c) || d10(fill.get(c).since) >= r.from));
        const vac = carry.concat(leavers).map((c) => {
          const limit = dis(c) ? 90 : 60, next = fill.get(c);
          const gap = next ? days(c.left, next.since) : days(c.left, periodEnd());
          return { c, limit, next, gap, over: gap > limit };
        });
        const late = vac.filter((v) => v.over).length, open = vac.filter((v) => !v.next && !v.over);
        const ev = [];
        carry.forEach((c) => ev.push({ d: d10(c.left), row: () => { const v = vac.find((x) => x.c === c);
          return [md(c.left), `${esc(c.name)} 퇴사(${typ(c)})`,
            v.over ? ["bad", `기한 ${v.gap - v.limit}일 넘김`] : v.next ? ["info", "아래 입사로 충원"] : ["warn", `${v.limit - v.gap}일 남음`]]; } }));
        joins.forEach((c) => ev.push({ d: d10(c.since), row: () => {
          const was = filledBy.get(c), v = was && vac.find((x) => x.c === was);
          return [md(c.since), `${esc(c.name)} 입사(${typ(c)}${c.role ? " · " + esc(c.role) : ""})${was ? ` — ${esc(was.name)} ${md(was.left)} 퇴사 자리 충원 · ${days(was.left, c.since)}일` : " — 인원 보강"}`,
            v && v.over ? ["bad", `기한 ${v.gap - v.limit}일 넘김`] : was ? ["ok", "기한 안 충원"] : ["info", "입사"]]; } }));
        leavers.forEach((c) => ev.push({ d: d10(c.left), row: () => {
          const v = vac.find((x) => x.c === c);
          return [md(c.left), `${esc(c.name)} 퇴사(${typ(c)}${c.memo ? " · " + esc(c.memo) : ""}) → ${v.next ? `${esc(v.next.name)} ${md(v.next.since)} 입사 · ${v.gap}일` : `충원 기한 ${md(new Date(new Date(d10(c.left)).getTime() + v.limit * 864e5).toISOString())}까지 · ${v.gap}일째`}`,
            v.over ? ["bad", `기한 ${v.gap - v.limit}일 넘김`] : v.next ? ["ok", "기한 안 충원"] : ["warn", `채용 진행 · ${v.limit - v.gap}일 남음`]]; } }));
        // 메모에 이 기간 날짜가 적힌 변경(예: 'TO변경')도 참고로
        crew.forEach((c) => { const m = String(c.memo || "").match(/(\d{1,2})\s*[\/.]\s*(\d{1,2})/); if (!m || joins.includes(c) || leavers.includes(c)) return;
          const d = `${S.year}-${pad(+m[1])}-${pad(+m[2])}`; if (!inP(d)) return;
          ev.push({ d, row: () => [md(d), `${esc(c.name)} · ${esc(c.memo)}`, ["info", "참고"]] }); });
        ev.sort((a, b) => a.d.localeCompare(b.d));
        const rows = ev.map((x) => x.row());
        const from = md(r.from), quiet = !joins.length && !leavers.length && !carry.length;
        if (quiet) rows.push([`${from}~`, `이 기간 입사·퇴사 인원 없음 — 결원 없이 재직 ${active.length}명 그대로 유지`, ["ok", "채용 기한 준수"]]);
        const verdict = late ? `채용 기한 넘긴 결원 ${late}명` : open.length ? `채용 기한 준수 (결원 ${open.length}명 채용 진행 중 · 기한 안)` : "채용 기한 준수";
        return { sum: quiet ? `${from}~ 입퇴사 인원 없음 · 재직 ${active.length}명 유지 → 채용 기한 준수`
            : `${from}~ 입사 ${joins.length}명 · 퇴사 ${leavers.length}명 · 재직 ${active.length}명 → ${verdict}`,
          good: quiet ? "이 기간 입퇴사가 없어 결원 없이 계약 인원을 유지했어요"
            : !late && !open.length ? "결원 자리를 모두 채용 기한 안에 채웠어요"
            : !late ? `채워진 자리는 모두 기한 안이고, 남은 결원 ${open.length}명도 아직 기한 안이에요` : "",
          rows, sug: late, sugWhy: late ? `채용 기한을 넘긴 결원 ${late}명` : "", go: "crew" };
      }
      case "training": {
        const T = gd().eduTrainings || [], recs = list("getTraining").filter((x) => String(x.year) === String(S.year));
        const crew = list("getCrew").filter((c) => (c.status !== "out" || inP(c.left) || d10(c.left) > r.to) && (!d10(c.since) || d10(c.since) <= r.to));
        const rows = crew.map((c) => {
          const done = T.filter((t) => recs.some((x) => x.name === c.name && x.key === t.key));
          return [d10(c.since) ? md(c.since) + " 입사" : "", `${esc(c.name)} · ${done.length}/${T.length} 이수${done.length < T.length ? " — 남은 교육: " + T.filter((t) => !done.includes(t)).map((t) => t.full).join(", ") : ""}`,
            done.length === T.length ? ["ok", "모두 이수"] : ["warn", `${T.length - done.length}개 남음`]];
        });
        const miss = rows.filter((x) => x[2][0] !== "ok").length;
        return { sum: `대상 ${crew.length}명 · 4개 모두 이수 ${crew.length - miss}명`, good: !miss && crew.length ? "근무 인원 모두 4대 법정교육을 마쳤어요" : "",
          rows, sug: miss, sugWhy: miss ? `교육 미이수 ${miss}명 (증빙 확인 후 적용)` : "", go: "training" };
      }
      case "safety": {
        const ms = list("getSafetyMeetings").filter((m) => inP(m.date)).sort((a, b) => d10(b.date).localeCompare(d10(a.date)));
        const cs = list("getSafetyChecks").filter((c) => inP(c.date));
        const rows = ms.map((m) => [md(m.date), `${esc(m.org || "안전보건협의체")} · ${esc(m.title)}${m.attendees ? ` <span class="muted">(${esc(m.attendees)})</span>` : ""}`, ["ok", "참석"]])
          .concat(cs.map((c) => [md(c.date), `${esc(c.title)} · 결과 ${esc(c.result)}${c.sentDate ? ` · 개선자료 ${md(c.sentDate)} 송부` : ""}`, c.done ? ["ok", "완료"] : ["warn", "진행 중"]]));
        const open = cs.filter((c) => !c.done).length;
        return { sum: `정기회의 ${ms.length}회 참석 · 안전점검 ${cs.length}건`, good: ms.length ? "정기회의에 빠짐없이 참석하고 기록을 남겼어요" : "",
          rows, sug: open, sugWhy: open ? `개선자료 미완료 점검 ${open}건` : "", go: "safety" };
      }
      case "issues": {
        // VOK는 요청·민원 전체라 바로 감점 후보가 아님 — '관리 기준 미준수'로 표시한 VOK만 감점 후보
        const is = list("getIssues").filter((x) => inP(x.date));
        const done = is.filter((x) => x.status === "완료").length, vok = is.filter((x) => x.source === "VOK").sort((a, b) => d10(b.date).localeCompare(d10(a.date)));
        const mons = list("getMonthly").filter((m) => inP(m.month));
        const fl = rc.flag || {}, flagged = vok.filter((x) => fl[vokKey(x)]).length;
        const byM = {};
        is.forEach((x) => { const k = d10(x.date).slice(0, 7); byM[k] = (byM[k] || 0) + 1; });
        const vRows = vok.map((x) => { const k = vokKey(x), on = !!fl[k];
          return [md(x.date), `VOK · ${esc(x.building)} ${esc(x.location)} · ${esc(x.detail)}`,
            ["html", `<button class="sl-flag${on ? " is-on" : ""}" onclick="SLA.flag('${encodeURIComponent(k)}')" aria-pressed="${on}" title="눌러서 관리 기준 미준수 여부 바꾸기">${on ? "관리 기준 미준수" : "일반 VOK"}</button>`]]; });
        const mRows = Object.keys(byM).sort().reverse().map((k) => { const v = vok.filter((x) => d10(x.date).startsWith(k)).length;
          return [`${+k.slice(5)}월`, `식물 이슈 ${byM[k]}건 처리 · VOK ${v}건`, ["", v ? `VOK ${v}건` : "VOK 없음"]]; });
        return { sum: `식물 이슈 ${is.length}건 · 처리 완료 ${is.length ? Math.round(done / is.length * 100) : 0}% · VOK ${vok.length}건 중 관리 기준 미준수 ${flagged}건 · 월간 리뷰 ${mons.length}회`,
          good: is.length ? `발견한 이슈 ${is.length}건 중 ${done}건을 처리했어요` + (vok.length && !flagged ? " · 관리 기준 미준수 VOK는 없어요" : "") : "",
          rows: vRows.concat(mRows), sug: flagged, sugWhy: flagged ? `관리 기준 미준수로 표시한 VOK ${flagged}건` : "", go: "issues" };
      }
      case "vok": {
        const all = list("getIssues"), vok = all.filter((x) => x.source === "VOK" && inP(x.date)).sort((a, b) => d10(b.date).localeCompare(d10(a.date)));
        const place = (x) => `${x.building} ${String(x.location || "").replace(/\s+/g, "")}`;
        const words = (x) => String(x.detail || "").replace(/발생|재발|확인|조치|요청/g, " ").split(/[^0-9A-Za-z가-힣]+/).filter((w) => w.length >= 2);
        const sameProb = (a, b) => { const wa = words(a), wb = words(b); return !wa.length || !wb.length || wa.some((w) => wb.includes(w)); };
        let same = 0, again = 0;
        const rows = vok.map((x) => {
          const end = d10(x.doneAt), gap = end ? days(x.date, end) : null;
          if (gap === 0) same++;
          // 재발 = 같은 자리·같은 문제의 앞선 건이 '조치 완료된 다음 날 이후'에 다시 접수된 건.
          // 최초 발생, 그리고 앞선 건을 처리하는 중(완료 당일 포함)에 들어온 요청은 재발이 아니라 '같은 건 추가 접수'.
          const before = all.filter((y) => y !== x && place(y) === place(x) && sameProb(y, x) && d10(y.date) < d10(x.date));
          const prev = before.filter((y) => d10(y.doneAt) && d10(y.doneAt) < d10(x.date)).sort((a, b) => d10(b.doneAt).localeCompare(d10(a.doneAt)))[0];
          const open = !prev && before.length > 0;
          if (prev) again++;
          return [md(x.date), `${esc(x.building)} ${esc(x.location)} · ${esc(x.detail)}`, prev ? ["bad", `재발 · ${md(prev.doneAt)} 조치 후`] : open ? ["warn", "같은 건 추가 접수"] : gap === 0 ? ["ok", "당일 조치"] : gap != null ? ["warn", `${gap}일 뒤 조치`] : ["warn", "처리 중"]];
        });
        return { sum: `VOK ${vok.length}건 · 당일 조치 ${same}건 · 재발 ${again}건`, good: vok.length && same === vok.length ? "VOK를 모두 접수한 날 조치했어요" : "",
          rows, sug: again, sugWhy: again ? `조치 후 같은 자리 재발 ${again}건` : "", go: "issues" };
      }
      case "heat": {
        const hs = list("getHeat").filter((h) => inP(h.date));
        const feel = (h) => { try { const v = gd().htFeel ? gd().htFeel(h.date, h.temp, h.hum, h.wind) : null; return v && typeof v === "object" ? v.feel : v; } catch (e) { return null; } };
        const hot = hs.filter((h) => Number(feel(h)) >= 31);
        const dayN = new Set(hs.map((h) => d10(h.date))).size;
        const cs = list("getSafetyChecks").filter((c) => inP(c.date));
        const rows = hot.slice(0, 12).map((h) => [md(h.date), `${esc(h.place)} ${esc(h.zone)} · 체감 ${Math.round(feel(h))}°${h.action ? " · " + esc(h.action) : ""}`, h.action ? ["ok", "조치 기록"] : ["warn", "조치 기록 없음"]])
          .concat(cs.map((c) => [md(c.date), `${esc(c.title)} · 작업환경 점검 결과 ${esc(c.result)}${c.action ? " · " + esc(c.action) : ""}`, c.result === "양호" ? ["ok", "양호"] : ["warn", esc(c.result)]]));
        return { sum: `체감온도 기록 ${hs.length}회(${dayN}일) · 31° 이상 ${hot.length}회 · 안전점검 ${cs.length}건`, good: cs.length && cs.every((c) => c.result === "양호") ? "안전점검 결과가 모두 양호했어요" : hs.length ? "폭염기 체감온도를 재고 기록했어요" : "",
          rows, sug: 0, sugWhy: "", go: "heat" };
      }
      case "incident": {
        const xs = list("getIncidents").filter((x) => inP(x.date));
        const rows = xs.map((x) => [md(x.date), `${esc(x.type)} · ${esc(x.place)} · ${esc(x.content)}`, x.status === "완료" ? ["ok", "처리 완료"] : ["warn", esc(x.status)]]);
        return { sum: `사고 ${xs.length}건`, good: xs.length ? "" : "이 기간 사고가 한 건도 없었어요", rows, sug: xs.length, sugWhy: xs.length ? `등록된 사고 ${xs.length}건 (병원 치료 여부 확인 후 적용)` : "", go: "safety" };
      }
      case "ops": {
        const sw = list("getSwaps").filter((x) => x.status !== "예정" && inP(x.date || x.planDate));
        const mons = list("getMonthly").filter((m) => inP(m.month));
        const rows = sw.slice(0, 12).map((x) => [md(x.date || x.planDate), `${esc(x.location)} · ${esc(x.species)}${x.kind === "swap" && x.to ? " → " + esc(x.to) : ""}${x.why ? " · " + esc(x.why) : ""}`, ["ok", "교체 완료"]])
          .concat(mons.map((m) => [esc(m.month), "월간 리뷰 보드 공유", ["ok", "공유"]]));
        return { sum: `식물 교체 ${sw.length}건 · 월간 리뷰 ${mons.length}회`, good: sw.length || mons.length ? "교체·리뷰 기록을 남겼어요" : "", rows, sug: 0, sugWhy: "", go: "swaps" };
      }
      case "supply": {
        const st = list("getSettle").filter((x) => inP(x.date));
        const sum = st.reduce((s, x) => s + (Number(x.amount) || 0), 0);
        const byC = {};
        st.forEach((x) => { byC[x.category] = (byC[x.category] || 0) + 1; });
        const rows = Object.keys(byC).map((k) => ["", `${esc(k)} ${byC[k]}건`, ["ok", "정산"]]);
        return { sum: `정산 ${st.length}건 · ${sum.toLocaleString("ko-KR")}원`, good: st.length ? "부자재·소모품 구매를 정산 기록으로 관리했어요" : "", rows, sug: 0, sugWhy: "", go: "settlement" };
      }
    }
    return { sum: "", rows: [], sug: 0, go: "" };
  }

  /* ---------- 직접 고친 내용 합치기 ----------
     r.ev[code] = { sum, good, add: [{d, t, k}], hide: [자동 기록 키] } · r.pre[code] = [가채점 근거 줄] */
  const rowKey = (row) => row[0] + "|" + row[1];
  const preOf = (it, r) => ((r.pre || {})[it.code]) || it.pre;
  const KINDS = { ok: "잘 지킴", warn: "확인 필요", bad: "감점 사유" };
  const CHIPK = { ok: "초록(잘 지킴)", info: "회색(참고)", warn: "노랑(확인 필요)", bad: "빨강(감점)" };
  const plain = (h) => { const el = document.createElement("div"); el.innerHTML = String(h || "").replace(/<br\s*\/?>/g, "\n"); return el.textContent; };
  // 자동 기록 고침: r.ev[code].fix[자동 기록 키] = { d, t, c(칩 글자), k(칩 색) } · 빈 {} = 자동 그대로 · 키가 없으면 DEF_FIX
  function fixOf(it, row, o) {
    const fx = (o || {}).fix || {}, k = rowKey(row);
    if (k in fx) return Object.keys(fx[k] || {}).length ? fx[k] : null;
    const t = plain(row[1]), def = DEF_FIX.find((x) => x.p === pkey() && x.code === it.code && x.d === row[0] && t.startsWith(x.start));
    return def ? def.fix : null;
  }
  function fixRow(it, row, o) {
    const f = fixOf(it, row, o); if (!f) return row;
    const st = f.c ? [f.k || "info", esc(f.c)] : row[2];
    return [f.d ? esc(f.d) : row[0], "t" in f ? esc(f.t).replace(/\n/g, "<br>") : row[1], st];
  }
  function evx(it, r) {
    const ev = evidence(it, r), o = ((r.ev || {})[it.code]) || {}, hide = o.hide || [], add = o.add || [];
    const bad = add.filter((a) => a.k === "bad").length;
    return Object.assign({}, ev, {
      autoSum: ev.sum, autoGood: ev.good || "",
      sum: o.sum ? esc(o.sum) : ev.sum,
      good: "good" in o ? esc(o.good) : ev.good,
      edited: !!(o.sum || "good" in o),
      auto: ev.rows.map((row, i) => ({ row: fixRow(it, row, o), i, fixed: !!fixOf(it, row, o) })).filter((x) => !hide.includes(rowKey(ev.rows[x.i]))),
      hidden: hide.length, add,
      sug: (ev.sug || 0) + bad,
      sugWhy: [ev.sugWhy, bad ? `직접 기록한 감점 사유 ${bad}건` : ""].filter(Boolean).join(" · "),
    });
  }
  const evOf = (r, code) => { r.ev = r.ev || {}; return (r.ev[code] = r.ev[code] || {}); };
  const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };

  /* ---------- 그리기 ---------- */
  const chip = (k, t) => `<span class="sl-chip sl-chip--${k}">${t}</span>`;
  const chipBtn = (k, t, on) => isJamie() ? `<button class="sl-chip sl-chip--${k} sl-chip--btn" onclick="${on}" title="눌러서 고치기">${t}</button>` : chip(k, t);
  const maxN = (it) => Math.floor(it.max / it.per);
  const stepper = (it, r) => `<span class="sl-step"><button onclick="SLA.n('${it.code}',-1)" aria-label="감점 빼기">−</button><input type="number" inputmode="numeric" min="0" max="${maxN(it)}" value="${nOf(it, r)}" aria-label="감점 ${it.unit} 수" onchange="SLA.set('${it.code}',this.value)"><button onclick="SLA.n('${it.code}',1)" aria-label="감점 더하기">＋</button></span>`;
  const rowForm = (a) => `<div class="sl-form">
      <div class="sl-form__r"><input type="date" id="slRd" value="${esc(d10(a.d) || "")}" aria-label="날짜">
        <select id="slRk" aria-label="상태">${Object.keys(KINDS).map((k) => `<option value="${k}"${(a.k || "ok") === k ? " selected" : ""}>${KINDS[k]}</option>`).join("")}</select></div>
      <textarea id="slRt" rows="2" placeholder="예) 3/12 라운딩 — 7층 화분 물주기 일정 지연, 당일 보완">${esc(a.t || "")}</textarea>
      <div class="sl-form__b"><button class="sl-btn sl-btn--ink" onclick="SLA.saveRow()">저장</button><button class="sl-btn" onclick="SLA.cancel()">취소</button></div></div>`;
  const fixForm = (d, txt, st, fixed) => {
    const isHtml = st[0] === "html", k = isHtml ? "" : st[0];
    return `<div class="sl-form">
      <div class="sl-form__r"><input id="slFd" value="${esc(plain(d))}" placeholder="날짜 예) 6/26" aria-label="날짜">
        ${isHtml ? "" : `<input id="slFc" value="${esc(plain(st[1]))}" placeholder="상태 글자" aria-label="상태 글자">
        <select id="slFk" aria-label="상태 색">${Object.keys(CHIPK).map((x) => `<option value="${x}"${(k || "info") === x ? " selected" : ""}>${CHIPK[x]}</option>`).join("")}</select>`}</div>
      <textarea id="slRt" rows="2" aria-label="내용">${esc(plain(txt))}</textarea>
      <div class="sl-form__b"><button class="sl-btn sl-btn--ink" onclick="SLA.saveFix()">저장</button><button class="sl-btn" onclick="SLA.cancel()">취소</button>${fixed ? `<button class="sl-btn sl-btn--ghost" onclick="SLA.resetFix()">자동 기록으로 되돌리기</button>` : ""}</div></div>`;
  };
  const head = () => {
    const halves = [[1, "상반기"], [2, "하반기"]];
    return `<div class="page-head">
      <div><p class="eyebrow">Operation · SLA</p><h2>조경관리 SLA</h2>
        <p class="sub">카카오 아지트 · 우리가 서비스를 얼마나 잘 했는지 — 대시보드 기록으로 확인하고 가채점해요</p></div>
      <div class="sl-head-r">
        <div class="sl-seg"><button onclick="SLA.year(-1)" aria-label="이전 해">‹</button><b>${S.year}</b><button onclick="SLA.year(1)" aria-label="다음 해">›</button></div>
        <div class="sl-seg">${halves.map(([h, t]) => `<button class="${S.half === h ? "is-on" : ""}" onclick="SLA.half(${h})">${t}</button>`).join("")}</div>
      </div></div>
      <div class="sl-tabs">${[["score", "가채점"], ["table", "기준표"], ["report", "보고서"]].map(([k, t]) => `<button class="${S.tab === k ? "is-on" : ""}" onclick="SLA.tab('${k}')">${t}</button>`).join("")}</div>`;
  };

  function scoreView() {
    const J = isJamie(); if (!J) S.ed = null;
    const r = rec(), it = ITEMS[S.sel], ev = evx(it, r), t = total(r), g = gradeOf(t), cat = CATS[it.c - 1], E = S.ed || {};
    const listH = CATS.map((c) => `<p class="sl-gh">${c.no}. ${c.name} · ${c.w}%</p>` + ITEMS.map((x, i) => x.c !== c.no ? "" :
      `<button class="sl-li${i === S.sel ? " is-on" : ""}" onclick="SLA.sel(${i})"><span class="sl-dot${nOf(x, r) ? " is-w" : ""}"></span><b>${x.code} ${x.name}</b><span class="sl-li__s">${scoreOf(x, r)}<i>/${x.max}</i></span></button>`).join("")).join("");
    const addRows = ev.add.map((a, i) => E.kind === "row" && E.i === i ? rowForm(a) :
      `<div class="sl-ev sl-ev--me"><span class="sl-ev__d">${d10(a.d) ? md(a.d) : "—"}</span><span class="sl-ev__t"><em class="sl-me">직접 기록</em>${esc(a.t).replace(/\n/g, "<br>")}</span>
        <span class="sl-ev__r">${chipBtn(a.k || "ok", KINDS[a.k] || KINDS.ok, `SLA.ed('row',${i})`)}<button class="sl-ic" onclick="SLA.ed('row',${i})" aria-label="고치기" title="고치기">✎</button><button class="sl-ic" onclick="SLA.delRow(${i})" aria-label="지우기" title="지우기">✕</button></span></div>`).join("");
    const autoRows = ev.auto.map(({ row: [d, txt, st], i, fixed }) => E.kind === "fix" && E.i === i ? fixForm(d, txt, st, fixed) : `<div class="sl-ev"><span class="sl-ev__d">${d}</span><span class="sl-ev__t">${txt}</span>
        <span class="sl-ev__r">${st[0] === "html" ? st[1] : chipBtn(st[0], st[1], `SLA.ed('fix',${i})`)}<button class="sl-ic" onclick="SLA.ed('fix',${i})" aria-label="고치기" title="고치기">✎</button><button class="sl-ic sl-ic--h" onclick="SLA.hide(${i})" aria-label="이 기록 숨기기" title="보고서·가채점에서 빼기">✕</button></span></div>`).join("");
    const newForm = E.kind === "new" ? rowForm({}) : "";
    const rows = addRows || autoRows || newForm ? newForm + addRows + autoRows : `<p class="sl-empty">이 기간 기록이 없어요</p>`;
    const sumH = E.kind === "sum" ? `<div class="sl-form">
        <label class="sl-memo"><span class="sl-lbl">한 줄 요약</span><input id="slSs" value="${esc(ev.edited && ((r.ev || {})[it.code] || {}).sum || "")}" placeholder="${esc(ev.autoSum)}"></label>
        <label class="sl-memo"><span class="sl-lbl">잘 지킨 점</span><input id="slSg" value="${esc("good" in ((r.ev || {})[it.code] || {}) ? r.ev[it.code].good : ev.autoGood)}" placeholder="비우면 표시 안 해요"></label>
        <div class="sl-form__b"><button class="sl-btn sl-btn--ink" onclick="SLA.saveSum()">저장</button><button class="sl-btn" onclick="SLA.cancel()">취소</button>${ev.edited ? `<button class="sl-btn sl-btn--ghost" onclick="SLA.resetSum()">자동 요약으로 되돌리기</button>` : ""}</div></div>`
      : `<div class="sl-sumrow"><div><p class="sl-sum">${ev.sum}</p>${ev.good ? `<p class="sl-good">✓ ${ev.good}</p>` : ""}</div><button class="sl-ic sl-ic--t" onclick="SLA.ed('sum')" title="요약 고치기">✎ 고치기</button></div>`;
    const pre = preOf(it, r), preEdited = !!((r.pre || {})[it.code]);
    const preH = E.kind === "pre" ? `<div class="sl-form"><span class="sl-lbl">가채점 근거 · 한 줄에 하나씩</span><textarea id="slPre" rows="${Math.max(3, pre.length + 1)}">${esc(pre.join("\n"))}</textarea>
        <div class="sl-form__b"><button class="sl-btn sl-btn--ink" onclick="SLA.savePre()">저장</button><button class="sl-btn" onclick="SLA.cancel()">취소</button>${preEdited ? `<button class="sl-btn sl-btn--ghost" onclick="SLA.resetPre()">처음 내용으로 되돌리기</button>` : ""}</div></div>`
      : `<div class="sl-pre"><div>${pre.length ? pre.map((p) => "· " + esc(p)).join("<br>") : `<span class="sl-muted0">가채점 근거가 없어요</span>`}</div><button class="sl-ic sl-ic--t" onclick="SLA.ed('pre')" title="근거 고치기">✎ 고치기</button></div>`;
    const n = nOf(it, r), sug = ev.sug || 0;
    const center = `
      <div class="sl-ttl"><div><h3>${it.code} ${it.name}</h3><span>${cat.name} · 반영 ${cat.w}% · ${cat.cycle} · 만점 ${it.max}점</span></div><span class="sl-pt">${scoreOf(it, r)}점</span></div>
      <div class="sl-flow">
        <div class="sl-fs"><span class="sl-n is-ok">1</span><div><h4>평가기준 <small>${it.per}점 감점 / ${it.unit}</small></h4>
          ${E.kind === "crit" ? `<div class="sl-form">
            <span class="sl-lbl">평가기준 · 한 줄에 하나씩</span><textarea id="slCr" rows="${Math.max(3, it.crit.length + 1)}">${esc(it.crit.join("\n"))}</textarea>
            <label class="sl-memo"><span class="sl-lbl">비고</span><input id="slCn" value="${esc(it.note)}" placeholder="비우면 표시 안 해요"></label>
            <div class="sl-row"><span class="sl-lbl">감점 점수</span><input id="slCp" type="number" min="1" max="${it.max}" value="${it.per}" class="sl-cp" aria-label="감점 점수"><span class="sl-muted">점 / ${it.unit}</span></div>
            <div class="sl-form__b"><button class="sl-btn sl-btn--ink" onclick="SLA.saveCrit()">저장</button><button class="sl-btn" onclick="SLA.cancel()">취소</button>${critStore()[it.code] ? `<button class="sl-btn sl-btn--ghost" onclick="SLA.resetCrit()">처음 기준으로 되돌리기</button>` : ""}</div></div>`
          : `<div class="sl-pre"><div><ul class="sl-crit">${it.crit.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>${it.note ? `<p class="sl-note">비고 · ${esc(it.note)}</p>` : ""}</div><button class="sl-ic sl-ic--t" onclick="SLA.ed('crit')" title="기준 고치기">✎ 고치기</button></div>`}</div></div>
        <div class="sl-fs"><span class="sl-n is-on">2</span><div><h4>이렇게 진행했어요 <small>대시보드 기록 · ${S.year} ${S.half === 1 ? "상반기" : "하반기"}</small></h4>
          <div class="sl-box">${sumH}<div class="sl-evs">${rows}</div>
          <div class="sl-acts">${E.kind === "new" ? "" : `<button class="sl-btn sl-btn--ink" onclick="SLA.ed('new')">＋ 기록 추가</button>`}${ev.hidden ? `<button class="sl-btn sl-btn--ghost" onclick="SLA.unhide()">숨긴 자동 기록 ${ev.hidden}개 다시 보기</button>` : ""}
          ${ev.go ? `<button class="sl-go" onclick="GD.go('${ev.go}')">기록 보러 가기 →</button>` : ""}</div></div></div></div>
        <div class="sl-fs"><span class="sl-n">3</span><div><h4>가채점 <small>${n ? `−${n * it.per}점` : "감점 없음"}</small></h4>
          <div class="sl-box"><div class="sl-row"><span class="sl-lbl">감점 ${it.unit} 수</span>${stepper(it, r)}<span class="sl-muted">${it.max} → <b>${scoreOf(it, r)}</b>점</span></div>
          ${sug && sug !== n ? `<div class="sl-sug">대시보드 기준 감점 후보 <b>${sug}${it.unit}</b> · ${esc(ev.sugWhy)}<button onclick="SLA.set('${it.code}',${sug})">후보 적용</button></div>` : sug && sug === n ? `<p class="sl-good">✓ 대시보드 감점 후보(${sug}${it.unit})와 같아요</p>` : n > sug ? `<p class="sl-diff">대시보드 기록의 감점 후보(${sug}${it.unit})보다 ${n - sug}${it.unit} 많아요 · 라운딩 의견 등 근거를 메모에 남겨 주세요</p>` : ""}
          ${preH}
          <label class="sl-memo"><span class="sl-lbl">가채점 메모</span><textarea rows="2" placeholder="라운딩 의견, 감점 근거 등" oninput="SLA.memo('${it.code}',this.value)"${J ? "" : " readonly"}>${esc(r.memo[it.code] || "")}</textarea></label></div></div></div>
      </div>`;
    const kept = ITEMS.filter((x) => !nOf(x, r)).length;
    const nx = GRADES[GRADES.indexOf(g) - 1];
    const right = `
      <div class="sl-rs"><span class="sl-lbl">${S.year} ${S.half === 1 ? "상반기" : "하반기"} 가채점</span>
        <div class="sl-total"><span class="sl-grade">${g[0]}</span><div><b>${f2(t)}</b><i>점</i><p>${esc(g[4])}</p></div></div></div>
      <div class="sl-rs"><span class="sl-lbl">잘 지킨 항목</span><p class="sl-kept"><b>${kept}</b> / ${ITEMS.length}개 항목 감점 없음</p></div>
      <div class="sl-rs"><span class="sl-lbl">영역별</span>${CATS.map((c) => { const v = catScore(c, r); return `<div class="sl-cat"><b>${c.no}. ${c.name}</b><span>${f2(v)} / ${c.w}</span><div class="sl-bar"><i class="${v < c.w ? "is-w" : ""}" style="width:${v / c.w * 100}%"></i></div></div>`; }).join("")}</div>
      <div class="sl-rs"><span class="sl-lbl">다음 등급까지</span><p class="sl-next">${nx ? `${nx[0]}등급(${nx[1]}점)까지 <b>${f2(nx[1] - t)}점</b>` : "가장 높은 등급이에요"}</p></div>`;
    return `${J ? "" : `<p class="sl-ro-note">🔒 기록·기준·가채점 고치기는 제이미만 할 수 있어요 · 지금은 보기만 돼요</p>`}<div class="sl-3${J ? "" : " sl-ro"}">
      <div class="sl-pane sl-pane--list">${listH}</div>
      <div class="sl-pane">${center}</div>
      <div class="sl-pane sl-pane--side">${right}</div></div>`;
  }

  function tableView() {
    const r = rec(), t = total(r), g = gradeOf(t);
    return `<div class="sl-strip"><div class="sl-strip__g"><span class="sl-grade">${g[0]}</span><div><span>가채점 총점</span><b>${f2(t)}</b></div></div>
        <div><span>감점 합계</span><b>−${ITEMS.reduce((s, i) => s + nOf(i, r) * i.per, 0)}<i>점</i></b></div>
        <div><span>감점 없는 항목</span><b>${ITEMS.filter((x) => !nOf(x, r)).length}<i>/${ITEMS.length}</i></b></div>
        <div><span>평가내용</span><b class="sl-strip__t">${esc(g[4])}</b></div></div>
      <div class="table-wrap"><table class="grid-table sl-tbl"><thead><tr><th>항목</th><th>평가기준</th><th>평가방식</th><th>진행 내역</th><th>가채점</th><th class="num">점수</th></tr></thead><tbody>
      ${CATS.map((c) => `<tr class="sl-tbl__c"><td colspan="5">${c.no}. ${c.name} · 반영 ${c.w}% · ${c.cycle}</td><td class="num">${f2(catScore(c, r))} / ${c.w}</td></tr>` + ITEMS.map((x) => x.c !== c.no ? "" : `<tr>
        <td><b>${x.code} ${x.name}</b><br><span class="muted">만점 ${x.max}</span></td>
        <td><ul class="sl-crit">${x.crit.map((v) => `<li>${esc(v)}</li>`).join("")}</ul>${x.note ? `<p class="sl-note">${esc(x.note)}</p>` : ""}</td>
        <td>${x.per}점 감점 / ${x.unit}</td>
        <td class="sl-tbl__ev">${evx(x, r).sum}</td>
        <td>${stepper(x, r)}</td>
        <td class="num"><b>${scoreOf(x, r)}</b></td></tr>`).join("")).join("")}
      <tr class="sl-tbl__c"><td colspan="5">합계 (영역별 점수 합 ÷ 만점 합 × 반영비율)</td><td class="num">${f2(t)}</td></tr></tbody></table></div>`;
  }

  function reportView() {
    const r = rec(), t = total(r), g = gradeOf(t);
    return `<div class="sl-rp-tools"><button class="btn btn--primary btn--sm" onclick="SLA.print()">PDF로 저장 · 인쇄</button><span class="muted">인센티브·계약 내용은 이 보고서에만 나와요</span></div>
      <div class="sl-a4"><h3>${S.year}년 ${S.half === 1 ? "상반기" : "하반기"} 조경관리 SLA 평가</h3>
        <p class="sl-a4__m">카카오 아지트 · 주식회사 링키지랩 스낵앤가든사업팀 · 가채점 기준 · ${todayStr()} 작성</p>
        <div class="sl-a4__top"><span class="sl-grade sl-grade--lg">${g[0]}</span><div><b>${f2(t)}점</b><p>${esc(g[4])}</p></div>
          <div class="sl-a4__inc"><span>인센티브 지급률</span><b>${g[3] > 0 ? "+" : ""}${g[3]}%</b><span>${esc(g[5] || "—")}</span></div></div>
        <table><thead><tr><th>구분</th><th>항목</th><th>진행 내역</th><th class="r">만점</th><th class="r">점수</th><th>감점 · 메모</th></tr></thead><tbody>
        ${ITEMS.map((x) => `<tr><td>${x.c}. ${CATS[x.c - 1].name}<br><span class="muted">${CATS[x.c - 1].w}%</span></td><td>${x.code} ${x.name}</td><td>${(() => { const e = evx(x, r); return e.sum + e.add.map((a) => `<br>· ${d10(a.d) ? md(a.d) + " " : ""}${esc(a.t)}`).join(""); })()}</td><td class="r">${x.max}</td><td class="r"><b>${scoreOf(x, r)}</b></td>
          <td>${nOf(x, r) ? `−${nOf(x, r) * x.per}점 (${nOf(x, r)}${x.unit})` : "감점 없음"}${r.memo[x.code] ? `<br>${esc(r.memo[x.code])}` : ""}</td></tr>`).join("")}
        <tr class="sl-a4__sum"><td colspan="4">합계 (반영비율 적용) · ${CATS.map((c) => `${c.no}) ${f2(catScore(c, r))}`).join(" · ")}</td><td class="r"><b>${f2(t)}</b></td><td>${g[0]}등급</td></tr></tbody></table>
        <p class="sl-a4__h">등급 구간</p>
        <div class="sl-a4__gr">${GRADES.map((x) => `<span class="${x === g ? "is-on" : ""}"><b>${x[0]}</b> ${x[1]}~${x[2]} · ${x[3] > 0 ? "+" : ""}${x[3]}%${x[5] ? " · " + x[5] : ""}</span>`).join("")}</div>
        <div class="sl-a4__sig"><div>평가 · 카카오 총무 사옥관리</div><div>확인 · 링키지랩 스낵앤가든사업팀</div></div></div>`;
  }

  function paint() {
    const el = document.getElementById("slBody"); if (!el) return;
    el.innerHTML = S.tab === "table" ? tableView() : S.tab === "report" ? reportView() : scoreView();
    const h = document.getElementById("slHead"); if (h) h.innerHTML = head();
  }

  const EDIT_FNS = ["n", "set", "ed", "saveRow", "delRow", "hide", "flag", "unhide", "saveSum", "resetSum", "savePre", "resetPre", "memo", "saveFix", "resetFix", "saveCrit", "resetCrit"];
  window.SLA = {
    html() { return `<section class="view sl"><div id="slHead">${head()}</div><div id="slBody"></div></section>`; },
    mount() { paint(); },
    sel(i) { S.sel = i; S.ed = null; paint(); },
    tab(k) { S.tab = k; S.ed = null; paint(); },
    half(h) { S.half = h; S.ed = null; paint(); },
    year(d) { S.year += d; S.ed = null; paint(); },
    n(code, d) { const r = rec(), it = ITEMS.find((x) => x.code === code); r.n[code] = Math.max(0, Math.min(maxN(it), nOf(it, r) + d)); save(r); paint(); },
    set(code, v) { const r = rec(), it = ITEMS.find((x) => x.code === code); r.n[code] = Math.max(0, Math.min(maxN(it), Math.floor(Number(v)) || 0)); save(r); paint(); },
    /* 진행 내역 · 가채점 근거 고치기 */
    ed(kind, i) {
      S.ed = { kind, i }; paint();
      const f = document.getElementById(kind === "sum" ? "slSs" : kind === "pre" ? "slPre" : kind === "crit" ? "slCr" : "slRt");
      if (f) { f.focus(); if (f.setSelectionRange) { const l = f.value.length; f.setSelectionRange(l, l); } }
    },
    cancel() { S.ed = null; paint(); },
    saveRow() {
      const t = val("slRt"); if (!t) { const f = document.getElementById("slRt"); if (f) f.focus(); return; }
      const r = rec(), o = evOf(r, ITEMS[S.sel].code), a = { d: val("slRd"), t, k: val("slRk") || "ok" };
      o.add = o.add || [];
      if (S.ed && S.ed.kind === "row") o.add[S.ed.i] = a; else o.add.unshift(a);
      save(r); S.ed = null; paint();
    },
    delRow(i) {
      if (!confirm("이 기록을 지울까요?")) return;
      const r = rec(), o = evOf(r, ITEMS[S.sel].code); (o.add || []).splice(i, 1); save(r); S.ed = null; paint();
    },
    hide(i) {
      const r = rec(), it = ITEMS[S.sel], row = evidence(it, r).rows[i]; if (!row) return;
      const o = evOf(r, it.code); o.hide = (o.hide || []).concat(rowKey(row)); save(r); paint();
    },
    saveFix() {
      const r = rec(), it = ITEMS[S.sel], row = evidence(it, r).rows[S.ed.i]; if (!row) return;
      const o = evOf(r, it.code), f = {}, d = val("slFd"), t = val("slRt"), c = val("slFc");
      if (d && d !== plain(row[0])) f.d = d;
      if (t !== plain(row[1])) f.t = t;
      if (document.getElementById("slFc") && (c !== plain(row[2][1]) || val("slFk") !== row[2][0])) { f.c = c || plain(row[2][1]); f.k = val("slFk") || "info"; }
      o.fix = o.fix || {}; o.fix[rowKey(row)] = f;
      save(r); S.ed = null; paint();
    },
    resetFix() {
      const r = rec(), it = ITEMS[S.sel], row = evidence(it, r).rows[S.ed.i]; if (!row) return;
      const o = evOf(r, it.code); o.fix = o.fix || {}; o.fix[rowKey(row)] = {};
      save(r); S.ed = null; paint();
    },
    saveCrit() {
      const it = ITEMS[S.sel], el = document.getElementById("slCr"), all = critStore();
      const crit = (el ? el.value : "").split(/\r?\n/).map((x) => x.trim().replace(/^[·•\-]\s*/, "")).filter(Boolean);
      const o = { crit, note: val("slCn"), per: Math.max(1, Math.floor(Number(val("slCp"))) || it._d.per) };
      if (crit.join("|") === it._d.crit.join("|") && o.note === it._d.note && o.per === it._d.per) delete all[it.code]; else all[it.code] = o;
      try { localStorage.setItem(CKEY, JSON.stringify(all)); } catch (e) {}
      applyCrit(); S.ed = null; paint();
    },
    resetCrit() { const all = critStore(); delete all[ITEMS[S.sel].code]; try { localStorage.setItem(CKEY, JSON.stringify(all)); } catch (e) {} applyCrit(); S.ed = null; paint(); },
    flag(k) {
      k = decodeURIComponent(k); const r = rec(); r.flag = r.flag || {};
      if (r.flag[k]) delete r.flag[k]; else r.flag[k] = 1; save(r); paint();
    },
    unhide() { const r = rec(), o = evOf(r, ITEMS[S.sel].code); delete o.hide; save(r); paint(); },
    saveSum() {
      const r = rec(), it = ITEMS[S.sel], o = evOf(r, it.code), s = val("slSs"), g = val("slSg"), auto = evidence(it, r).good || "";
      if (s) o.sum = s; else delete o.sum;
      if (g !== auto) o.good = g; else delete o.good;
      save(r); S.ed = null; paint();
    },
    resetSum() { const r = rec(), o = evOf(r, ITEMS[S.sel].code); delete o.sum; delete o.good; save(r); S.ed = null; paint(); },
    savePre() {
      const r = rec(), it = ITEMS[S.sel], el = document.getElementById("slPre");
      const lines = (el ? el.value : "").split(/\r?\n/).map((x) => x.trim().replace(/^[·•\-]\s*/, "")).filter(Boolean);
      r.pre = r.pre || {};
      if (lines.join("|") === it.pre.join("|")) delete r.pre[it.code]; else r.pre[it.code] = lines;
      save(r); S.ed = null; paint();
    },
    resetPre() { const r = rec(); if (r.pre) delete r.pre[ITEMS[S.sel].code]; save(r); S.ed = null; paint(); },
    memo(code, v) { const r = rec(); r.memo[code] = v; save(r); },
    print() {
      document.body.classList.add("sl-printing");
      const off = () => { document.body.classList.remove("sl-printing"); window.removeEventListener("afterprint", off); };
      window.addEventListener("afterprint", off);
      window.print();
    },
  };
  EDIT_FNS.forEach((k) => { const f = window.SLA[k]; if (f) window.SLA[k] = function () { if (!isJamie()) return; return f.apply(this, arguments); }; });
})();
