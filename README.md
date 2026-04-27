# Claude Code × Vercel WBS 과제

Claude Code만으로 WBS(Work Breakdown Structure) 프로젝트 매니지먼트 웹앱을 만들고, Vercel에 배포해 공개 URL을 획득해보는 풀스택 과제입니다. 직접 타이핑은 최소한으로만 하고, 대부분의 구현은 Claude Code에게 지시해서 진행합니다.

## 관련 문서

| 문서 | 읽어야 할 사람 | 내용 |
|---|---|---|
| **`SPEC.md`** | 모두 (기능 기획) | 사용자가 화면에서 기대할 수 있는 기능을 정리한 제품 스펙 |
| **`USER_JOURNEY.md`** | 테스터 · Claude | `SPEC.md`의 기능을 Given/When/Then 시나리오로 풀어둔 테스트 근거 |
| **`CLAUDE.md`** | Claude Code | 에이전트가 따라야 할 스택 고정·워크플로우·금기사항 |
| **이 파일 (`README.md`)** | 수강생 | 과제 안내 + 실습 가이드 |

## 학습 목표

- Claude Code에게 요구사항을 전달하고 검증하는 흐름 연습
- Next.js(풀스택) + Chakra UI v3 + Supabase + Drizzle ORM 스택 맛보기
- **로컬 Docker 기반 Supabase**로 개발 환경 구성 경험
- **GitHub Actions**로 원격 DB 마이그레이션 자동화 경험
- Vercel + 원격 Supabase로 실제 배포까지 완주

---

## 최종 결과물 체크리스트

이 체크리스트가 모두 ✅가 되면 과제 합격입니다.

- [ ] 로컬에서 `supabase start`로 Postgres·Studio 컨테이너가 기동된다
- [ ] `npm run dev`로 Next.js 앱이 로컬 Supabase에 연결되어 동작한다
- [ ] Task **생성/수정/삭제**, **부모-자식 계층**, 진행률, 담당자, 시작일, **목표 기한(`due_date`)**, **CSV Import/Export**가 동작한다
- [ ] **간트형 일정 시각화 뷰**에서 각 Task의 `start_date ~ due_date` 구간이 날짜 그리드 위에 막대로 표시되고, 막대 내부 채움으로 진행률이 보인다
- [ ] `main` 브랜치 push 시 GitHub Actions의 `db-migrate` 워크플로우가 성공(✅)으로 실행되어 원격 Supabase DB에 Drizzle 마이그레이션이 반영된다
- [ ] Vercel에 배포된 공개 URL이 존재하고, 원격 Supabase와 연결되어 정상 동작한다
- [ ] GitHub Issue 탭에 WBS 기능 스펙이 이슈로 등록돼 있다

> 💡 "목표 기한"은 **각 Task의 `due_date` 필드**를 뜻합니다. 과제 제출 마감일이 아니에요.

---

## 기술 스택 (고정)

| 영역 | 선택 | 비고 |
|---|---|---|
| **풀스택 프레임워크** | Next.js 16+ (App Router, TypeScript) | 프론트엔드와 백엔드가 **하나의 Next.js 앱**으로 통합됨. 별도의 Node/Express 서버 없음 |
| DB · Auth · Storage | Supabase | 로컬: Docker / 원격: Cloud |
| ORM · **마이그레이션** | **Drizzle ORM** | 스키마·마이그레이션의 단일 원천 |
| CI/CD | **GitHub Actions** | `main` push 시 프로덕션 DB 마이그레이션 자동 적용 |
| UI | **Chakra UI v3** | Tailwind·shadcn 혼용 금지 |
| 배포 | Vercel | 프론트 + 서버(API Routes/Server Actions)를 한 번에 배포 |
| 패키지 매니저 | **npm** | |
| Node.js | 20 LTS 이상 | |

