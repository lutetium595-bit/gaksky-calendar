# 각하늘 PROFILE + CALENDER 영구 저장 관리자 버전

## 기능
- 누구나 PROFILE/CALENDER와 일정을 볼 수 있음
- 일정 추가/수정/삭제는 관리자 로그인 후에만 가능
- 일정은 PostgreSQL 데이터베이스에 저장됨
- Render 재배포나 서버 재시작 후에도 일정이 유지됨
- PROFILE과 CALENDER는 다크모드 설정을 공유함

## Render 배포 방법
### 1. PostgreSQL 생성
Render Dashboard → New → PostgreSQL을 생성합니다.
생성 후 Database의 `Internal Database URL` 또는 앱과 연결 가능한 `DATABASE_URL` 값을 사용합니다.

### 2. Web Service 환경 변수
다음 4개를 설정합니다.
- `ADMIN_PASSWORD`: 관리자 비밀번호
- `JWT_SECRET`: 길고 랜덤한 비밀 문자열
- `DATABASE_URL`: Render PostgreSQL 연결 주소
- `NODE_ENV`: `production`

### 3. Web Service 설정
- Build Command: `npm install`
- Start Command: `npm start`

서버가 처음 실행될 때 `events` 테이블을 자동 생성합니다.
기존 파일형 `data/events.json` 방식은 사용하지 않습니다.

## 로컬 실행
1. Node.js 18 이상 설치
2. `.env.example`을 복사해 `.env` 생성
3. 위 환경 변수 4개 입력
4. `npm install`
5. `npm start`
