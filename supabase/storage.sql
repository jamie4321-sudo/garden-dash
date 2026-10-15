-- GARDEN DASH(아지트 가든): 교체 현황 사진 저장소 (Supabase Storage)
-- 게임즈 가든과 같은 SIGN 프로젝트, 같은 방식(gg-photos)으로 버킷만 따로 둡니다.
-- 이 파일은 틀입니다. 실제 실행본은 supabase/_local/storage.filled.sql (토큰 포함, 저장소 제외).
-- SQL Editor 에 붙여넣고 Run. 여러 번 실행해도 안전합니다.
--
-- 사진은 추측할 수 없는 이름(UUID)으로 저장 · 버킷은 공개 읽기(주소를 알아야 열림), 목록 보기 불가.
-- 올리기는 x-gd-token 이 맞을 때만 — 토큰은 Apps Script 스크립트 속성(SB_TOKEN)에만 보관.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gd-photos', 'gd-photos', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists gd_photos_insert on storage.objects;
create policy gd_photos_insert on storage.objects for insert to anon
  with check (bucket_id = 'gd-photos'
              and (coalesce(current_setting('request.headers', true)::json->>'x-gd-token', '') = '__GD_TOKEN__'));
