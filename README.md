# WAKBOYS COLLECTION

와크보이즈 8명 전용 계모임 웹앱 (PWA). 컨셉: 멤버 = 피규어 패키지, 여행 = 시즌 한정판 에디션, 아카이브 = 진열장.

- **backend/**: Spring Boot 3.4, Java 21, JPA, Flyway, Spring Security(JWT), Neon Postgres, Cloudflare R2, Web Push
- **frontend/**: React 18, Vite, TypeScript, TanStack Query, 서비스워커(푸시 + 오프라인 셸)
- 배포는 Render 서비스 1개. Docker 빌드에서 프론트를 백엔드 static으로 같이 묶기 때문에 도메인이 하나이고 CORS 설정이 없음

## 기능

| 탭 | 내용 |
|---|---|
| 홈 | 다음 에디션 D-day, 이번 달 회비 수집 현황(미납 = 빈 슬롯 "?"), 다가오는 생일, 최근 추억 사진, 진열장, 최근 소식 |
| 에디션 | 여행(연도·여름/겨울)별 상세. 탭: 투표 / 일정 / 장소 / 준비물 / 정산 / 아카이브 |
| 회비 | 통장 잔액, 멤버×월 납부표(총무만 체크), 지출 내역, 회비 설정(월 금액·계좌·시작 월·기존 잔액) |
| 소식 | 글 + 사진·영상, 댓글, 캐릭터 리액션 |
| 컬렉션 | 8명 피규어 박스 → 상세(전신, 소품, 표정 파츠, 활동 수) |

- **로그인**: 카카오 + **1인 1코드** 초대. 코드가 처음부터 캐릭터에 묶여 있어서 남의 캐릭터를 잘못 고를 수 없음. 코드는 한 번 쓰면 사라짐
- **재로그인**: 카카오 고유 ID로 찾아서 바로 홈으로 감. 리프레시 토큰은 30일이고 쓸 때마다 연장
- **운영자(김동욱)**: 총무 지정·해제, 카카오 연결 해제(기록은 캐릭터에 남음), 초대 코드 재발급
- **리액션**: 웃겨 / 멋져 / 헐 / 빡침. 누른 사람 본인 캐릭터의 표정 이미지로 보임
  - 이재호: 헐 → 알딸딸, 빡침 → 현타
  - 박민훈: 멋져 → 마스크
- **정산**: 1인당 금액은 10원 단위 올림. 받는 사람(기본 총무)을 중심으로 송금 목록을 자동 계산하고, 보낸 사람이 "보냈어요"를 체크함. 체크한 뒤 경비가 바뀌면 경고 표시
- **업로드**: 브라우저에서 R2로 직접 올림(presigned PUT). 썸네일(webp)도 브라우저가 만듦. 사진 25MB, 영상 500MB, 한 번에 50개
- **알림(Web Push)**
  - 새 에디션, 새 투표, 사진 업로드, 새 소식, 내 글/사진에 달린 댓글, 회비 납부 확인, 정산 송금
  - 매달 말일 20:00 "혹시 이번달 회비를 깜빡하진 않으셨나요?"(8명 전원)
  - 생일 당일 09:00

## 로컬 실행

```bash
# DB (도커 예시)
docker run -d --name wakdb -p 5432:5432 -e POSTGRES_USER=wakboys -e POSTGRES_PASSWORD=wakboys -e POSTGRES_DB=wakboys postgres:16

# 백엔드: local 프로필이면 개발용 로그인 버튼이 켜지고, R2 대신 backend/local-uploads 폴더를 씀
cd backend
./gradlew bootRun --args='--spring.profiles.active=local'

# 프론트 (http://localhost:5173, /api는 8080으로 프록시)
cd frontend
npm install
npm run dev
```

백엔드를 처음 띄우면 로그에 8명의 초대 코드가 찍힘: `[invite] 김동욱 (kimdonguk) -> WAK-XXXXXX`

## 배포 (Render Starter + Neon + R2)

### 1. Neon
새 프로젝트(또는 Subby와 다른 DB)를 만들고 접속 정보를 아래처럼 나눠서 넣음. 테이블은 Flyway가 자동으로 만듦.

- `DATABASE_URL=jdbc:postgresql://<host>/<db>?sslmode=require`
- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`

### 2. Kakao Developers
1. 애플리케이션 추가
2. **앱 키**: REST API 키 → `KAKAO_REST_API_KEY`, JavaScript 키 → `KAKAO_JS_KEY`(장소 탭 지도·검색용)
3. **플랫폼 > Web**: 사이트 도메인에 `https://<render-domain>`과 `http://localhost:5173` 등록
4. **카카오 로그인**: 활성화하고 Redirect URI에 다음 두 개 등록
   - `https://<render-domain>/auth/kakao/callback`
   - `http://localhost:5173/auth/kakao/callback`
5. 동의항목: 아무것도 필요 없음(카카오 고유 ID만 씀)
6. 보안 > Client Secret을 켰다면 그 값을 `KAKAO_CLIENT_SECRET`에 넣음

### 3. Cloudflare R2
1. 버킷 `wakboys` 생성
2. **R2 API 토큰**(Object Read & Write, 이 버킷만)을 만들어서 `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`에 넣음. 계정 ID는 `R2_ACCOUNT_ID`
3. 버킷 Settings > **CORS policy**에 `r2-cors.json` 내용을 붙여넣음(도메인은 실제 값으로 수정)
4. 이미지 URL 방식은 둘 중 하나
   - 버킷을 공개하지 않음: `R2_PUBLIC_BASE_URL`을 비워두면 12시간짜리 서명 URL로 보여줌. 링크가 유출돼도 12시간 뒤 만료됨
   - 공개 도메인 연결: `R2_PUBLIC_BASE_URL=https://img.내도메인`. 캐시가 잘 되지만, 링크를 아는 사람은 누구나 볼 수 있음(키는 추측 불가능한 UUID)

### 4. VAPID 키 (푸시)
```bash
npx web-push generate-vapid-keys
```
생성된 키를 `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`에 넣고, `VAPID_SUBJECT=mailto:본인메일`을 설정.

### 5. Render
1. 저장소 연결 → **New > Blueprint**(`render.yaml`)를 쓰거나, Web Service를 Docker로 직접 생성
2. Plan: **Starter**. 항상 켜져 있어서 월말·생일 알림 스케줄러가 앱 안에서 돌아감
3. Health Check Path: `/actuator/health/liveness`. DB를 건드리지 않아서 Neon 사용량이 늘지 않음
4. 환경변수는 `.env.example`을 참고. `APP_BASE_URL`에는 실제 도메인을 넣음
5. 첫 배포 후 Logs에서 `[invite]` 줄을 찾아 내 코드로 가입함 → 앱의 **마이 > 운영자** 화면에서 나머지 7명 코드를 복사해서 개인톡으로 전달

### 아이폰 알림
iOS Safari는 **홈 화면에 추가**한 앱에서만 웹 푸시가 됨(iOS 16.4+). 추가한 앱을 열고 **마이 > 알림 켜기**.

## 캐릭터 에셋
`frontend/public/characters/<slug>/`

- `profile.webp`, `full_body.webp`
- `reactions/*.webp`
- `icon.webp`(소품이 있는 4명만)

저장소를 public으로 올리면 이 이미지도 공개되니 **private 저장소를 권장**함.