> 🧩 **풀스택 단일 배포 원칙**
> 이 프로젝트는 프론트엔드 따로, 백엔드 따로 두지 않습니다. **Next.js가 프론트(React Server/Client Components)와 백엔드(Route Handlers `app/api/**`, Server Actions)를 모두 담당**하고, Vercel에 하나의 앱으로 올라갑니다. DB 쿼리·비즈니스 로직은 **서버 측 경계** 안에서만 실행되며, 클라이언트 컴포넌트는 서버 액션/API Route를 호출해서 결과만 받습니다.

> 🧭 **역할 분리**
> - **Drizzle**이 스키마·마이그레이션의 **단일 진실 원천**입니다. `lib/db/schema.ts`를 고치고 `npm run db:generate`로 마이그레이션 파일을 만들어 git에 커밋합니다.
> - **Supabase CLI**는 이 프로젝트에서 **로컬 Postgres 컨테이너를 띄우는 용도로만** 씁니다(`supabase start/stop/status`). `supabase db push` · `supabase migration new`는 **사용하지 않습니다**.
> - **프로덕션 DB에 마이그레이션을 적용하는 일은 사람이 하지 않습니다.** `main` 브랜치에 push되면 GitHub Actions(`.github/workflows/db-migrate.yml`)가 `drizzle-kit migrate`를 실행해 자동 반영합니다.

---

## 사전 준비물

전제: 2회차 오프라인 Claude Code 세션을 수료했다면 **Claude Code**와 **`gh` CLI**는 이미 설치·로그인된 상태입니다.

이번 과제를 위해 추가로 필요한 것은 다음과 같습니다.

- Node.js 20 LTS 이상
- Docker Desktop (Supabase 로컬 컨테이너용)
- Supabase CLI
- Vercel CLI
- Supabase·Vercel 계정 (GitHub 로그인으로 가입 권장)

### 🟢 가장 쉬운 방법 — 내장 스킬 두 개

저장소를 클론한 뒤 `claude`를 실행하면, 첫 메시지를 보내는 순간 Claude가 먼저 아래 2단계를 제안합니다(수강생은 Yes/No만 누르면 됨).

1. **`/setup-dev-environment`** — 필수 도구 설치·가입·로그인 가이드
   - `node`, `docker`, `supabase`, `vercel`, `gh`가 설치·로그인됐는지 진단하고 표로 보여줌
   - 누락된 도구에 대해 OS별 설치 명령 제안 (자동 실행은 안 하고 항상 승인을 받음)
   - Supabase·Vercel 회원가입 링크와 로그인 명령 안내
   - VS Code 확장 등 있으면 편한 유틸 추천
2. **`/dev-server`** — 로컬 서버 한 방에 기동
   - `supabase init` (최초 1회) → `supabase start` (Docker 컨테이너)
   - `.env.local` 을 `supabase status` 출력과 맞춰 동기화
   - `npm ci` (필요 시) → `npm run db:migrate` (마이그레이션 있을 때)
   - `npm run dev` 를 백그라운드 기동 후 준비 완료 메시지

### 수동 확인 스니펫

직접 확인하고 싶다면:

```bash
node -v              # v20.x 이상
docker info          # 데몬이 돌고 있어야 함 (Docker Desktop이 켜져 있어야 함)
supabase --version
vercel --version
gh auth status
```

---

## WBS 기능 스펙 (MVP)

> **사용자 관점 전체 기능·화면 목업은 [`SPEC.md`](./SPEC.md)에 있습니다.** 여기서는 구현에 필요한 **데이터 모델 필드명**만 정리합니다. UX 동작(버튼 라벨, 목록·간트 화면 구성, Overdue 표시 방식 등)은 SPEC.md를 단일 원천으로 삼으세요.

### 데이터 모델

`tasks` 테이블 하나. 필드명은 `CLAUDE.md §3` 의 Drizzle 스키마와 일치해야 합니다.

