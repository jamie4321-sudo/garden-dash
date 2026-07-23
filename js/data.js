/* =========================================================
   GARDEN — mock data (DEMO)
   ========================================================= */
window.DATA = {
  asOf: "2026-07-23",

  kpi: [
    { label: "이번 달 매출", num: "48.2", unit: "M", sub: "+12.4% vs 6월", trend: "up",   variant: "acid" },
    { label: "재직 크루",    num: "27",   unit: "명", sub: "휴직 2 · 신규 3",  trend: "flat", variant: "" },
    { label: "오늘 출근",    num: "19",   unit: "명", sub: "결원 1 · 지각 0",  trend: "flat", variant: "green" },
    { label: "미처리 이슈",  num: "4",    unit: "건", sub: "+2 어제 대비",    trend: "down", variant: "warn" },
  ],

  // 크루 구성 (도넛)
  crewMix: [
    { label: "정규직",   val: 14, color: "var(--accent)" },
    { label: "파트타임", val: 9,  color: "var(--blue)" },
    { label: "매니저",   val: 4,  color: "var(--violet)" },
  ],

  // 매장별 매출 (바)
  storeSales: [
    { label: "성수 본점",   val: 18.4, pct: 100 },
    { label: "연남점",     val: 12.1, pct: 66 },
    { label: "판교점",     val: 9.7,  pct: 53 },
    { label: "여의도점",   val: 8.0,  pct: 43 },
  ],

  // 주간 매출 추이 (스파크라인, 백만원)
  weekTrend: [
    { d: "월", v: 5.8 }, { d: "화", v: 6.4 }, { d: "수", v: 6.1 },
    { d: "목", v: 7.2 }, { d: "금", v: 8.9 }, { d: "토", v: 9.6 }, { d: "일", v: 4.2 },
  ],

  // 오늘 할 일
  todos: [
    { time: "09:00", text: "성수점 오픈 점검 · 재고 확인", done: true },
    { time: "11:30", text: "신규 크루 2인 온보딩 미팅", done: true },
    { time: "14:00", text: "7월 정산 마감 자료 정리", done: false },
    { time: "16:00", text: "연남점 발주 승인", done: false },
    { time: "18:30", text: "주간 매출 리포트 발송", done: false },
  ],

  // 크루 로스터
  crew: [
    { name: "김서연", role: "매니저",   store: "성수 본점", status: "active", since: "2023-04", tags: ["바리스타","교육"] },
    { name: "이준호", role: "정규직",   store: "성수 본점", status: "active", since: "2024-01", tags: ["베이킹"] },
    { name: "박지민", role: "파트타임", store: "연남점",   status: "active", since: "2025-03", tags: ["홀"] },
    { name: "최유나", role: "정규직",   store: "판교점",   status: "leave",  since: "2023-09", tags: ["바리스타"] },
    { name: "정민석", role: "매니저",   store: "여의도점", status: "active", since: "2022-11", tags: ["바리스타","발주"] },
    { name: "한소희", role: "파트타임", store: "연남점",   status: "active", since: "2025-06", tags: ["홀","신규"] },
    { name: "오세훈", role: "정규직",   store: "판교점",   status: "out",    since: "2024-05", tags: ["베이킹"] },
    { name: "윤아름", role: "파트타임", store: "성수 본점", status: "active", since: "2025-01", tags: ["홀"] },
  ],

  // 주간 스케줄 (월~금)
  schedule: [
    { date: "07/20", day: "월", today: false, events: [
      { time: "09:00", text: "성수 오픈", cat: "var(--accent)" },
      { time: "13:00", text: "발주 마감", cat: "var(--blue)" },
    ]},
    { date: "07/21", day: "화", today: false, events: [
      { time: "10:00", text: "크루 교육", cat: "var(--violet)" },
    ]},
    { date: "07/22", day: "수", today: false, events: [
      { time: "11:00", text: "연남 점검", cat: "var(--accent)" },
      { time: "15:00", text: "재고 실사", cat: "var(--amber)" },
    ]},
    { date: "07/23", day: "목", today: true, events: [
      { time: "11:30", text: "온보딩 미팅", cat: "var(--violet)" },
      { time: "14:00", text: "정산 마감", cat: "var(--red)" },
      { time: "18:30", text: "리포트 발송", cat: "var(--accent)" },
    ]},
    { date: "07/24", day: "금", today: false, events: [
      { time: "10:00", text: "판교 오픈", cat: "var(--accent)" },
      { time: "16:00", text: "주간 회의", cat: "var(--blue)" },
    ]},
  ],
};
