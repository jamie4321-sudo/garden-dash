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
    { name: "김서연", role: "매니저",   store: "성수 본점", status: "active", since: "2023-04", disability: "비장애",     tags: ["바리스타","교육"] },
    { name: "이준호", role: "정규직",   store: "성수 본점", status: "active", since: "2024-01", disability: "발달장애",   tags: ["베이킹"] },
    { name: "박지민", role: "파트타임", store: "연남점",   status: "active", since: "2025-03", disability: "발달장애",   tags: ["홀"] },
    { name: "최유나", role: "정규직",   store: "판교점",   status: "leave",  since: "2023-09", disability: "지적장애",   tags: ["바리스타"] },
    { name: "정민석", role: "매니저",   store: "여의도점", status: "active", since: "2022-11", disability: "비장애",     tags: ["바리스타","발주"] },
    { name: "한소희", role: "파트타임", store: "연남점",   status: "active", since: "2025-06", disability: "발달장애",   tags: ["홀","신규"] },
    { name: "오세훈", role: "정규직",   store: "판교점",   status: "out",    since: "2024-05", disability: "청각장애",   tags: ["베이킹"] },
    { name: "윤아름", role: "파트타임", store: "성수 본점", status: "active", since: "2025-01", disability: "지체장애",   tags: ["홀"] },
  ],

  // 미니 달력 (월~토 · 2026년 7월)
  cal: {
    title: "2026년 7월",
    weeks: [
      [{ d: 29, out: 1 }, { d: 30, out: 1 }, { d: 1 }, { d: 2 }, { d: 3 }, { d: 4 }],
      [{ d: 6 }, { d: 7 }, { d: 8 }, { d: 9 }, { d: 10 }, { d: 11 }],
      [{ d: 13 }, { d: 14 }, { d: 15 }, { d: 16 }, { d: 17 }, { d: 18 }],
      [{ d: 20, act: 1 }, { d: 21, act: 1 }, { d: 22, act: 1 }, { d: 23, act: 1, today: 1 }, { d: 24, act: 1 }, { d: 25, act: 1 }],
      [{ d: 27 }, { d: 28 }, { d: 29 }, { d: 30 }, { d: 31 }, { d: 1, out: 1 }],
    ],
  },

  // 영역별 주간 작업 스케줄 (인라인 편집 가능)
  weekBoard: {
    month: "2026년 7월",
    range: "7/20(월) – 7/25(토)",
    days: [
      { key: "mon", label: "월", date: "7/20" },
      { key: "tue", label: "화", date: "7/21" },
      { key: "wed", label: "수", date: "7/22" },
      { key: "thu", label: "목", date: "7/23", today: true },
      { key: "fri", label: "금", date: "7/24" },
      { key: "sat", label: "토", date: "7/25" },
    ],
    areas: [
      { name: "전용부", color: "var(--accent)", cells: {
        mon: ["14A", "13A", "12A"], tue: ["11A", "10A", "9A"], wed: ["8A", "7A", "6A"],
        thu: ["5A", "5B", "6B", "7B", "9B"], fri: [], sat: [] } },
      { name: "공용부", color: "var(--blue)", cells: {
        mon: ["3층 일부"], tue: ["3층 전체"], wed: ["2층 전체"],
        thu: ["1층 전체", "4층"], fri: ["4층", "지하1층 춘식도락"], sat: [] } },
      { name: "기타", color: "var(--violet)", cells: {
        mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] } },
    ],
    note: "단기 인원 영업 진행 중",
  },
};
