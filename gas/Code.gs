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

// GARDEN 안전매뉴얼 드라이브 폴더 ID (직접 생성한 폴더 — 읽기만 하므로 별도 권한 승인 불필요)
const SAFETY_MANUAL_FOLDER_ID = '1PanMWvGIrZccCtg4f9PqhtHZSfz4FWfm';

/* ---------- 탭 헤더 정의 (데모 데이터 없음 — 헤더만) ---------- */
const SEED = {
  meta:      [['key', 'value']],
  crew:      [['name', 'role', 'store', 'status', 'since', 'disability', 'tags', 'left', 'memo']],
  board:     [['area', 'color', 'mon', 'tue', 'wed', 'thu', 'fri']],
  boardMeta: [['key', 'value']],
};

/**
 * 누락된 탭만 헤더로 생성 (기존 데이터는 절대 건드리지 않음 — 안전).
 * plants·training·settlement·safetyIncidents·plantIssues·safety·safetyChecks 등
 * 나머지 탭은 각 화면에서 첫 저장 시 자동 생성됩니다.
 */
function setup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  Object.keys(SEED).forEach(function (name) {
    if (ss.getSheetByName(name)) return; // 이미 있으면 보존
    var sh = ss.insertSheet(name);
    var rows = SEED[name];
    sh.getRange(1, 1, sh.getMaxRows(), rows[0].length).setNumberFormat('@');
    sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold');
  });
  const def = ss.getSheetByName('Sheet1') || ss.getSheetByName('시트1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  return 'setup done (created missing only): ' + Object.keys(SEED).join(', ');
}

