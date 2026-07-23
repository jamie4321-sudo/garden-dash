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

  // 영역별 주간 스케줄 — 영역 × 요일 (한 칸에 여러 항목은 " / " 로 구분)
  board: [
    ['area', 'color', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    ['전용부', 'var(--accent)', '14A / 13A / 12A', '11A / 10A / 9A', '8A / 7A / 6A', '5A / 5B / 6B / 7B / 9B', '', ''],
    ['공용부', 'var(--blue)', '3층 일부', '3층 전체', '2층 전체', '1층 전체 / 4층', '4층 / 지하1층 춘식도락', ''],
    ['기타', 'var(--violet)', '', '', '', '', '', ''],
  ],

  // 주간 보드 메타 (요일 날짜 · 특이사항 등)
  boardMeta: [
    ['key', 'value'],
    ['month', '2026년 7월'],
    ['range', '7/20(월) – 7/25(토)'],
    ['today', 'thu'],
    ['note', '단기 인원 영업 진행 중'],
    ['mon', '7/20'], ['tue', '7/21'], ['wed', '7/22'],
    ['thu', '7/23'], ['fri', '7/24'], ['sat', '7/25'],
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
    // 모든 값을 텍스트로 유지 (시트가 "09:00" · "7/20" · "2023-04" 등을 날짜로 자동 변환하지 않도록)
    sh.getRange(1, 1, sh.getMaxRows(), rows[0].length).setNumberFormat('@');
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

  // weekBoard: 영역 × 요일 보드
  const meta = kv_(ss, 'boardMeta');
  const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const DAY_LABELS = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토' };
  const days = DAY_KEYS.map(function (k) {
    var o = { key: k, label: DAY_LABELS[k], date: meta[k] || '' };
    if (meta.today === k) o.today = true;
    return o;
  });
  const areas = rows_(ss, 'board').map(function (r) {
    var cells = {};
    DAY_KEYS.forEach(function (k) {
      cells[k] = String(r[k] || '').split('/').map(function (s) { return s.trim(); }).filter(Boolean);
    });
    return { name: r.area, color: r.color || 'var(--accent)', cells: cells };
  });
  out.weekBoard = {
    month: meta.month || '',
    range: meta.range || '',
    note: meta.note || '',
    days: days,
    areas: areas,
  };

  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 웹 앱 POST — 화면 편집 내용을 시트에 저장(쓰기)
 * body(JSON): { type: 'weekBoard', data: {...weekBoard...} }
 * (GitHub Pages 등 브라우저에서 no-cors 로 호출 → text/plain 본문)
 */
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.type === 'weekBoard' && body.data) {
      saveWeekBoard_(body.data);
      return json_({ ok: true, saved: 'weekBoard' });
    }
    return json_({ ok: false, error: 'unknown type' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** weekBoard 객체를 board / boardMeta 탭에 기록 */
function saveWeekBoard_(wb) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    // --- board 탭 ---
    var bSheet = ss.getSheetByName('board') || ss.insertSheet('board');
    bSheet.clear();
    var head = ['area', 'color'].concat(DAY_KEYS);
    var rows = [head];
    (wb.areas || []).forEach(function (a) {
      var row = [a.name || '', a.color || 'var(--accent)'];
      DAY_KEYS.forEach(function (k) {
        var items = (a.cells && a.cells[k]) || [];
        row.push(items.join(' / '));
      });
      rows.push(row);
    });
    bSheet.getRange(1, 1, bSheet.getMaxRows(), head.length).setNumberFormat('@');
    bSheet.getRange(1, 1, rows.length, head.length).setValues(rows);
    bSheet.setFrozenRows(1);
    bSheet.getRange(1, 1, 1, head.length).setFontWeight('bold');

    // --- boardMeta 탭 ---
    var mSheet = ss.getSheetByName('boardMeta') || ss.insertSheet('boardMeta');
    mSheet.clear();
    var today = '';
    (wb.days || []).forEach(function (d) { if (d.today) today = d.key; });
    var meta = [
      ['key', 'value'],
      ['month', wb.month || ''],
      ['range', wb.range || ''],
      ['today', today],
      ['note', wb.note || ''],
    ];
    (wb.days || []).forEach(function (d) { meta.push([d.key, d.date || '']); });
    mSheet.getRange(1, 1, mSheet.getMaxRows(), 2).setNumberFormat('@');
    mSheet.getRange(1, 1, meta.length, 2).setValues(meta);
    mSheet.setFrozenRows(1);
    mSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
  } finally {
    lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
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
