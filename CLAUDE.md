# CLAUDE.md

이 문서는 **Claude Code 에이전트**가 이 저장소에서 작업할 때 반드시 따라야 하는 프로젝트 지침이다. 수강생(사용자)을 위한 안내는 `README.md`에 있다.

## 1. 프로젝트 목적

교육용 WBS(Work Breakdown Structure) 과제. 수강생(코드 초심자)이 **스스로 타이핑하지 않고 Claude Code에게 지시**해서, Next.js 기반 WBS 앱을 만들고 로컬 Supabase(Docker)로 개발한 뒤 Vercel + 원격 Supabase로 배포해 공개 URL을 획득하는 것이 목표다.

이 구조상 Claude의 역할은 단순히 코드를 빠르게 만들어 주는 것이 아니라, **수강생이 각 단계를 이해할 수 있도록 결과를 설명하는 것**이다. 따라서:

- 한 번의 응답에 너무 많은 파일을 동시에 생성·수정하지 않는다. 가급적 **GitHub Issue 하나 = 커밋 하나** 단위로 쪼갠다.
- 변경을 적용하기 전에 의도를 한국어 한두 문장으로 먼저 설명한다.
- 수강생에게 "왜 이 파일을 건드렸는지"가 보이도록 한다.

## 1-A. 첫 프롬프트 시작 규약 (반드시 따를 것)

수강생이 이 저장소를 **클론한 뒤 처음 말을 걸어왔을 때**(= 대화 세션에서 아직 아무 작업도 하지 않은 상태), Claude는 수강생의 요구가 무엇이든 간에 먼저 본인이 해야 할 일을 시작하기 **전에** 아래 2-스텝 체크를 제안하고 각 단계에서 승인을 받는다.

> "이 세션이 처음인가?"를 판단하는 단서: 대화 초반이며 아직 `supabase status`/`npm run dev`/`ls` 등 저장소 상태 확인 결과가 없음.

### 스텝 1 — 환경 점검

필수 도구가 설치됐는지 빠르게 확인한다. Bash로 **한 번에 병렬** 실행:

- `docker info` (데몬 기동까지 확인)
- `supabase --version`
- `node -v`

결과 요약을 한두 줄로 보여주고 판단:

- **모두 ✅** → 곧바로 스텝 2로 진행("환경은 이미 준비되어 있네요. 로컬 서버를 띄워 볼까요?").
- **하나라도 ❌/⚠️** → "일부 도구가 준비되지 않았습니다. `/setup-dev-environment` 스킬을 실행해서 설치·로그인 가이드를 받아볼까요?"라고 물어보고 승인되면 해당 스킬을 호출. 완료 후 다시 스텝 2로.

### 스텝 2 — 로컬 개발 서버 기동 제안

환경 준비가 끝나면, 수강생의 본 요청으로 뛰어들기 전에 한 번 더 확인:

> "다음으로 로컬 개발 서버(Supabase 로컬 컨테이너 + Next.js)를 기동할까요? 이 프로젝트의 `/dev-server` 스킬이 다 해줍니다. 지금 실행할까요 / 나중에 할까요?"

- 승인 → `/dev-server` 스킬 호출. 완료 후 "이제 원래 요청하신 작업을 이어서 진행할게요"라고 말하고 본 요청으로 돌아감.
- 거절 / "나중에" → 그대로 본 요청으로 진행.

### 예외

- 수강생의 **첫 메시지 자체가 환경/실행과 무관한 문서 질문**(예: "README 한 줄 고쳐줘", "이 저장소가 뭐야?")이면 위 스텝을 **건너뛰고** 바로 답한다.
- 수강생이 위 스텝을 명시적으로 건너뛰라고 하면("셋업은 됐어", "바로 시작해") 따른다.

이 규약은 "수강생이 막힌 환경으로 과제를 시작했다가 30분째 설정만 하고 있는 상황"을 방지하기 위한 것이다. 이후 세션에서는 반복할 필요 없다(세션 초반 한 번만).

## 1-B. 제품 스펙 · 사용자 여정 문서 (중요)

이 저장소에는 제품 요구사항을 **사용자 관점에서** 정의한 두 문서가 있다. 기능을 구현하거나 바꿀 때 **항상 이 두 문서를 근거로** 움직인다.

