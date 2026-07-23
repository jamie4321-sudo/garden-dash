/* =========================================================
   GARDEN — config
   ---------------------------------------------------------
   Apps Script 웹 앱을 배포한 뒤, 아래 API_URL 에 배포 URL 을 붙여넣으세요.
   비워두면 js/data.js 의 목(mock) 데이터로 동작합니다.
   예) https://script.google.com/macros/s/AKfyc.../exec

   WRITE_BACK: true 면 주간 스케줄 편집 시 구글 시트에 자동 저장(쓰기)합니다.
               (API_URL 이 설정돼 있어야 동작)
   ========================================================= */
window.CONFIG = {
  API_URL: "",
  WRITE_BACK: true,
};
