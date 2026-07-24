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

// GARDEN 각층 현황 드라이브 폴더 ID (층별 하위폴더 자동 인식)
const FLOOR_FOLDER_ID = '1JF5VTpU-ldB2jbIZlQUBlPXYof56Bp1s';

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
    ['name', 'role', 'store', 'status', 'since', 'disability', 'tags'],
    ['김서연', '매니저', '성수 본점', 'active', '2023-04', '비장애', '바리스타,교육'],
    ['이준호', '정규직', '성수 본점', 'active', '2024-01', '발달장애', '베이킹'],
    ['박지민', '파트타임', '연남점', 'active', '2025-03', '발달장애', '홀'],
    ['최유나', '정규직', '판교점', 'leave', '2023-09', '지적장애', '바리스타'],
    ['정민석', '매니저', '여의도점', 'active', '2022-11', '비장애', '바리스타,발주'],
    ['한소희', '파트타임', '연남점', 'active', '2025-06', '발달장애', '홀,신규'],
    ['오세훈', '정규직', '판교점', 'out', '2024-05', '청각장애', '베이킹'],
    ['윤아름', '파트타임', '성수 본점', 'active', '2025-01', '지체장애', '홀'],
  ],

  // 월간 스케줄 — 영역 × 요일(월~금 상시). 한 칸에 여러 항목은 " / " 로 구분
  board: [
    ['area', 'color', 'mon', 'tue', 'wed', 'thu', 'fri'],
    ['전용부', 'var(--accent)', '14A / 13A / 12A', '11A / 10A / 9A', '8A / 7A / 6A', '5A / 5B / 6B / 7B / 9B', ''],
    ['공용부', 'var(--blue)', '3층 일부', '3층 전체', '2층 전체', '1층 전체 / 4층', '4층 / 지하1층 춘식도락'],
  ],

  // 보드 메타 (월 · 특이사항 · 변동사항 ex:YYYY-MM-DD)
  boardMeta: [
    ['key', 'value'],
    ['month', '2026년 7월'],
    ['note', '월~금 상시 스케줄 · 관리 위치 동일'],
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
  // 각층 현황(드라이브 사진) 전용 응답
  if (e && e.parameter && e.parameter.action === 'floors') {
    return json_({ floors: listFloors_() });
  }

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
    // 시트 셀이 자동으로 날짜 형식으로 바뀌어도(직접 입력 시 흔함) 문자열로 정규화
    r.since = dateStr_(r.since);
    r.left = dateStr_(r.left);
    return r;
  });

  // weekBoard: 영역 × 요일 보드 (월~금 상시)
  const meta = kv_(ss, 'boardMeta');
  const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const DAY_LABELS = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금' };
  const days = DAY_KEYS.map(function (k) {
    return { key: k, label: DAY_LABELS[k] };
  });
  const areas = rows_(ss, 'board').map(function (r) {
    var cells = {};
    DAY_KEYS.forEach(function (k) {
      cells[k] = String(r[k] || '').split('/').map(function (s) { return s.trim(); }).filter(Boolean);
    });
    return { name: r.area, color: r.color || 'var(--accent)', cells: cells };
  });
  // 변동사항: boardMeta 의 'ex:YYYY-MM-DD' 키에서 복원
  var exceptions = [];
  Object.keys(meta).forEach(function (k) {
    if (k.indexOf('ex:') === 0) exceptions.push({ date: k.slice(3), label: meta[k] });
  });
  exceptions.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  out.weekBoard = {
    month: meta.month || '',
    note: meta.note || '',
    days: days,
    areas: areas,
    exceptions: exceptions,
  };

  // 식물 상태 점검
  out.plants = readPlants_(ss);

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
    if (body.type === 'plants' && body.data) {
      savePlants_(body.data);
      return json_({ ok: true, saved: 'plants' });
    }
    if (body.type === 'crew' && body.data) {
      saveCrewTab_(body.data);
      return json_({ ok: true, saved: 'crew' });
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
    var DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

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
    var meta = [
      ['key', 'value'],
      ['month', wb.month || ''],
      ['note', wb.note || ''],
    ];
    (wb.exceptions || []).forEach(function (e) { meta.push(['ex:' + e.date, e.label || '']); });
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

/** 크루 쓰기 — 크루 배열 → crew 탭 (입사/상태/장애/태그/퇴사일/비고) */
function saveCrewTab_(arr) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName('crew') || ss.insertSheet('crew');
    sh.clear();
    var head = ['name', 'role', 'store', 'status', 'since', 'disability', 'tags', 'left', 'memo'];
    var rows = [head];
    (arr || []).forEach(function (c) {
      var tags = Array.isArray(c.tags) ? c.tags.join(',') : (c.tags || '');
      rows.push([c.name || '', c.role || '', c.store || '', c.status || 'active',
        c.since || '', c.disability || '', tags, c.left || '', c.memo || '']);
    });
    sh.getRange(1, 1, sh.getMaxRows(), head.length).setNumberFormat('@');
    sh.getRange(1, 1, rows.length, head.length).setValues(rows);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
  } finally {
    lock.releaseLock();
  }
}