| 파일 | 역할 | 특징 |
|---|---|---|
| `SPEC.md` | **제품 스펙의 단일 진실 원천.** 각 페이지에서 사용자가 무엇을 할 수 있고 무엇을 기대하는가. | 기술 용어·구현 상세(스키마·컴포넌트 이름 등)는 담지 않는다. |
| `USER_JOURNEY.md` | `SPEC.md`의 기능을 Given/When/Then 시나리오로 풀어둔 문서. 테스트·수동 검증의 근거. | 시나리오 ID(J1, J2, …)는 재사용·재부여하지 않는다. |

### Claude의 행동 규칙

1. **기능 구현·변경 요청이 들어오면 먼저 `SPEC.md`를 읽는다.**
   - 요청이 이미 정의돼 있으면 그대로 따른다 (임의 재해석 금지).
   - 요청이 정의와 **충돌**하면 구현을 멈추고 "`SPEC.md`와 다른 부분이 있습니다. 문서를 업데이트할까요, 아니면 기존 정의를 따를까요?"로 확인.
   - 요청이 아예 정의돼 있지 **않으면** "`SPEC.md`에 먼저 항목을 추가한 뒤 구현할까요?"로 확인.

2. **테스트·자동화 검증을 쓸 때는 `USER_JOURNEY.md`의 시나리오를 출발점**으로 삼는다.
   - 시나리오에 대응하는 테스트가 없으면 먼저 테스트를 추가.
   - 대응 시나리오가 없는 케이스는 `USER_JOURNEY.md`에 시나리오를 먼저 정의하고, 그 뒤에 테스트를 쓴다.

3. **Playwright MCP로 수동 검증**할 때는 `USER_JOURNEY.md` 하단의 "수동 회귀 체크리스트"를 기본 실행 순서로 사용한다. 체크 결과를 사용자에게 보고할 때 시나리오 ID(예: "J13 통과, J15 실패 — 간트에 Overdue 빗금이 없음")로 지칭한다.

4. **두 문서는 모두 한국어 자연어로 유지**한다. SQL·필드명·컴포넌트 이름·프레임워크 API 등 구현 어휘는 `SPEC.md`/`USER_JOURNEY.md`에 들어가지 않는다. 그런 어휘가 필요하면 이 `CLAUDE.md` 또는 코드 주석으로 간다.

5. `SPEC.md`의 **"9. 범위 밖"** 섹션은 §10 금기사항의 "과제 범위 밖 기능" 기준으로 작동한다. 범위 밖 항목을 범위 안으로 옮기려면 `SPEC.md`부터 수정.

## 2. 기술 스택 (고정)

**대체 금지.** 아래 스택에서 벗어나려면 반드시 사용자에게 먼저 물어본다.

- **Next.js 14+ (App Router, TypeScript) — 풀스택 프레임워크로 사용**
  - 이 프로젝트에는 **별도의 백엔드 서버가 없다.** Next.js 하나가 프론트엔드(React Server/Client Components)와 백엔드(Route Handlers `app/api/**/route.ts`, Server Actions)를 모두 담당하고, Vercel에 단일 배포 단위로 올라간다.
  - Express · Fastify · NestJS 같은 별도 Node 서버를 세우지 않는다. DB 쿼리(Drizzle), 비즈니스 로직, 외부 API 호출은 **Server Component 또는 Server Action, Route Handler 안에서** 수행한다.
  - 클라이언트 컴포넌트에서 DB에 직접 접근하지 않는다 — 반드시 서버 측 경계를 경유.
- Supabase (로컬: Docker, 원격: Cloud) — DB · Auth · RLS · Storage · Realtime
- **Drizzle ORM** — Postgres용 타입 안전 쿼리 레이어
- **Chakra UI v3** — UI 컴포넌트 (Tailwind · shadcn/ui · MUI 등 다른 UI 라이브러리 혼용 금지)
- Node.js 20+
- Package manager: **npm** (pnpm · yarn · bun 혼용 금지)
- 배포: Vercel

### 역할 분리 원칙

