# POKETWIN · 포켓트윈

15개의 일상 질문으로 나와 닮은 포켓몬을 찾는 한국어 성향 테스트입니다. React, TypeScript, Vite로 만들었으며, 선택적으로 Supabase를 연결해 친구들과 트레이너 팀을 만들 수 있습니다.

## 시작하기

이 README와 `package.json`이 있는 폴더가 프로젝트 루트입니다. 이 폴더 전체를 원하는 위치로 옮기거나 이름을 변경해도 됩니다. 다른 폴더의 파일이나 특정 컴퓨터의 절대 경로를 참조하지 않습니다.

Node.js 22.12 이상과 npm이 필요합니다.

```bash
npm ci
npm run dev
```

기본 개발 주소는 `http://localhost:5173`입니다. 폴더를 이동하기 전 실행 중인 서버를 종료하고, 이동한 폴더에서 다시 실행하세요. 다른 컴퓨터로 옮겼다면 `npm ci`로 의존성을 다시 설치하세요.

```bash
npm test          # 매칭·파트너 참조·팀 궁합 검사
npm run build     # TypeScript 검사와 프로덕션 빌드
npm run preview   # 빌드한 dist 미리보기
```

## 환경변수

기본 성향 테스트와 포켓몬 도감은 환경변수 없이 사용할 수 있습니다. 트레이너 도감·카카오 공유를 쓰려면 프로젝트 루트에 `.env.local` 파일을 만들고 아래 변수를 `변수=값` 형식으로 한 줄씩 적으세요.

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_KAKAO_JS_KEY=
```

환경변수 변경 후에는 개발 서버를 다시 시작하고, 배포 시에는 다시 빌드해야 합니다.

| 변수 | 용도 |
| --- | --- |
| `VITE_SUPABASE_URL` | 트레이너 도감을 저장할 Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase 공개용 publishable/anon 키 |
| `VITE_KAKAO_JS_KEY` | 카카오톡 공유용 JavaScript 키(공개 키, 카카오 콘솔에 도메인 등록 필요) |

`VITE_` 변수는 브라우저에 공개됩니다. Supabase secret/service_role 키 같은 비밀키를 넣지 마세요. `.env.local`은 Git에서 제외합니다.

## 주요 기능

- 15개 질문과 5개 성향 축으로 결정되는 32종 포켓몬 결과
- 답변 이어 풀기, 이전 질문으로 돌아가기, 결과 URL 공유
- 포켓몬별 상세 설명, 닮은 점, 한마디, 찰떡·티격태격 파트너
- 검색과 타입 필터가 있는 포켓몬 도감
- 결과 카드 PNG 저장, 모바일 레이아웃, 키보드 접근, 동작 감소 설정
- Supabase 연결 시 트레이너 생성, 팀 초대와 참여, 팀원 간 궁합 비교

## 프로젝트 구조

```text
.
├── public/
│   ├── brand/              # 로고
│   ├── pokemon/            # 포켓몬 이미지
│   ├── share/              # 공유·링크 미리보기 그림
│   └── trainers/           # 트레이너 이미지
├── scripts/                # 빌드 때 robots·sitemap·llms.txt 생성
├── src/
│   ├── components/         # 재사용 화면 구성 요소
│   ├── data/               # 질문·포켓몬·트레이너 데이터
│   ├── lib/                # 매칭·공유·저장·팀 기능과 테스트
│   └── pages/              # 홈·질문·결과·도감·팀 페이지
├── worker/                 # Cloudflare Worker(주소별 링크 미리보기)
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
└── wrangler.jsonc          # Cloudflare Workers 배포 설정
```

`node_modules/`, `dist/`, `.env.local`, `.local/`, `.claude/`, `docs/`, `supabase/`는 로컬 작업용이며 Git 업로드에서 제외합니다. 앱 실행에는 필요하지 않습니다.

## 트레이너 도감 기능

트레이너 도감은 Supabase 익명 로그인과 데이터베이스를 사용합니다. 기본 성향 테스트는 서버 없이 동작하며, 답변은 브라우저의 localStorage와 결과 URL로 복원합니다. Supabase 환경변수를 설정하지 않으면 도감 관련 진입 버튼은 표시하지 않습니다.

DB 스키마·마이그레이션(`supabase/`)과 운영 메모(`docs/`)는 저장소에 포함하지 않고 별도로 보관합니다.

## 결과와 궁합

질문은 에너지·호기심·마음의 방향·일상의 리듬·시작하는 방식 다섯 축에 각 3개씩 배정합니다. 선택지는 -2/-1/+1/+2점이며, 축별 점수의 부호로 5자리 코드를 만듭니다. 합계가 0인 축은 마지막 답변의 방향으로 결정하므로 같은 답변은 항상 같은 결과가 됩니다.

성향 지도는 각 축의 점수를 0~100으로 정규화한 표시이며 진단 정확도나 백분위가 아닙니다. 찰떡·티격태격 파트너는 포켓트윈이 정한 창작 조합입니다. 팀원 간 궁합 점수는 실제 답변의 성향 점수 차이와 찰떡 파트너 보너스로 별도 계산합니다.

결과 URL의 `a` 값에는 0~3으로 된 답변 15개가 담깁니다. 예전 12자리 링크도 열리며 대부분 기존 포켓몬을 유지하지만, 현재 호환 규칙에서는 루카리오가 괴력몬으로, 옛 뮤 결과가 폴리곤으로 이어집니다. 링크를 받은 사람도 이 선택 정보를 복원할 수 있습니다.

## GitHub 업로드와 배포

소스 저장소는 [lsngmin/poketwin](https://github.com/lsngmin/poketwin)입니다. GitHub 업로드 전에는 `git status`로 변경 내용을 확인하세요. `.gitignore`에 지정한 로컬 파일은 업로드에서 제외됩니다.

배포는 아래 Cloudflare Workers 항목처럼 로컬에서 `npm run deploy`로 합니다. 다른 배포 서비스를 쓴다면 프로젝트 루트는 `.`, 빌드 명령은 `npm run build`, 출력 폴더는 `dist`로 지정하고 환경변수를 따로 설정하세요.

현재 이미지 경로는 `/pokemon/`, `/brand/`, `/trainers/`를 사용하므로 도메인의 루트에 배포하는 구성을 기준으로 합니다. GitHub에 소스를 올리는 것과 GitHub Pages에 배포하는 것은 별개이며, `/저장소명/` 하위 경로의 Pages 배포에는 경로 조정이 필요합니다. 페이지 이동에는 BrowserRouter를 사용하며, 기존 `#/` 링크는 새 경로로 자동 연결됩니다. Workers의 SPA fallback 설정으로 하위 경로 새로고침을 지원합니다.