/** 웹 앱 GET — 전체 데이터를 JSON 으로 반환 */
function doGet(e) {
  // 각층 현황(드라이브 사진) 전용 응답
  if (e && e.parameter && e.parameter.action === 'floors') {
    var fCache = CacheService.getScriptCache();
    var fKey = 'floors_v1';
    // 수동 새로고침(refresh=1)이 아니면 캐시 우선 반환 → 드라이브 재탐색 생략(빠름)
    if (!(e.parameter.refresh === '1')) {
      var hit = fCache.get(fKey);
      if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
    }
    var fPayload = JSON.stringify({ floors: listFloors_() });
    // CacheService 값 상한 100KB — 초과 시 캐시 생략(오류 없이)
    try { if (fPayload.length < 95000) fCache.put(fKey, fPayload, 21600); } catch (err) {}
    return ContentService.createTextOutput(fPayload).setMimeType(ContentService.MimeType.JSON);
  }
  // 산업안전보건(안전매뉴얼, 드라이브) 전용 응답
  if (e && e.parameter && e.parameter.action === 'safety') {
    const folder = DriveApp.getFolderById(SAFETY_MANUAL_FOLDER_ID);
    return json_({ manual: listFilesIn_(folder), folderUrl: folder.getUrl() });
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

  // 산업안전보건 — 주간 정기회의
  out.safetyMeetings = rows_(ss, 'safety').map(function (r) {
    r.date = dateStr_(r.date);
    return r;
  });
  // 산업안전보건 — 정기 안전점검
  out.safetyChecks = rows_(ss, 'safetyChecks').map(function (r) {
    r.date = dateStr_(r.date);
    r.sentDate = dateStr_(r.sentDate);
    r.done = boolify_(r.done);
    return r;
  });

  // 식물 이슈 관리 — 이슈 이력
  out.plantIssues = rows_(ss, 'plantIssues').map(function (r) {
    r.date = dateStr_(r.date);
    r.doneAt = dateStr_(r.doneAt);
    r.recur = boolify_(r.recur);
    return r;
  });

  // 크루 교육 관리 — 4대 법정의무교육 이수 기록
  out.trainingRecords = rows_(ss, 'training').map(function (r) {
    r.year = String(r.year || '');
    r.date = dateStr_(r.date);
    return r;
  });

  // 사고 대응 이력
  out.safetyIncidents = rows_(ss, 'safetyIncidents').map(function (r) {
    r.date = dateStr_(r.date);
    r.resolvedDate = dateStr_(r.resolvedDate);
    return r;
  });

  // 운영 정산 관리 — 비용 집행 내역
  out.settlement = rows_(ss, 'settlement').map(function (r) {
    r.date = dateStr_(r.date);
    r.paidDate = dateStr_(r.paidDate);
    r.amount = Number(r.amount) || 0;
    return r;
  });

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
    if (body.type === 'safetyMeetings' && body.data) {
      saveSafetyMeetings_(body.data);
      return json_({ ok: true, saved: 'safetyMeetings' });
    }
    if (body.type === 'safetyChecks' && body.data) {
      saveSafetyChecks_(body.data);
      return json_({ ok: true, saved: 'safetyChecks' });
    }
    if (body.type === 'plantIssues' && body.data) {
      savePlantIssues_(body.data);
      return json_({ ok: true, saved: 'plantIssues' });
    }
    if (body.type === 'trainingRecords' && body.data) {
      saveTraining_(body.data);
      return json_({ ok: true, saved: 'trainingRecords' });
    }
    if (body.type === 'safetyIncidents' && body.data) {
      saveSafetyIncidents_(body.data);
      return json_({ ok: true, saved: 'safetyIncidents' });
    }
    if (body.type === 'settlement' && body.data) {
      saveSettlement_(body.data);
      return json_({ ok: true, saved: 'settlement' });
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

/** 산업안전보건 — 주간 정기회의 쓰기 */
function saveSafetyMeetings_(arr) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName('safety') || ss.insertSheet('safety');
    sh.clear();
    var head = ['date', 'org', 'title', 'attendees', 'link'];
    var rows = [head];
    (arr || []).forEach(function (m) {
      rows.push([m.date || '', m.org || '', m.title || '', m.attendees || '', m.link || '']);
    });
    sh.getRange(1, 1, sh.getMaxRows(), head.length).setNumberFormat('@');
    sh.getRange(1, 1, rows.length, head.length).setValues(rows);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
  } finally {
    lock.releaseLock();
  }
}

/** 산업안전보건 — 정기 안전점검 쓰기 */
function saveSafetyChecks_(arr) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName('safetyChecks') || ss.insertSheet('safetyChecks');
    sh.clear();
    var head = ['title', 'date', 'org', 'result', 'action', 'sentDate', 'driveUrl', 'done'];
    var rows = [head];
    (arr || []).forEach(function (c) {
      rows.push([c.title || '', c.date || '', c.org || '', c.result || '', c.action || '',
        c.sentDate || '', c.driveUrl || '', c.done ? 'TRUE' : 'FALSE']);
    });
    sh.getRange(1, 1, sh.getMaxRows(), head.length).setNumberFormat('@');
    sh.getRange(1, 1, rows.length, head.length).setValues(rows);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
  } finally {
    lock.releaseLock();
  }
}

/** 식물 이슈 관리 쓰기 — 이슈 배열 → plantIssues 탭 (전체 이력 누적) */
function savePlantIssues_(arr) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName('plantIssues') || ss.insertSheet('plantIssues');
    sh.clear();
    var head = ['date', 'building', 'location', 'category', 'detail', 'species',
      'urgency', 'status', 'assignee', 'action', 'photoUrl', 'recur', 'doneAt', 'memo'];
    var rows = [head];
    (arr || []).forEach(function (x) {
      rows.push([x.date || '', x.building || '', x.location || '', x.category || '',
        x.detail || '', x.species || '', x.urgency || '', x.status || '', x.assignee || '',
        x.action || '', x.photoUrl || '', x.recur ? 'TRUE' : 'FALSE', x.doneAt || '', x.memo || '']);
    });
    sh.getRange(1, 1, sh.getMaxRows(), head.length).setNumberFormat('@');
    sh.getRange(1, 1, rows.length, head.length).setValues(rows);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
  } finally {
    lock.releaseLock();
  }
}

