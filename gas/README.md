# Google Sheet + Apps Script 백엔드 연동 가이드

garden-dash를 목 데이터가 아닌 **실제 구글 시트 데이터**로 운영하기 위한 설정입니다.

## 구성

```
Google Sheet (GARDEN — Ops Data)   ← 데이터 저장소(DB)
        ↕  openById()
Apps Script (gas/Code.gs)          ← 웹 앱으로 배포 → JSON API
        ↕  fetch(API_URL)
프론트엔드 (js/config.js)           ← API_URL 설정 시 실데이터 로드
```

- **시트**: [GARDEN — Ops Data](https://docs.google.com/spreadsheets/d/1t7ivyi9udBQ7hIJQXDd1jddgFi4wcHPcmDs4ikSebaU/edit) (이미 생성됨)
- **시트 ID**: `1t7ivyi9udBQ7hIJQXDd1jddgFi4wcHPcmDs4ikSebaU` (Code.gs에 연결 완료)

## 설정 순서

### 1. Apps Script 프로젝트 만들기
1. [script.google.com](https://script.google.com) → **새 프로젝트**
2. 기본 `Code.gs` 내용을 지우고, 이 폴더의 [`Code.gs`](Code.gs) 전체를 붙여넣기
3. 저장 (💾)

### 2. 시트 초기화 (최초 1회)
1. 함수 선택 드롭다운에서 **`setup`** 선택 → **실행 ▶**
2. 최초 실행 시 **권한 승인** 팝업 → 본인 계정 선택 → "고급" → "안전하지 않음(프로젝트 이름)으로 이동" → 허용
3. 실행되면 시트에 `kpi · crewMix · storeSales · weekTrend · todos · crew · schedule · meta` 탭과 시드 데이터가 자동 생성됩니다.

> 이후에는 **구글 시트에서 직접 값을 수정**하면 대시보드에 반영됩니다.

### 3. 웹 앱으로 배포
1. 우측 상단 **배포 > 새 배포**
2. 톱니바퀴 ⚙️ → **웹 앱** 선택
3. 설정:
   - **실행 계정**: 나(본인)
   - **액세스 권한**: **모든 사용자**  ← (로그인 없이 대시보드가 읽을 수 있도록)
4. **배포** → 나오는 **웹 앱 URL** 복사
   (형식: `https://script.google.com/macros/s/AKfyc.../exec`)

### 4. 프론트에 연결
[`js/config.js`](../js/config.js) 파일의 `API_URL` 에 복사한 URL을 붙여넣고 커밋:

```js
window.CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfyc.../exec",
};
```

끝입니다. 대시보드가 로드되면 목 데이터로 먼저 그려진 뒤, 시트 데이터로 자동 교체됩니다.

## 데이터 구조 (탭별)

| 탭 | 컬럼 |
|---|---|
| `meta` | key, value (asOf 등) |
| `kpi` | label, num, unit, sub, trend(up/down/flat), variant(acid/green/warn) |
| `crewMix` | label, val, color |
| `storeSales` | label, val, pct |
| `weekTrend` | d, v |
| `todos` | time, text, done(TRUE/FALSE) |
| `crew` | name, role, store, status(active/leave/out), since, tags(쉼표구분) |
| `board` | area, color, mon, tue, wed, thu, fri, sat — 한 칸에 여러 항목은 ` / ` 로 구분 |
| `boardMeta` | key, value (month, range, today, note, mon~sat 날짜) |

## 참고

- 코드는 **읽기(doGet)** 전용입니다. 시트 편집은 구글 시트에서 직접 하세요.
- 값 수정 후 새 배포 없이 바로 반영됩니다(코드를 바꿨을 때만 재배포 필요).
- 색상 값(`var(--accent)` 등)은 대시보드 테마 변수와 연결됩니다.
