# 사용자 설정 체크리스트

설정 완료 후 Claude에게 알려주시면 이어서 진행합니다.

---

## 1. YouTube API 키 ✅ 완료

## 2. .env 파일 설정

- [x] `.env` 파일 생성 및 `YOUTUBE_API_KEY` 입력 완료
- [ ] Supabase 키 추가 (아래 참고)

```env
# .env 파일에 추가
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Supabase 키 위치: Supabase 대시보드 → 프로젝트 → **Settings → API**
- `Project URL` → `SUPABASE_URL`
- `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`

---

## 3. Supabase 프로젝트 연결 및 DB 마이그레이션

> Supabase CLI가 설치되어 있습니다 (v2.105.0).
> 아래 명령어를 **터미널에서 직접** 순서대로 실행해주세요.

### 3-1. Supabase 로그인 (브라우저 인증)
```bash
supabase login
```

### 3-2. 프로젝트 연결
```bash
# Supabase 대시보드 URL의 프로젝트 ref 확인:
# https://supabase.com/dashboard/project/[이부분이 project-ref]
supabase link --project-ref 여기에_프로젝트_ref_입력
```

### 3-3. DB 마이그레이션 실행 (테이블 생성)
```bash
supabase db push
```

완료되면 Supabase 대시보드 → **Table Editor**에서 `youtube_rankings` 테이블이 생성된 것을 확인할 수 있습니다.

---

## 4. 모니터링 채널 ID 입력

프로젝트 루트의 `channels.json` 파일을 편집하세요:

```json
{
  "channelIds": [
    "UC실제채널ID_1",
    "UC실제채널ID_2"
  ]
}
```

**채널 ID 찾는 방법:**
- 채널 URL이 `youtube.com/channel/UCxxxxx` 형태면 `UCxxxxx` 부분
- 또는 채널 페이지 → 우클릭 → 페이지 소스 → `channelId` 검색

---

## 5. 동작 확인

```bash
npm run build
node dist/index.js
```

정상이면:
1. 콘솔에 채널 랭킹 테이블 출력
2. Supabase `youtube_rankings` 테이블에 데이터 자동 저장
