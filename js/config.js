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
  API_URL: "https://script.google.com/macros/s/AKfycbxy7-AVZfzeE6jQpMHPyp1RvdwupBH9Kcm0OmbCVxdcVivHd2eh0D6ObsCTJST9e_mH/exec",
  WRITE_BACK: true,

  // 초기화(스케줄·식물점검) 시 요구할 비밀번호. 원하는 값으로 바꾸세요. 비우면 비밀번호 없이 진행.
  RESET_PASSWORD: "1234",

  // 크루 정보 수정·삭제 시 요구할 비밀번호. 원하는 값으로 바꾸세요. 비우면 비밀번호 없이 진행.
  CREW_PASSWORD: "1234",

  // 산업안전보건 게시판(회의 기록) 수정·삭제 시 요구할 비밀번호. 비우면 비밀번호 없이 진행.
  SAFETY_PASSWORD: "1234",

  // 식물 상태 점검 관리자 모드(점검 입력·구역 삭제) 비밀번호 4자리. 비우면 RESET_PASSWORD 사용.
  PLANT_PASSWORD: "1234",

  // 모든 데이터 수정·삭제 시 요구할 관리자 비밀번호. 비우면 RESET_PASSWORD 사용, 그것도 비우면 확인 없이 진행.
  ADMIN_PASSWORD: "1234",

  // 대시보드 입장(첫 화면) 비밀번호. 비우면 비밀번호 없이 바로 입장.
  // ⚠️ 공개 저장소라 소스에서 볼 수 있으니 강한 보안은 아님(외부인 캐주얼 차단용). 원하는 값으로 바꾸세요.
  ENTRY_PASSWORD: "garden",

  // 공지사항(대시보드 상단) 작성·수정 비밀번호 — 제이미만 아는 값으로 바꿔서 사용하세요.
  // ⚠️ 다른 비밀번호들과 반드시 다른 값으로 설정해야 "제이미만" 수정 가능이 유지됩니다.
  NOTICE_PASSWORD: "jamie",

  // 산업안전보건 · 안전매뉴얼 드라이브 폴더 바로가기 URL.
  // 비워두면 GAS(?action=safety)가 돌려주는 folderUrl 을 사용합니다. 명시하면 항상 이 값이 우선됩니다.
  SAFETY_FOLDER_URL: "",

  // 크루 교육 서명 사이트(edu-sign)의 서명 페이지 URL.
  // 크루가 이름 로그인 → 교육 선택 → 서명하는 공용 페이지입니다.
  CREW_SIGN_URL: "https://jamie4321-sudo.github.io/edu-sign/sign.html",

  /* =======================================================
     Supabase (신규 DB) — 채우면 자동으로 구글시트 대신 Supabase 를 사용합니다.
     (각층 현황·안전매뉴얼 드라이브 사진, 정산 명세서/사진 링크는 계속 구글 드라이브 그대로)
     ---------------------------------------------------------
     · Supabase 대시보드 > Project Settings > API 에서 복사:
         url     = Project URL
         anonKey = Project API keys 의 "anon public"
     · anon 키는 공개돼도 되는 키입니다(설계상 공개). 실제 보안은 DB의 RLS 정책이 담당합니다.
     · url/anonKey 를 비우면 → 즉시 위 API_URL(구글시트/GAS)로 롤백됩니다.
     · supabase/schema.sql 을 Supabase SQL Editor 에서 먼저 1회 실행해야 합니다.
     ======================================================= */
  supabase: {
    url: "",
    anonKey: "",
  },
};
