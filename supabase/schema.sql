-- =========================================================
--  GARDEN DASH — Supabase 스키마
--  Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 [Run] 하세요.
--  (여러 번 실행해도 안전하도록 IF NOT EXISTS / OR REPLACE 로 작성)
--
--  설계 원칙 (edu-sign 프로젝트의 supabase/schema.sql, js/store.js 패턴을 그대로 따름):
--   · 지금 앱은 화면마다 "저장" 시 그 화면의 배열 전체를 보냅니다(부분수정 아님) —
--     구글시트도 매번 탭 전체 clear() 후 다시 씀. Supabase에서도 동일하게
--     "전체 삭제 후 다시 insert" 로 옮겨서 앱 로직/위험도를 그대로 유지합니다.
--   · id 는 전부 DB가 자동 생성(identity)하는 내부용 값 — 앱은 이 id 를 몰라도 되고
--     읽어올 때도 그냥 무시합니다. (안전 서명 앱처럼 앱이 id 를 직접 다루는 구조가 아님)
--   · 사진/파일은 계속 구글 드라이브 URL 문자열만 저장 — Storage 버킷 없음.
-- =========================================================

-- 1) 크루 로스터 -------------------------------------------------
create table if not exists public.crew (
  id         bigint generated always as identity primary key,
  name       text,
  role       text,
  store      text,
  status     text,               -- active | leave | out
  since      text,
  disability text,
  tags       text[] default '{}',
  left_date  text,
  memo       text
);

-- 2) 담당자(입장 비밀번호 게이트) ---------------------------------
create table if not exists public.managers (
  id   bigint generated always as identity primary key,
  name text,
  pin  text
);

-- 3) 공지사항 ------------------------------------------------------
create table if not exists public.notices (
  id     bigint generated always as identity primary key,
  date   text,
  text   text,
  author text
);

-- 4) 산업안전보건 — 주간 정기회의 ----------------------------------
create table if not exists public.safety_meetings (
  id        bigint generated always as identity primary key,
  date      text,
  org       text,
  title     text,
  attendees text,
  link      text
);

-- 5) 산업안전보건 — 정기 안전점검 ----------------------------------
create table if not exists public.safety_checks (
  id         bigint generated always as identity primary key,
  title      text,
  date       text,
  org        text,
  result     text,
  action     text,
  sent_date  text,
  drive_url  text,
  done       boolean default false
);

-- 6) 사고 대응 이력 --------------------------------------------------
create table if not exists public.safety_incidents (
  id            bigint generated always as identity primary key,
  date          text,
  type          text,
  place         text,
  status        text,
  resolved_date text,
  content       text,
  action        text,
  memo          text
);

-- 7) 식물 이슈 관리 ----------------------------------------------
create table if not exists public.plant_issues (
  id        bigint generated always as identity primary key,
  date      text,
  building  text,
  location  text,
  category  text,
  detail    text,
  species   text,
  urgency   text,
  status    text,
  assignee  text,
  source    text,
  action    text,
  photo_url text,
  recur     boolean default false,
  done_at   text,
  memo      text
);

-- 8) 크루 교육 관리(법정의무교육) -----------------------------------
create table if not exists public.training_records (
  id       bigint generated always as identity primary key,
  name     text,
  key      text,
  year     text,
  date     text,
  method   text,
  cert_url text,
  memo     text
);

-- 9) 운영 정산 관리 -------------------------------------------------
create table if not exists public.settlement (
  id            bigint generated always as identity primary key,
  date          text,
  place         text,
  category      text,
  title         text,
  vendor        text,
  amount        numeric default 0,
  status        text,
  paid_date     text,
  statement_url text,             -- 명세서(드라이브 파일) 링크
  photo_url     text,             -- 작업 결과 사진(드라이브) 링크
  memo          text
);

-- 10) 식물 상태 점검 (zone × round) --------------------------------
--     예전 시트는 round='__removed__'/'__added__' sentinel row 로 구역 삭제/추가를
--     표현했음 — 여기서는 정식 상태 테이블로 분리.
create table if not exists public.plant_checks (
  id     bigint generated always as identity primary key,
  zone   text,
  round  text,
  grade  text,
  issue  text
);
create index if not exists plant_checks_zone_idx on public.plant_checks(zone);

create table if not exists public.plant_zone_status (
  id      bigint generated always as identity primary key,
  zone    text,
  removed boolean default false,  -- 관리자가 삭제한 구역
  area    text                    -- 추가된 구역이면 소속 구역(전용부/공용부/외부)
);

-- 11) 주간 스케줄 보드 ------------------------------------------
create table if not exists public.schedule_board (
  id    bigint generated always as identity primary key,
  area  text,
  color text,
  mon   text,                     -- '/' 로 join 된 작업 목록 문자열 (프론트 파싱 유지)
  tue   text,
  wed   text,
  thu   text,
  fri   text
);

create table if not exists public.schedule_meta (
  id    bigint generated always as identity primary key,
  month text,
  note  text
);

create table if not exists public.schedule_exceptions (
  id    bigint generated always as identity primary key,
  date  text,
  label text
);

-- 12) 월간리포트 (카카오–링키지랩 월간 리뷰) -----------------------
create table if not exists public.monthly_reports (
  id           bigint generated always as identity primary key,
  month        text,
  meeting_date text,
  attendees    text,
  issues       text
);

create table if not exists public.monthly_report_comments (
  id        bigint generated always as identity primary key,
  report_id bigint references public.monthly_reports(id) on delete cascade,
  author    text,
  text      text,
  at        text,
  hearts    text[] default '{}'
);
create index if not exists mr_comments_report_idx on public.monthly_report_comments(report_id);

create table if not exists public.monthly_report_minutes (
  id        bigint generated always as identity primary key,
  report_id bigint references public.monthly_reports(id) on delete cascade,
  title     text,
  at        text,
  raw       text,
  summary   jsonb default '[]',
  decisions jsonb default '[]',
  actions   jsonb default '[]'
);
create index if not exists mr_minutes_report_idx on public.monthly_report_minutes(report_id);

-- =========================================================
--  RLS (행 수준 보안)
--  edu-sign 과 동일한 운영 모델: "URL/anon key 를 아는 사람은 읽기/쓰기 가능" 수준.
--  화면별 비밀번호 확인은 지금처럼 클라이언트에서 계속 처리(js/config.js).
--  ※ 더 강한 보안이 필요해지면 이 정책만 조여서 단계적으로 강화할 수 있습니다.
-- =========================================================
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'crew','managers','notices','safety_meetings','safety_checks','safety_incidents',
      'plant_issues','training_records','settlement','plant_checks','plant_zone_status',
      'schedule_board','schedule_meta','schedule_exceptions',
      'monthly_reports','monthly_report_comments','monthly_report_minutes'
    ])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "anon all %1$s" on public.%1$s', t);
    execute format('create policy "anon all %1$s" on public.%1$s for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
