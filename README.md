# THE BOM LEARNING LAB — 클라우드 연결 버전

## 현재 상태
- Supabase 프로젝트 `thebom-learning-lab`의 공개 Project URL 및 publishable key가 `config.js`에 연결되어 있습니다.
- 데이터베이스 테이블 6개와 RLS 활성화를 확인했습니다.
- 익명 사용자의 `public.is_admin()` 함수 실행 권한을 회수했습니다.
- 실제 관리자/학생 Auth 계정은 아직 없습니다. 로그인하려면 먼저 원장님 계정을 생성하고 관리자 권한을 설정해야 합니다.

## 다음 작업: 관리자 계정 만들기
1. Supabase 대시보드 > Authentication > Users > Add user > Create new user에서 본인이 사용할 이메일과 안전한 비밀번호로 계정을 만듭니다. 비밀번호는 ChatGPT에 보내지 마세요.
2. 이 계정의 User UID를 확인합니다.
3. SQL Editor에서 다음 SQL을 실행합니다. UID와 이름을 실제 값으로 변경하세요.

```sql
insert into public.profiles (id, display_name, role)
values ('여기에-원장님-USER-UID', '원장님', 'admin')
on conflict (id) do update set display_name = excluded.display_name, role = excluded.role;
```

4. 앱을 HTTPS 사이트로 배포하고 해당 주소에서 로그인합니다. (파일을 직접 열면 인증 흐름이 환경에 따라 동작하지 않을 수 있습니다.)
5. 학생 계정은 원장님이 Supabase Authentication에서 만들고 profiles 테이블에 연결합니다.

## 주의
- 공개 가능한 publishable key만 웹에 넣었습니다. secret/service_role 키를 웹에 넣으면 안 됩니다.
- 학생 개인정보를 넣기 전에 계정별 접근 테스트와 백업 정책을 검증하세요.
- GitHub 저장소에 자동 업로드되거나 웹에 배포된 것은 아닙니다.
- 외부 음원 파일은 링크를 등록하는 방식이며, 직접 업로드는 아직 미구현입니다.
