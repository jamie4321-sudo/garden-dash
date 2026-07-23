/**
 * =========================================================
 * GARDEN — Ops Data  ·  Google Apps Script 백엔드
 * ---------------------------------------------------------
 * 1) 이 코드를 script.google.com 새 프로젝트에 붙여넣기
 * 2) setup() 을 한 번 실행 → 시트 탭/시드 데이터 자동 생성 (최초 1회, 권한 승인 필요)
 * 3) 배포 > 새 배포 > 웹 앱
 *      - 실행: 나(본인)
 *      - 액세스 권한: 모든 사용자
 *    → 배포 후 나오는 웹 앱 URL 을  js/config.js 의 API_URL 에 붙여넣기
 * =========================================================
 */

// GARDEN — Ops Data 스프레드시트 ID (자동 연결됨)
const SHEET_ID = '1t7ivyi9udBQ7hIJQXDd1jddgFi4wcHPcmDs4ikSebaU';

/* ---------- 시드 데이터 (js/data.js 와 동일 구조) ---------- */
const SEED = {
  meta: [['key', 'value'], ['asOf', '2026-07-23']],

  kpi: [
    ['label', 'num', 'unit', 'sub', 'trend', 'variant'],
    ['이번 달 매출', '48.2', 'M', '+12.4% vs 6월', 'up', 'acid'],
    ['재직 크루', '27', '명', '휴직 2 · 신규 3', 'flat', ''],
    ['오늘 출근', '19', '명', '결원 1 · 지각 0', 'flat', 'green'],
    ['미처리 이슈', '4', '건', '+2 어제 대비', 'down', 'warn'],
  ],

  crewMix: [
    ['label', 'val', 'color'],
    ['정규직', 14, 'var(--accent)'],
    ['파트타임', 9, 'var(--blue)'],
    ['매니저', 4, 'var(--violet)'],
  ],

  storeSales: [
    ['label', 'val', 'pct'],
    ['성수 본점', 18.4, 100],
    ['연남점', 12.1, 66],
    ['판교점', 9.7, 53],
    ['여의도점', 8.0, 43],
  ],

  weekTrend: [
    ['d', 'v'],
    ['월', 5.8], ['화', 6.4], ['수', 6.1], ['목', 7.2],
    ['금', 8.9], ['토', 9.6], ['일', 4.2],
  ],

  todos: [
    ['time', 'text', 'done'],
    ['09:00', '성수점 오픈 점검 · 재고 확인', true],
    ['11:30', '신규 크루 2인 온보딩 미팅', true],
    ['14:00', '7월 정산 마감 자료 정리', false],
    ['16:00', '연남점 발주 승인', false],
    ['18:30', '주간 매출 리포트 발송', false],
  ],

  crew: [
    ['name', 'role', 'store', 'status', 'since', 'tags'],
    ['김서연', '매니저', '성수 본점', 'active', '2023-04', '바리스타,교육'],
    ['이준호', '정규직', '성수 본점', 'active', '2024-01', '베이킹'],
    ['박지민', '파트타임', '연남점', 'active', '2025-03', '홀'],
    ['최유나', '정규직', '판교점', 'leave', '2023-09', '바리스타'],
    ['정민석', '매니저', '여의도점', 'active', '2022-11', '바리스타,발주'],
    ['한소희', '파트타임', '연남점', 'active', '2025-06', '홀,신규'],
    ['오세훈', '정규직', '판교점', 'out', '2024-05', '베이킹'],
    ['윤아름', '파트타임', '성수 본점', 'active', '2025-01', '홀'],
  ],

  // schedule: 하루에 여러 이벤트 → 행마다 하나씩 (date/day/today 반복)
  schedule: [
    ['date', 'day', 'today', 'time', 'text', 'cat'],
    ['07/20', '월', false, '09:00', '성수 오픈', 'var(--accent)'],
    ['07/20', '월', false, '13:00', '발주 마감', 'var(--blue)'],
    ['07/21', '화', false, '10:00', '크루 교육', 'var(--violet)'],
    ['07/22', '수', false, '11:00', '연남 점검', 'var(--accent)'],
    ['07/22', '수', false, '15:00', '재고 실사', 'var(--amber)'],
    ['07/23', '목', true, '11:30', '온보딩 미팅', 'var(--violet)'],
    ['07/23', '목', true, '14:00', '정산 마감', 'var(--red)'],
    ['07/23', '목', true, '18:30', '리포트 발송', 'var(--accent)'],
    ['07/24', '금', false, '10:00', '판교 오픈', 'var(--accent)'],
    ['07/24', '금', false, '16:00', '주간 회의', 'var(--blue)'],
  ],
};

/** 최초 1회 실행 — 탭 생성 + 시드 데이터 입력 */
function setup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  Object.keys(SEED).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.clear();
    const rows = SEED[name];
    sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
  });
  // 기본 Sheet1 제거
  const def = ss.getSheetByName('Sheet1') || ss.getSheetByName('시트1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  return 'setup done: ' + Object.keys(SEED).join(', ');
}

/** 웹 앱 GET — 전체 데이터를 JSON 으로 반환 */
function doGet(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const out = {};

  // meta → asOf 등 key/value
  out.asOf = kv_(ss, 'meta').asOf || '';

  out.kpi        = rows_(ss, 'kpi');
  out.crewMix    = rows_(ss, 'crewMix').map(numify_(['val']));
  out.storeSales = rows_(ss, 'storeSales').map(numify_(['val', 'pct']));
  out.weekTrend  = rows_(ss, 'weekTrend').map(numify_(['v']));
  out.todos      = rows_(ss, 'todos').map(function (r) { r.done = boolify_(r.done); return r; });
  out.crew       = rows_(ss, 'crew').map(function (r) {
    r.tags = String(r.tags || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    return r;
  });

  // schedule: date 기준 그룹화
  const flat = rows_(ss, 'schedule');
  const byDate = {};
  const order = [];
  flat.forEach(function (r) {
    if (!byDate[r.date]) { byDate[r.date] = { date: r.date, day: r.day, today: boolify_(r.today), events: [] }; order.push(r.date); }
    byDate[r.date].events.push({ time: r.time, text: r.text, cat: r.cat });
  });
  out.schedule = order.map(function (d) { return byDate[d]; });

  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- helpers ---------- */
function rows_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const head = values[0];
  return values.slice(1).filter(function (row) { return row.join('') !== ''; })
    .map(function (row) {
      const o = {};
      head.forEach(function (h, i) { o[h] = row[i]; });
      return o;
    });
}
function kv_(ss, name) {
  const sh = ss.getSheetByName(name);
  const o = {};
  if (!sh) return o;
  sh.getDataRange().getValues().slice(1).forEach(function (r) { if (r[0]) o[r[0]] = r[1]; });
  return o;
}
function numify_(keys) {
  return function (r) { keys.forEach(function (k) { r[k] = Number(r[k]); }); return r; };
}
function boolify_(v) {
  return v === true || v === 'true' || v === 'TRUE' || v === 1 || v === '1';
}