| 필드 | 타입 | SPEC.md 매핑 |
|---|---|---|
| `id` | uuid | PK |
| `parent_id` | uuid? | 계층(Feature E)의 부모 참조 |
| `title` | text | "제목" |
| `description` | text? | "설명" |
| `assignee` | text? | "담당자" |
| `status` | `'todo' \| 'doing' \| 'done'` | "상태 배지" (할 일 / 진행 중 / 완료) |
| `progress` | int (0~100) | "진행률" |
| `start_date` | date? | "시작일" |
| **`due_date`** | date? | **"목표 기한"** (SPEC.md 전반에서 이 필드를 가리킴) |
| `created_at` | timestamptz | 정렬 기준 (A-3) |
| `updated_at` | timestamptz | — |

---

## GitHub Issue로 작업 쪼개기

왜 이슈로 쪼개나요? 한 번에 모든 걸 "WBS 만들어줘"라고 시키면 결과를 리뷰하기 어렵고, 어디에서 무엇이 잘못됐는지 추적이 안 됩니다. **스펙 단위로 이슈를 쪼개두면, 한 이슈씩 Claude에게 지시하고 커밋하고 확인하는 리듬**이 생깁니다.

아래는 이 과제에 맞춰 그대로 등록해도 되는 초기 이슈 목록입니다. **구현 방법은 이슈에 쓰지 말고**, 아래처럼 **무엇을 원하는지 스펙만** 짧게 적어 두세요.

1. `[setup] Next.js + Chakra UI v3 Provider + Supabase client + Drizzle client 부트스트랩`
2. `[db] lib/db/schema.ts에 tasks 테이블 정의 (계층 · 진행률 · start_date · due_date) + drizzle-kit generate/migrate로 로컬 적용`
3. `[feat] Task 생성/수정/삭제`
4. `[feat] Task 계층(부모-자식) 표시 및 들여쓰기`
5. `[feat] 진행률 · 상태 · 담당자 · 시작일 · 목표 기한 편집`
6. `[feat] CSV Import/Export`
7. `[feat] 간트형 일정 시각화 뷰 (start_date~due_date 가로 막대, 진행률 내부 채우기)`
8. `[deploy] Supabase Cloud 프로젝트 생성 및 연결 정보 수집 (Direct/Pooler URL)`
9. `[ci] GitHub Actions secret(PRODUCTION_DATABASE_URL) 세팅 및 db-migrate 워크플로우 성공 확인`
10. `[deploy] Vercel 연결 및 환경변수(NEXT_PUBLIC_* + DATABASE_URL) 세팅, vercel --prod 배포`
11. `[polish] 목표 기한 지남(overdue) Task 시각 표시`

### 한 번에 이슈 등록하기 (선택)

GitHub 저장소를 만들고 연결한 뒤, 아래 스니펫을 실행하면 위 목록이 한 번에 등록됩니다. (저장소 루트에서 실행)

```bash
for t in \
  "[setup] Next.js + Chakra UI v3 Provider + Supabase client + Drizzle client 부트스트랩" \
  "[db] lib/db/schema.ts에 tasks 테이블 정의 (계층·진행률·start_date·due_date) + drizzle-kit generate/migrate로 로컬 적용" \
  "[feat] Task 생성/수정/삭제" \
  "[feat] Task 계층(부모-자식) 표시 및 들여쓰기" \
  "[feat] 진행률·상태·담당자·시작일·목표 기한 편집" \
  "[feat] CSV Import/Export" \
  "[feat] 간트형 일정 시각화 뷰 (start_date~due_date 가로 막대, 진행률 내부 채우기)" \
  "[deploy] Supabase Cloud 프로젝트 생성 및 연결 정보 수집 (Direct/Pooler URL)" \
  "[ci] GitHub Actions secret(PRODUCTION_DATABASE_URL) 세팅 및 db-migrate 워크플로우 성공 확인" \
  "[deploy] Vercel 연결 및 환경변수 세팅, vercel --prod 배포" \
  "[polish] 목표 기한 지남(overdue) Task 시각 표시"; do
  gh issue create --title "$t" --body "스펙: 제목 참고. 구현 상세는 Claude Code와 상의해서 결정."
done
```

---

## 프로젝트 MCP 구성

이 저장소의 루트에는 `.mcp.json`이 들어 있어, Claude Code를 저장소 안에서 실행하면 다음 MCP 서버가 자동으로 활성화됩니다. 첫 실행 시 "프로젝트 MCP 서버를 승인하시겠습니까?"가 뜨면 **Yes**를 선택하세요.

