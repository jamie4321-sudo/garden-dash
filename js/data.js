/* =========================================================
   GARDEN — mock data (DEMO)
   ========================================================= */
window.DATA = {
  asOf: "",

  // 구 템플릿 데모(kpi·crewMix·storeSales·weekTrend·todos) 제거 — 현재 화면 미사용
  kpi: [],
  crewMix: [],
  storeSales: [],
  weekTrend: [],
  todos: [],

  // 크루 로스터 (시트 crew 탭에서 로드 — 데모 시드 없음)
  crew: [],

  // 식물 상태 점검 — 구역(전용부/공용부/외부) × 2개월 주기 등급
  plantRounds: ["2월", "4월", "7월", "10월", "12월"],
  plantZones: [
    { area: "전용부", zones: [
      "일반오피스 14A", "일반오피스 13A", "일반오피스 12A", "일반오피스 11A", "일반오피스 10A",
      "일반오피스 9A", "일반오피스 8A", "일반오피스 7A", "일반오피스 7B", "일반오피스 6A",
      "일반오피스 6B", "일반오피스 5A", "일반오피스 5B", "일반오피스 3B", "카카오지회 3A",
      "임원실 내부 9A", "윤리경영실 4B", "책임경영 4B", "전략법무 14A",
    ] },
    { area: "공용부", zones: [
      "카페 5A", "공용로비 4층", "공용로비 3층", "춘식도락 B1",
      "인터뷰스페이스 2B", "독테라스 2A", "아지풀 2층", "공용로비 2층", "공용로비 1층",
    ] },
    { area: "외부", zones: [
      "브릿지 5층", "북아지트 외부 4층", "임원실 외부 9층", "의장실외부1 15층", "의장실외부2 15층",
    ] },
  ],
  // 등급 시드 없음 (시트 plants 탭에서 로드 — 데모 등급 제거)
  plantGrades: {},

  // 월간 스케줄 — 월~금 상시 반복 (날짜 미지정, 관리 위치 동일). 인라인 편집 가능.
  weekBoard: {
    month: "2026년 7월",
    note: "월~금 상시 스케줄 · 관리 위치 동일",
    areas: [
      { name: "전용부", color: "var(--accent)", cells: {
        mon: ["14A", "13A", "12A"], tue: ["11A", "10A", "9A"], wed: ["8A", "7A", "6A"],
        thu: ["5A", "5B", "6B", "7B", "9B"], fri: [] } },
      { name: "공용부", color: "var(--blue)", cells: {
        mon: ["3층 일부"], tue: ["3층 전체"], wed: ["2층 전체"],
        thu: ["1층 전체", "4층"], fri: ["4층", "지하1층 춘식도락"] } },
      { name: "기타", color: "var(--violet)", cells: {
        mon: [], tue: [], wed: [], thu: [], fri: [] } },
    ],
    // 변동사항(연휴·변경)만 달력에 점으로 표시. { date: "YYYY-MM-DD", label }
    exceptions: [],
  },

  // 식물 이슈 관리 — 발생 이슈 트래킹 (시트 plantIssues 탭에서 로드)
  plantIssues: [],

  // 크루 교육 관리 — 4대 법정의무교육 이수 기록 (시트 training 탭에서 로드)
  trainingRecords: [],

  // 사고 대응 이력 (시트 safetyIncidents 탭에서 로드)
  safetyIncidents: [],

  // 운영 정산 관리 — 비용 집행 내역 (시트 settlement 탭에서 로드)
  settlement: [],
};