/** 운영 정산 관리 쓰기 — 비용 배열 → settlement 탭 */
function saveSettlement_(arr) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName('settlement') || ss.insertSheet('settlement');
    sh.clear();
    var head = ['date', 'category', 'title', 'vendor', 'amount', 'status', 'paidDate', 'statementUrl', 'memo'];
    var rows = [head];
    (arr || []).forEach(function (x) {
      rows.push([x.date || '', x.category || '', x.title || '', x.vendor || '',
        (x.amount == null ? '' : x.amount), x.status || '', x.paidDate || '', x.statementUrl || '', x.memo || '']);
    });
    sh.getRange(1, 1, sh.getMaxRows(), head.length).setNumberFormat('@');
    sh.getRange(1, 1, rows.length, head.length).setValues(rows);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
  } finally {
    lock.releaseLock();
  }
}

/** 사고 대응 이력 쓰기 — 사고 배열 → safetyIncidents 탭 (전체 이력 누적) */
function saveSafetyIncidents_(arr) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName('safetyIncidents') || ss.insertSheet('safetyIncidents');
    sh.clear();
    var head = ['date', 'type', 'place', 'status', 'resolvedDate', 'content', 'action', 'memo'];
    var rows = [head];
    (arr || []).forEach(function (x) {
      rows.push([x.date || '', x.type || '', x.place || '', x.status || '',
        x.resolvedDate || '', x.content || '', x.action || '', x.memo || '']);
    });
    sh.getRange(1, 1, sh.getMaxRows(), head.length).setNumberFormat('@');
    sh.getRange(1, 1, rows.length, head.length).setValues(rows);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
  } finally {
    lock.releaseLock();
  }
}

/** 크루 교육 관리 쓰기 — 이수 기록 배열 → training 탭 */
function saveTraining_(arr) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName('training') || ss.insertSheet('training');
    sh.clear();
    var head = ['name', 'key', 'year', 'date', 'method', 'certUrl', 'memo'];
    var rows = [head];
    (arr || []).forEach(function (x) {
      rows.push([x.name || '', x.key || '', x.year || '', x.date || '',
        x.method || '', x.certUrl || '', x.memo || '']);
    });
    sh.getRange(1, 1, sh.getMaxRows(), head.length).setNumberFormat('@');
    sh.getRange(1, 1, rows.length, head.length).setValues(rows);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
  } finally {
    lock.releaseLock();
  }
}

/** 폴더 내 파일 목록(최신순) — 안전매뉴얼 등 문서용 */
function listFilesIn_(folder) {
  var out = [];
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    var id = f.getId();
    out.push({
      id: id,
      name: f.getName(),
      mimeType: f.getMimeType(),
      view: 'https://drive.google.com/file/d/' + id + '/view',
      download: 'https://drive.google.com/uc?export=download&id=' + id,
      updated: Utilities.formatDate(f.getLastUpdated(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    });
  }
  out.sort(function (a, b) { return a.updated < b.updated ? 1 : -1; });
  return out;
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
  var grades = {}, issues = {}, removed = [], added = [];
  var sh = ss.getSheetByName('plants');
  if (!sh) return { grades: grades, issues: issues, removed: removed, added: added };
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    var z = vals[i][0], r = vals[i][1], g = vals[i][2], iss = vals[i][3];
    if (!z || !r) continue;
    z = String(z); r = String(r);
    if (r === '__removed__') { if (removed.indexOf(z) < 0) removed.push(z); continue; }
    if (r === '__added__') { added.push({ zone: z, area: String(g == null ? '' : g) }); continue; }
    if (g !== '' && g != null) { grades[z] = grades[z] || {}; grades[z][r] = String(g); }
    if (iss !== '' && iss != null) { issues[z] = issues[z] || {}; issues[z][r] = String(iss); }
  }
  return { grades: grades, issues: issues, removed: removed, added: added };
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
    (p.removed || []).forEach(function (z) { rows.push([z, '__removed__', '', '']); });
    (p.added || []).forEach(function (a) { if (a && a.zone) rows.push([a.zone, '__added__', a.area || '', '']); });
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