| 서버 | 역할 | 언제 유용한가 |
|---|---|---|
| `context7` (Upstash) | 라이브러리 최신 문서 주입 | Next.js/Supabase/Drizzle API가 바뀌었는지 의심될 때 |
| `chakra-ui` | Chakra UI v3 컴포넌트 API·테마 참고 | 컴포넌트 이름·prop을 헤맬 때 |
| `playwright` | 실제 브라우저로 페이지 검증 | "배포된 URL 열어서 Task 만들어지는지 봐줘" |

### 내장 슬래시 스킬

| 슬래시 명령 | 역할 |
|---|---|
| `/setup-dev-environment` | 필수 의존성 진단 + 설치·가입·로그인 가이드 |
| `/dev-server` | 로컬 Supabase 컨테이너 + Next.js 개발 서버를 한 번에 기동 |

---

## 로컬 개발 시작하기 (저장소를 막 클론한 사람용)

이 저장소에는 이미 Next.js 앱·`lib/db/schema.ts`·`drizzle/` 마이그레이션·`supabase/config.toml`이 들어 있습니다. 클론한 사람은 **앱을 새로 만들 필요가 없고**, 아래 순서대로 환경만 맞추면 곧바로 개발 서버가 뜹니다.

> 🟢 **빠르게 가고 싶다면** — 1번까지만 직접 하고 그 뒤는 Claude Code에 맡기세요. `claude` 실행 후 첫 메시지를 보내면 Claude가 `/setup-dev-environment`(도구 점검)와 `/dev-server`(컨테이너 + Next.js 기동)를 순서대로 제안합니다. 아래 2~6단계를 자동화한 흐름입니다.
>
> 아래는 **수동으로 직접 따라가고 싶을 때**의 절차입니다.

### 1) 저장소 클론 & 의존성 설치

```bash
git clone <이 저장소 URL>
cd claude-vercel-wbs
npm install                     # node_modules는 git에 포함되지 않으므로 반드시 설치
```

### 2) 사전 도구 확인

Docker Desktop이 **실행 중**이어야 다음 단계가 동작합니다.

```bash
node -v              # v20.x 이상
docker info          # 데몬이 응답해야 함
supabase --version
```

> 하나라도 빠져 있으면 Claude Code에서 `/setup-dev-environment` 를 실행해 OS별 설치 가이드를 받으세요.

### 3) Supabase 로컬 Postgres 컨테이너 기동

이 프로젝트의 Supabase CLI 용도는 **로컬 컨테이너 기동뿐**입니다.

```bash
supabase start       # 최초 실행 시 Docker 이미지 pull로 몇 분 걸림
supabase status      # API URL · anon key · DB URL 출력
```

> `supabase/config.toml` 이 이미 커밋돼 있으므로 `supabase init` 은 다시 실행할 필요 없습니다.
> `supabase migration new` / `supabase db push` / `supabase db reset` 은 이 프로젝트에서 **사용하지 않습니다.** 스키마 변경은 Drizzle이 전담합니다.

### 4) `.env.local` 생성

`.env.local` 은 `.gitignore` 대상이라 클론본에는 포함돼 있지 않습니다. 저장소 루트에 직접 만들고, **`anon key` 값만** 위 `supabase status` 출력에서 복사해 넣으세요. (URL과 DB URL은 로컬에서 항상 동일합니다.)

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase status 출력의 anon key>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### 5) 로컬 DB에 마이그레이션 적용

`drizzle/0000_*.sql` 이 이미 커밋돼 있으므로 곧바로 적용만 하면 `tasks` 테이블이 생깁니다.

```bash
npm run db:migrate
```

> `npm run db:generate` 는 **스키마(`lib/db/schema.ts`)를 바꿨을 때**만 실행합니다. 클론 직후 첫 셋업에선 필요하지 않습니다.