- **Drizzle ORM**이 스키마·마이그레이션의 **단일 진실 원천(single source of truth)**이다. 스키마는 `lib/db/schema.ts`에 TypeScript DSL로 정의하고, 마이그레이션 SQL은 `drizzle-kit generate`가 생성한 `drizzle/` 폴더의 파일을 git에 커밋해 버전 관리한다.
- **Supabase CLI**는 이 프로젝트에서 **로컬 Postgres 컨테이너를 띄우는 용도로만** 쓴다(`supabase start`/`stop`/`status`). `supabase migration new`, `supabase db push`, `supabase db reset`은 **사용하지 않는다**.
  - 로컬 DB를 초기 상태로 되돌리는 절차: `supabase stop` → `supabase start` → `npm run db:migrate`. (`supabase db reset` 금지 — Supabase 자체 마이그레이션 폴더를 쓰지 않기 때문.)
- **원격(프로덕션) 마이그레이션 적용은 GitHub Actions**가 담당한다(`main` 브랜치 push → `.github/workflows/db-migrate.yml`이 `drizzle-kit migrate` 실행). 사람이 로컬에서 원격 DB에 직접 마이그레이션을 쏘지 않는다.

## 3. 데이터 모델 (권위 있는 정의)

MVP 범위에서 `tasks` 테이블만 정의한다. 스키마는 **Drizzle TypeScript DSL이 원본**이며, 아래 형태로 `lib/db/schema.ts`에 둔다.

```ts
import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  check,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id').references((): AnyPgColumn => tasks.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    assignee: text('assignee'),
    status: text('status').notNull().default('todo'),   // 'todo' | 'doing' | 'done'
    progress: integer('progress').notNull().default(0),  // 0~100
    startDate: date('start_date'),
    dueDate: date('due_date'),                           // 각 Task의 목표 기한. 과제 제출 데드라인이 아님.
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusCheck: check('tasks_status_check', sql`${t.status} in ('todo','doing','done')`),
    progressCheck: check('tasks_progress_check', sql`${t.progress} between 0 and 100`),
  })
);
```

`parentId`의 self-reference에 `AnyPgColumn`을 쓰는 이유: 자기 참조 FK는 `tasks` 식별자가 정의 도중 자기 자신을 참조해야 해서 TypeScript가 추론을 미루게 만들어야 한다. `any`는 ESLint `@typescript-eslint/no-explicit-any` 규칙을 어기므로, Drizzle이 공식 제공하는 `AnyPgColumn` 타입을 사용한다.

- 스키마 변경은 이 파일만 수정한다. 수동으로 SQL을 작성해 `drizzle/` 폴더에 넣지 말 것 — 반드시 `drizzle-kit generate`가 만든 파일만 커밋한다.
- **MVP 단계에서 RLS는 사용하지 않는다.** (단일 사용자 가정) 기능 요구사항이 바뀌어 RLS가 필요해지면 사용자에게 먼저 확인한다.
- `due_date`/`dueDate` 이름을 다른 것(`deadline`, `target_date` 등)으로 바꾸지 말 것.

## 4. 디렉토리 컨벤션

| 경로 | 용도 |
|---|---|
| `app/` | Next.js App Router 엔트리 |
| `components/` | Chakra UI 기반 React 컴포넌트 |
| `lib/supabase/` | Supabase client · server 모듈 분리 |
| `lib/db/` | Drizzle: `schema.ts`(사람이 편집하는 원본), `index.ts`(DB 클라이언트) |
| `drizzle/` | `drizzle-kit generate`가 만드는 마이그레이션 SQL 파일 — **반드시 git에 커밋**. 사람이 손으로 편집하지 않음 |
| `supabase/` | Supabase CLI가 생성(`config.toml` 등). 로컬 Postgres 컨테이너 설정만 담기며, `migrations/` 폴더는 **사용하지 않는다** |
| `.github/workflows/` | `db-migrate.yml` 등 CI/CD. 프로덕션 마이그레이션은 여기서만 실행 |

- 파일명: kebab-case (`task-row.tsx`)
- React 컴포넌트명: PascalCase (`TaskRow`)
- 훅: `useXxx.ts`

## 5. 환경변수