/** 드라이브 권한 승인 + 폴더 확인용 (편집기에서 한 번 실행) */
function authorizeDrive() {
  var f = DriveApp.getFolderById(FLOOR_FOLDER_ID);
  var subs = f.getFolders();
  var names = [];
  while (subs.hasNext()) names.push(subs.next().getName());
  Logger.log('OK: "' + f.getName() + '" 하위폴더 ' + names.length + '개 → ' + names.join(', '));
  return names;
}

/** 각층 현황 — 드라이브 부모 폴더의 하위폴더(층)별 사진 목록 */
function listFloors_() {
  var out = [];
  try {
    var parent = DriveApp.getFolderById(FLOOR_FOLDER_ID);
    var it = parent.getFolders();
    var folders = [];
    while (it.hasNext()) folders.push(it.next());
    folders.sort(function (a, b) { return floorKey_(a.getName()) - floorKey_(b.getName()); });
    folders.forEach(function (f) {
      var photos = [];
      var files = f.getFiles();
      while (files.hasNext()) {
        var file = files.next();
        var mt = file.getMimeType() || '';
        if (mt.indexOf('image/') === 0) {
          var id = file.getId();
          photos.push({
            id: id,
            name: file.getName(),
            thumb: 'https://drive.google.com/thumbnail?id=' + id + '&sz=w800',
            view: 'https://drive.google.com/file/d/' + id + '/view',
            updated: Utilities.formatDate(file.getLastUpdated(), Session.getScriptTimeZone(), 'yyyy-MM-dd')
          });
        }
      }
      photos.sort(function (a, b) { return a.updated < b.updated ? 1 : -1; });
      out.push({ name: f.getName(), folderUrl: f.getUrl(), count: photos.length, photos: photos });
    });
  } catch (err) {
    return [];
  }
  return out;
}
function floorKey_(name) {
  if (/^b/i.test(name)) return -1;          // B1 등 지하
  var m = String(name).match(/\d+/);
  return m ? parseInt(m[0], 10) : 999;
}

/** 식물 점검 읽기 — plants 탭(zone/round/grade/issue) → {grades, issues} */
function readPlants_(ss) {
  var grades = {}, issues = {};
  var sh = ss.getSheetByName('plants');
  if (!sh) return { grades: grades, issues: issues };
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    var z = vals[i][0], r = vals[i][1], g = vals[i][2], iss = vals[i][3];
    if (!z || !r) continue;
    z = String(z); r = String(r);
    if (g !== '' && g != null) { grades[z] = grades[z] || {}; grades[z][r] = String(g); }
    if (iss !== '' && iss != null) { issues[z] = issues[z] || {}; issues[z][r] = String(iss); }
  }
  return { grades: grades, issues: issues };
}

/** 식물 점검 쓰기 — {grades, issues} → plants 탭 */
function savePlants_(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName('plants') || ss.insertSheet('plants');
    sh.clear();
    var grades = p.grades || {}, issues = p.issues || {};
    var map = {};
    Object.keys(grades).forEach(function (z) {
      Object.keys(grades[z]).forEach(function (r) {
        var k = z + '' + r; map[k] = map[k] || { z: z, r: r }; map[k].g = grades[z][r];
      });
    });
    Object.keys(issues).forEach(function (z) {
      Object.keys(issues[z]).forEach(function (r) {
        var k = z + '' + r; map[k] = map[k] || { z: z, r: r }; map[k].i = issues[z][r];
      });
    });
    var rows = [['zone', 'round', 'grade', 'issue']];
    Object.keys(map).forEach(function (k) { var e = map[k]; rows.push([e.z, e.r, e.g || '', e.i || '']); });
    sh.getRange(1, 1, sh.getMaxRows(), 4).setNumberFormat('@');
    sh.getRange(1, 1, rows.length, 4).setValues(rows);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 4).setFontWeight('bold');
  } finally {
    lock.releaseLock();
  }
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
function dateStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return v == null ? '' : String(v);
}