### 6) Next.js 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 을 열어 Task 목록 화면이 뜨는지 확인합니다. 여기까지 성공하면 로컬 개발 환경 셋업 완료입니다.

> 💡 2~6단계를 한 번에 끝내고 싶으면 Claude Code에서 `/dev-server` 를 실행하세요. 위 흐름을 자동으로 수행하고 백그라운드에서 `npm run dev` 까지 띄워 줍니다.

---

## 원격 배포하기

로컬에서 잘 돌아가는 WBS 앱을 공개 URL에 띄우기 위한 절차입니다. 코드/스키마 변경은 없고 **인프라 설정만** 합니다.

전체 흐름:

```
Supabase Cloud 프로젝트 생성
 └─ 두 종류 connection string 수집 (5432 = 마이그레이션용 / 6543 = 런타임용)
      └─ GitHub repo → Settings → Environments → production
           └─ secret PRODUCTION_DATABASE_URL = 5432 문자열
                └─ main 브랜치 push → db-migrate 워크플로우 자동 실행 ✅
                     └─ Vercel Dashboard → Add New → Project → GitHub repo Import
                          └─ Production env에 DATABASE_URL = 6543 문자열 추가 → Deploy
                               └─ 공개 URL 획득
```

> 이 프로젝트는 `supabase-js`를 사용하지 않고 Drizzle + `postgres` 드라이버로 DB에 직접 접속합니다.
> 따라서 Vercel에 등록할 환경변수는 `DATABASE_URL` 하나뿐이며, `NEXT_PUBLIC_SUPABASE_*`는 필요 없습니다.

### 0) 사전 점검 (5분)

진행 전에 아래가 모두 OK여야 합니다:

- [ ] `git status` 결과가 깨끗하고 `main` 브랜치에 push가 끝나 있다.
- [ ] 로컬에서 `npm run build`가 에러 없이 통과한다 (`.env.local`의 로컬 `DATABASE_URL`로).
- [ ] `git ls-files drizzle/`로 `0000_*.sql`과 `meta/_journal.json`이 추적되는 게 보인다.
- [ ] GitHub 원격 저장소가 존재한다 (Vercel이 import할 대상).

### 1) 단계 A — 원격 Supabase 프로젝트 생성

1. https://supabase.com 로그인 → **New project**.
2. Region은 사용자에게 가까운 곳 (예: `Northeast Asia (Seoul)`).
3. DB password를 강하게 정하고 **반드시 어딘가에 안전하게 메모**합니다. 이후 connection string에 들어가며, 잃어버리면 재발급해야 합니다.
4. 프로젝트 provisioning 완료까지 ~2분 대기.

**두 종류의 connection string을 확보**합니다. Supabase Dashboard → 해당 프로젝트 → **Settings → Database → Connection string** 에서 아래 두 가지를 모두 복사해 둡니다.

| 용도 | 어떤 connection | port | 어디에 넣나 |
|---|---|---|---|
| 마이그레이션 (GitHub Actions) | **Session pooler** 또는 **Direct connection** | **5432** | GitHub `production` env secret `PRODUCTION_DATABASE_URL` |
| 런타임 쿼리 (Vercel 서버리스) | **Transaction pooler** | **6543** | Vercel Production env `DATABASE_URL` |

⚠️ **두 connection은 반드시 분리합니다.** Transaction pooler(6543)로 `drizzle-kit migrate`를 돌리면 prepared statement 충돌로 실패합니다.

각 문자열의 `[YOUR-PASSWORD]` 자리표시자는 단계 1에서 만든 비밀번호로 치환합니다. 비밀번호에 특수문자가 있으면 URL-encoding이 필요합니다 (`@` → `%40` 등). Supabase Dashboard가 복사용 값을 이미 인코딩해서 주는 경우가 많으니 우선 그대로 붙여 넣고 동작 확인.

### 2) 단계 B — GitHub Actions로 원격 DB 마이그레이션

이 저장소에는 이미 `.github/workflows/db-migrate.yml` 이 들어 있어, `production` environment에 secret을 등록하면 `main` push 시 자동으로 원격 DB 마이그레이션이 적용됩니다.