클라이언트에서 쓰는 값은 `NEXT_PUBLIC_*` 접두사를 달고, 그렇지 않은 값은 절대 붙이지 않는다.

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase REST/Auth 엔드포인트
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon 키
- `DATABASE_URL` — **Drizzle 런타임 쿼리용** Postgres 접속 문자열

### ⚠️ DATABASE_URL 종류 주의

Supabase는 한 DB에 대해 여러 연결 문자열을 제공한다. 용도가 다르므로 섞어 쓰면 안 된다.

| 용도 | 어떤 연결을 쓰나 | 환경 |
|---|---|---|
| 로컬 개발 | `supabase status` 출력의 `DB URL` (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`) | `.env.local` |
| **마이그레이션** (`drizzle-kit migrate`) | Supabase Dashboard → Settings → Database → **Direct connection** (port 5432, IPv6 또는 IPv4 add-on) 또는 **Session pooler** (port 5432) | GitHub Actions secret `PRODUCTION_DATABASE_URL` |
| 런타임 쿼리 (Vercel 서버리스) | **Transaction pooler** (port 6543) | Vercel env `DATABASE_URL` |

Transaction pooler(6543)로 `drizzle-kit migrate`를 돌리면 prepared statement 충돌로 실패한다. 마이그레이션 연결과 런타임 연결을 반드시 분리한다.

로컬 Supabase의 `DB URL`·`API URL`·`anon key`는 `supabase status`로 확인한다.

## 6. 개발 워크플로우

자주 쓰는 명령 (`package.json` 스크립트 이름은 아래 규칙으로 통일):

```bash
supabase start                  # 로컬 Postgres/Studio 컨테이너 기동 (Supabase CLI의 유일한 용도)
supabase stop                   # 로컬 컨테이너 정지
supabase status                 # 로컬 접속 정보 확인

npm run db:generate             # drizzle-kit generate — 스키마 diff로 SQL 마이그레이션 생성
npm run db:migrate              # drizzle-kit migrate  — DATABASE_URL 대상으로 pending 마이그레이션 적용
npm run db:studio               # drizzle-kit studio   — 로컬 DB 브라우저 (선택)

npm run dev                     # Next.js 개발 서버
npm run build && npm run lint   # 검증
```

### 스키마 변경 순서 (반드시 이 순서)

1. `lib/db/schema.ts` 를 수정.
2. `npm run db:generate` → `drizzle/` 폴더에 SQL 마이그레이션 파일이 생성됨.
3. 생성된 SQL을 **눈으로 리뷰**. 의도와 다르면 스키마를 고쳐 재생성.
4. `npm run db:migrate` → 로컬 DB(`DATABASE_URL`=`.env.local`의 로컬 값)에 적용.
5. 앱 코드의 타입 오류를 고치고 기능 검증.
6. `lib/db/schema.ts` + `drizzle/*.sql` + `drizzle/meta/*` 를 **한 커밋으로** 묶어서 푸시.

프로덕션 DB는 **사람이 직접 migrate하지 않는다.** `main` 브랜치에 푸시되면 `.github/workflows/db-migrate.yml`이 `PRODUCTION_DATABASE_URL` secret으로 `drizzle-kit migrate`를 실행한다.

### `drizzle.config.ts` 규약

Claude가 Drizzle 부트스트랩을 할 때 반드시 아래 구조를 유지한다.

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
});
```

## 7. 배포 체크리스트

배포 전에 반드시 확인:

- [ ] 원격 Supabase 프로젝트가 생성됨
- [ ] GitHub 저장소 **Settings → Secrets and variables → Actions**의 `production` environment에 `PRODUCTION_DATABASE_URL` (Supabase Direct 또는 Session pooler, **port 5432**)이 등록됨
- [ ] `main` 브랜치 푸시 후 `db-migrate` 워크플로우가 성공 (Actions 탭에서 초록 체크 확인)
- [ ] Vercel 프로젝트 환경변수 (**Production** 스코프)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `DATABASE_URL` — **Transaction pooler**(port 6543) 문자열
- [ ] `vercel --prod` 배포 성공 후 URL 접속 시 Task 목록 로드 확인

## 8. MCP 사용 지침

이 저장소의 `.mcp.json`에는 세 MCP가 등록돼 있다. 상황별로 이렇게 쓴다.

- `context7` — Next.js / Supabase / Drizzle API가 애매하거나 버전 차이가 의심되면 먼저 질의. 추측보다 문서 인용 우선.
- `chakra-ui` — Chakra UI 컴포넌트 이름·prop·theming이 필요할 때. Chakra v3 기준이라는 점을 기억할 것(v2와 API가 다름).
- `playwright` — 로컬/배포 환경의 실제 브라우저 검증. 예: "배포된 URL에서 Task 하나 만들고 목록에 뜨는지 확인".

## 9. 커밋·작업 스타일

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- 한 커밋 = 한 논리 단위. Issue 번호가 있으면 `feat: #3 Task 생성 모달` 처럼 참조.
- 주석은 **꼭 필요할 때만**. 코드로 드러나지 않는 "왜"만 남기고, "무엇을 하는지"는 쓰지 않는다.
- 수강생과의 대화는 **한국어**.

## 10. 금기사항 (Do NOT)

- ❌ service role key를 클라이언트(브라우저에 번들되는) 코드에 쓰지 않는다.
- ❌ `.env.local`, `.env`, `supabase/.temp/` 를 커밋하지 않는다.
- ❌ **원격** Supabase DB에 로컬에서 직접 `drizzle-kit migrate`를 쏘지 않는다 — 반드시 GitHub Actions 경유.
- ❌ Supabase SQL Editor / 대시보드에서 스키마를 직접 손대지 않는다 — 모든 변경은 `lib/db/schema.ts` → generate → migrate.
- ❌ `drizzle-kit push`는 사용하지 않는다 — 마이그레이션 파일을 건너뛰면 버전 관리가 깨진다. 항상 `generate` + `migrate` 조합.
- ❌ `supabase migration new`, `supabase db push`, `supabase db reset` 을 사용하지 않는다 — Supabase CLI는 로컬 컨테이너 기동 용도로만.
- ❌ Transaction pooler(6543) 문자열로 마이그레이션을 실행하지 않는다 (prepared statement 실패). 마이그레이션은 Direct 또는 Session pooler(5432).
- ❌ UI 라이브러리를 섞지 않는다(Chakra UI v3만). Tailwind 클래스, shadcn 컴포넌트 등을 끌어오지 않는다.
- ❌ `SPEC.md`의 **"9. 범위 밖"** 에 적힌 기능(다중 사용자, Task 의존성/선후행, 크리티컬 패스, 간트 드래그 편집, 실시간 알림 등)을 사용자에게 확인 없이 추가하지 않는다. 범위 변경이 필요하면 `SPEC.md`를 먼저 고친다.
- ❌ 별도 백엔드 서버(Express/Fastify/NestJS 등)를 세우지 않는다. 서버 로직은 Next.js Route Handler / Server Action 안에.

## 11. 저장소 파일 인덱스 (빠른 참조)

### 문서

| 파일 | 대상 독자 | 요약 |
|---|---|---|
| `README.md` | 수강생 | 과제 안내 + 실습 가이드 + 배포 절차 |
| `SPEC.md` | 모두 | 사용자 관점 기능 스펙 (UX의 단일 원천) |
| `USER_JOURNEY.md` | 테스터 / Claude | Given/When/Then 시나리오 — 테스트·수동 검증 근거 |
| `CLAUDE.md` (이 파일) | Claude Code | 스택 · 워크플로우 · 금기사항 |

### 내장 슬래시 스킬 (`.claude/skills/`)

| 슬래시 명령 | 언제 사용 |
|---|---|
| `/setup-dev-environment` | 로컬 의존성 진단 + 설치/가입/로그인 가이드 |
| `/dev-server` | Supabase 컨테이너 + Next.js 개발 서버 기동 |

### 프로젝트 MCP (`.mcp.json`)

- `context7` — Next.js/Supabase/Drizzle 라이브러리 최신 문서 인용
- `chakra-ui` — Chakra UI v3 컴포넌트 API 참조
- `playwright` — 브라우저 검증(배포 URL 확인 · USER_JOURNEY 시나리오 수동 회귀)

### CI/CD (`.github/workflows/`)

- `db-migrate.yml` — `main` 브랜치 push 시 `drizzle-kit migrate`를 `PRODUCTION_DATABASE_URL`에 실행