## 출처

비공식 팬 프로젝트입니다. Pokémon 및 캐릭터의 권리는 각 권리자에게 있으며, 성향과 파트너 해석은 공식 설정이나 심리 진단이 아닙니다.

- 포켓몬 이미지: [PokeAPI/sprites](https://github.com/PokeAPI/sprites)의 official-artwork
- 글꼴: Pretendard, SIL Open Font License

광고는 넣지 않습니다. 방문 분석은 GA4만 사용하며, 보내는 이벤트는 `src/lib/analytics.ts`에 모여 있습니다.

### Cloudflare Workers 배포

`worker/index.ts`는 결과·포켓몬·도감 초대 주소(`/result`, `/pokemon/*`, `/t/*`)의 HTML에만 링크 미리보기(og:·twitter:)를 주소에 맞게 넣고, 나머지는 정적 파일을 그대로 보냅니다(`wrangler.jsonc`의 `run_worker_first`). 공유 그림(카카오·미리보기 1200×600, 인스타 스토리 1080×1920)은 `public/share`에 있습니다. 그림을 만드는 도구는 저장소에 포함하지 않고 따로 보관합니다.

이 프로젝트 폴더에서 `npm run deploy`를 실행하면 빌드 후 기존 `poketwin` Worker에 배포합니다. `npm run deploy:check`로 배포 없이 확인하거나 `npm run preview:worker`로 로컬에서 확인할 수 있습니다. 최초 실행 시 Cloudflare 로그인이 필요합니다.

Vite 환경변수는 빌드 시 포함되므로 이 폴더의 `.env.local`에 공개용 Supabase URL과 anon 키를 설정하세요. 서비스 역할 키 등 비밀 키는 `VITE_` 변수에 넣지 마세요.