**B-1. `production` environment + secret 등록**

1. GitHub repo → **Settings → Environments → New environment** → 이름 `production`.
2. 그 환경에서 **Add secret** 클릭.
3. Name: `PRODUCTION_DATABASE_URL`.
4. Value: 단계 A에서 얻은 **port 5432** 문자열 (Session pooler 또는 Direct).
5. (선택) 같은 environment에 **Required reviewers**를 걸면 프로덕션 마이그레이션을 승인제로 돌릴 수 있습니다.

**B-2. 워크플로우 실행 트리거**

`db-migrate.yml`은 `drizzle/**`, `lib/db/schema.ts` 등이 변경된 push에서만 자동 실행됩니다. 첫 배포 때는 코드 변경 없이 secret만 등록한 상태이므로 **수동 트리거**가 필요할 수 있습니다.

옵션 1 — Actions 탭에서 수동 실행: repo → Actions 탭 → **db-migrate** → **Run workflow** 버튼 (워크플로우에 `workflow_dispatch`가 등록돼 있으면 보임).

옵션 2 — 빈 커밋으로 트리거 (가장 확실):

```bash
git commit --allow-empty -m "chore: 원격 DB 마이그레이션 트리거"
git push origin main
gh run watch        # 실행 중인 워크플로우를 실시간 관찰
```

> 빈 커밋은 paths 필터를 통과하지 않을 수 있습니다. 통과하지 않으면 `drizzle/meta/_journal.json`에 줄 끝 공백 같은 무해한 변경을 줘서 커밋하거나, 워크플로우에 `workflow_dispatch:`를 추가해 옵션 1을 쓰세요.

**B-3. 결과 확인**

- repo → Actions 탭 → 가장 최근 **db-migrate** 실행 결과 초록 체크.
- Supabase Dashboard → **Table editor** 에서 `tasks` 테이블과 컬럼 (`id`, `parent_id`, `title`, `status`, `progress`, `start_date`, `due_date` 등)이 보이면 OK.

### 3) 단계 C — Vercel에 배포 (Dashboard import)

1. https://vercel.com 로그인 → **Add New → Project**.
2. 좌측 GitHub repo 목록에서 이 저장소 선택 → **Import**.
3. Framework preset이 자동으로 **Next.js**로 잡혀 있는지 확인 (그대로 둠).
4. **Environment Variables** 섹션 펼치기:
   - Name: `DATABASE_URL`
   - Value: 단계 A에서 얻은 **port 6543 Transaction pooler** 문자열
   - Environment: **Production**만 체크 (Preview/Development는 추후 별도 DB가 필요해질 때 채움)
5. **Deploy** 클릭 → 빌드 로그를 끝까지 봅니다 (~2분).
6. 성공 시 `https://<프로젝트명>-<해시>.vercel.app` 형태의 공개 URL이 나옵니다.

이후로는 `main` 브랜치에 push할 때마다 Vercel이 자동으로 재배포합니다.

> **CLI를 선호한다면**: `vercel login` → `vercel link` → `vercel env add DATABASE_URL production` → `vercel --prod` 로도 동일한 결과가 나옵니다.

### 4) 단계 D — 배포 검증

브라우저로 공개 URL을 열고 아래를 차례로 확인합니다:

- [ ] 페이지가 500 없이 로드되고, 빈 Task 목록이 보인다.
- [ ] "새 Task" 버튼으로 Task 생성 → 목록에 즉시 반영.
- [ ] 상태 토글 (`todo` → `doing` → `done`).
- [ ] 자식 Task 추가로 계층이 정상 표시.
- [ ] CSV import (구현돼 있다면) 정상 동작.
- [ ] Gantt 뷰가 정상 렌더 (오늘 달 기준 5개월).
- [ ] 새로고침 후에도 데이터가 그대로 → DB에 저장됐다는 증거.
- [ ] Supabase Dashboard → Table editor → `tasks` 행이 늘어나는 게 보임.

`USER_JOURNEY.md`의 J1·J2·J5 정도를 수동 회귀로 더 돌려도 좋습니다.

