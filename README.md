# 각하늘 PROFILE + CALENDER 관리자 버전

## 기능
- 누구나 PROFILE/CALENDER와 일정을 볼 수 있음
- 일정 추가/수정/삭제는 관리자 로그인 후에만 가능
- 일정은 서버의 `data/events.json`에 저장되어 모든 방문자에게 공유됨
- PROFILE과 CALENDER는 같은 브라우저에서 다크모드 설정을 공유함

## 실행
1. Node.js 18 이상 설치
2. `.env.example` 파일을 복사해서 `.env` 파일 생성
3. `.env`에서 `ADMIN_PASSWORD`, `JWT_SECRET` 변경
4. 터미널에서 `npm install`
5. `npm start`
6. 브라우저에서 `http://localhost:3000`

## 배포
Render 같은 Node.js 서버 호스팅에 배포하고 환경변수 `ADMIN_PASSWORD`, `JWT_SECRET`를 설정하세요. GitHub Pages만으로는 이 관리자 보호 기능을 안전하게 사용할 수 없습니다.


## Render 환경 변수
- ADMIN_PASSWORD
- JWT_SECRET

중요: `.env`는 GitHub에 올리지 말고 Render Environment에서 설정하세요.
