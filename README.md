# garden-dash

**SNACK & GARDEN — Operations Dashboard**

[snack-garden-ops](https://jamie4321-sudo.github.io/snack-garden-ops/) 사이트의 UI·색상을 참고해 만든 운영 대시보드입니다.

## 특징

- 🎨 **에디토리얼 UI** · 애시드 라임 액센트(`#c6ff2e`) · 모노 숫자
- 🌗 **다크/라이트 테마** 토글 (localStorage 저장)
- 📊 **대시보드** — KPI 카드, 크루 구성 도넛, 매장별 매출 바, 주간 매출 추이 스파크라인, 오늘 할 일
- 👥 **크루 로스터** — 상태 배지, 태그, 실시간 검색 필터
- 🗓 **월간 스케줄** — 동적 월간 달력 + 영역×요일(월~금 상시) 그리드, 모든 항목 **인라인 편집·삭제**, 오늘 요일 강조. 연휴·변경은 달력 날짜 클릭으로 **변동사항** 등록 → 점 표시
- 💰 **매출 리포트**
- 📱 반응형 (사이드바 · 그리드 자동 조정)

## 구조

```
index.html        # 마크업 · 사이드바 · 토пбар
css/styles.css    # 디자인 시스템 (CSS 변수 · 컴포넌트)
js/data.js        # 데모용 목(mock) 데이터
js/app.js         # 라우터 · 렌더러 · 테마
```

순수 HTML/CSS/JS(빌드 불필요) · 해시 라우팅 SPA · GitHub Pages 배포.

## 로컬 실행

```bash
npx serve .
```

> 데모 데이터는 `js/data.js`에서 수정할 수 있습니다.