### 5) 배포 단계 흔한 실패 & 처방

| 증상 | 원인 | 처방 |
|---|---|---|
| Vercel 빌드는 성공, 페이지가 500 | `DATABASE_URL`이 Production 스코프에 없거나 오타 | Vercel → Settings → Environment Variables 재확인 |
| 페이지 로드 시 `prepared statement "s1" already exists` | 런타임에 port 5432 connection을 사용 중 | Vercel `DATABASE_URL`을 **6543 Transaction pooler**로 교체 후 재배포 |
| GitHub Actions에서 같은 prepared statement 오류 | 마이그레이션을 6543 connection으로 시도 | `PRODUCTION_DATABASE_URL` secret을 **5432**(Session/Direct)로 교체 |
| 런타임에서 `Too many connections` | Vercel이 Direct connection(5432) 문자열을 사용 중 | Vercel `DATABASE_URL`을 Transaction pooler(6543)로 교체 |
| Action 통과, 그러나 Vercel 페이지에 데이터가 안 들어감 | 두 환경이 서로 다른 Supabase 프로젝트를 가리킴 | 두 connection string의 project ref(`db.xxxxxx.supabase.co`)가 동일한지 확인 |
| Action 로그에 `permission denied` 또는 `password authentication failed` | 비밀번호 자리표시자 `[YOUR-PASSWORD]`가 그대로 들어감 | 단계 A에서 만든 비밀번호로 치환 |
| Action에서 `Secret not found` | secret이 repo 레벨에 있고 workflow는 `environment: production`을 요구 | Settings → Environments → `production`에 secret을 다시 등록 |
| Vercel 빌드에서 의존성 오류 | (드뭄) lockfile 동기화 안 됨 | `npm install` 후 `package-lock.json` 커밋·push, 재배포 |

### 6) 이후 변경 흐름

스키마를 바꿔야 할 때:

1. `lib/db/schema.ts` 수정
2. `npm run db:generate` → 새 마이그레이션 파일 커밋
3. `npm run db:migrate`로 로컬 확인
4. `git push origin main` → GitHub Actions가 **프로덕션**에 자동 적용
5. Vercel은 같은 push로 앱 코드를 자동 재배포

**사람이 원격 DB에 직접 `drizzle-kit migrate`를 쏘지 않습니다.**

---

## 트러블슈팅

| 증상 | 원인 후보 | 해결 |
|---|---|---|
| `supabase start`가 실패 | Docker Desktop 꺼짐 | Docker 실행 후 재시도 |
| `supabase start` 포트 충돌 | 54321/54322/54323 포트 사용 중 | 점유 중인 프로세스 종료 또는 `supabase stop` 후 재시작 |
| Vercel 배포는 되는데 500 | 환경변수 누락 | Vercel 대시보드 → Settings → Environment Variables 확인 |
| 배포된 사이트가 로컬 DB를 찾으려 함 | Vercel 환경변수에 로컬 URL이 들어감 | 원격 Supabase URL/키로 교체 후 재배포 |
| Actions의 `db-migrate`가 `prepared statement "s1" already exists` 같은 에러로 실패 | Transaction pooler(6543) URL을 `PRODUCTION_DATABASE_URL`에 넣음 | Session/Direct URL(port 5432)로 교체 |
| Actions의 `db-migrate`가 Secret not found로 실패 | secret이 repo 레벨에 있고 workflow는 `environment: production`을 요구 | `Settings → Environments → production`에 secret을 다시 등록 |
| 런타임에서 `Too many connections` | Vercel이 Direct connection 문자열을 사용 | Vercel `DATABASE_URL`을 Transaction pooler(port 6543)로 교체 |
| `drizzle-kit generate` 결과가 비어 있음 | `lib/db/schema.ts` 변경 없음 또는 config의 `schema` 경로가 틀림 | `drizzle.config.ts`의 `schema` 경로 확인 |

---

## 라이선스

교육 과제용 템플릿 — 자유롭게 복제·변경해서 사용하세요.
