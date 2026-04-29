# PRD: WBS Task MCP 서버 (이슈 #24)

## 1. Introduction / Overview

현재 WBS 앱은 사람이 브라우저에서 클릭해야만 쓸 수 있다. 이 PRD는 그 위에 **Streamable HTTP MCP(Model Context Protocol) 엔드포인트**를 한 겹 얹어, Claude Code · Cursor · MCP Inspector 같은 임의의 AI 에이전트가 동일한 Vercel 배포 URL을 통해 Task를 직접 읽고 쓸 수 있도록 만든다.

결과물: `app/api/mcp/route.ts` 가 MCP 서버 엔드포인트가 되고, 5개 tool(`list_tasks`, `get_task`, `create_task`, `update_task`, `delete_task`)을 통해 기존 Drizzle 데이터 모델(`tasks` 테이블)을 노출한다.

원본 이슈: https://github.com/bubjong/claude-vercel-wbs/issues/24

## 2. Goals

- 기존 5개 Task 조작(목록/단건/생성/수정/삭제)을 MCP tool로 노출한다.
- 진행률 100 → 상태 `done` 자동 동기화(SPEC.md §3 C-2)가 MCP 경로에서도 그대로 강제되도록 한다.
- 핵심 데이터 접근 로직은 **기존 Server Action을 재사용**해 UI와 MCP가 같은 비즈니스 규칙을 공유하게 한다.
- 안전핀(`MCP_PUBLIC_ENABLED`)으로 의도치 않은 노출을 막는다.
- 로컬 dev 서버(`npm run dev`)에서 MCP Inspector로 5개 tool 모두 호출되는 것을 자동화 테스트로 보장한다.

## 3. User Stories

### US-001: 의존성 추가 및 공용 검증 헬퍼 점검
**Description:** 개발자로서, MCP SDK와 zod를 설치하고 기존 Server Action이 MCP 핸들러에서 그대로 import되어 호출될 수 있는 상태인지 확인하고 싶다. (`'use server'` 파일은 서버 측에서 일반 함수처럼 호출 가능)

**Acceptance Criteria:**
- [ ] `package.json` 에 `@modelcontextprotocol/sdk` 와 `zod` 가 dependencies로 추가됨
- [ ] `npm install` 후 lock 파일이 갱신됨
- [ ] `lib/actions/tasks.ts` 의 `createTask` / `updateTask` / `deleteTask` 가 서버 사이드 모듈에서 import 가능함을 확인 (TypeScript 컴파일 통과)
- [ ] 기존 검증 헬퍼(`lib/db/validation.ts` 의 `autoSyncStatusByProgress`, `isValidDateRange`) 위치/시그니처 변경 없음
- [ ] 타입체크/린트 통과 (`npm run lint && npx tsc --noEmit`)

### US-002: MCP 서버 팩토리 및 zod 스키마 정의
**Description:** 개발자로서, 매 요청마다 `McpServer` 인스턴스를 만들 수 있는 팩토리 함수를 두고, 5개 tool의 입력 스키마를 한 곳에서 zod로 선언하고 싶다.

**Acceptance Criteria:**
- [ ] `lib/mcp/server.ts` 생성 — `createMcpServer()` 함수를 export
- [ ] 함수는 `McpServer` 인스턴스를 만들고 5개 tool을 등록한 뒤 반환
- [ ] tool 핸들러 본체는 `lib/mcp/tools/tasks.ts` 에서 import (이 단계에서는 stub: 빈 응답 또는 `not implemented` 메시지 반환 가능)
- [ ] 입력 스키마(zod):
  - `list_tasks`: 입력 없음
  - `get_task`: `{ id: string (uuid) }`
  - `create_task`: `{ title: string, description?, assignee?, status?: 'todo'|'doing'|'done', progress?: number(0~100), startDate?: string('YYYY-MM-DD'), dueDate?: string('YYYY-MM-DD'), parentId?: string(uuid) }`
  - `update_task`: `{ id: string(uuid), title?, description?: string|null, assignee?: string|null, status?, progress?, startDate?: string|null, dueDate?: string|null }`
  - `delete_task`: `{ id: string(uuid) }`
- [ ] 서버 메타데이터에 `name`/`version` 명시 (예: `name: 'wbs-tasks-mcp'`, `version: '1.0.0'`)
- [ ] 타입체크/린트 통과

### US-003: 읽기 tool 구현 (`list_tasks`, `get_task`)
**Description:** 에이전트 사용자로서, 모든 Task를 평면 배열로 받거나 ID로 단건 조회하고 싶다.

**Acceptance Criteria:**
- [ ] `lib/mcp/tools/tasks.ts` 에 `listTasks` / `getTask` 핸들러 구현
- [ ] `list_tasks` 는 `tasks` 테이블 전체를 `createdAt` 오름차순으로 반환
- [ ] `get_task` 는 ID에 해당하는 단건을 반환, 존재하지 않으면 MCP 에러 응답 (텍스트: `Task not found`)
- [ ] 응답 본문은 MCP `content` 배열 안에 JSON.stringify 된 텍스트 블록으로 (`type: 'text'`)
- [ ] 직접 Drizzle `db.select()` 로 조회 — 새 쿼리 레이어 만들지 않음
- [ ] 타입체크/린트 통과

### US-004: 쓰기 tool 구현 (`create_task`, `update_task`, `delete_task`)
**Description:** 에이전트 사용자로서, MCP를 통해 Task를 생성·수정·삭제하고 싶다. 단, UI에서 보장하는 검증과 자동 동기화가 그대로 적용돼야 한다.

**Acceptance Criteria:**
- [ ] `lib/mcp/tools/tasks.ts` 에 `createTaskTool` / `updateTaskTool` / `deleteTaskTool` 핸들러 구현
- [ ] 각 핸들러는 `lib/actions/tasks.ts` 의 기존 Server Action(`createTask`/`updateTask`/`deleteTask`)을 그대로 호출
- [ ] Server Action이 `{ ok: false, error }` 를 반환하면 MCP 에러 응답으로 변환 (텍스트: 한국어 에러 문구)
- [ ] `update_task` 호출 시 `progress: 100` 을 보내면 응답에서 해당 Task의 `status` 가 `'done'` 으로 자동 변경된 상태로 조회됨 (Server Action의 `applyAutoSync` 가 처리)
- [ ] `delete_task` 호출 시 자식 행은 DB FK `on delete cascade` 로 함께 삭제됨 — 추가 로직 작성 금지
- [ ] 응답 본문은 변경된/생성된 Task 또는 `{ ok: true, id }` 를 JSON 텍스트 블록으로 반환
- [ ] 타입체크/린트 통과

### US-005: Streamable HTTP 라우트 핸들러 (`app/api/mcp/route.ts`)
**Description:** 개발자로서, Next.js Route Handler에서 `StreamableHTTPServerTransport` 를 통해 MCP 요청을 처리하고 싶다.

**Acceptance Criteria:**
- [ ] `app/api/mcp/route.ts` 신규 생성 — `POST` / `GET` / `DELETE` 핸들러 export
- [ ] 매 요청마다 `createMcpServer()` 와 `StreamableHTTPServerTransport` 를 생성해 연결 (stateless 모드)
- [ ] 서버의 `initialize` 응답 `protocolVersion` 이 **`2025-11-25`** 로 협상됨
- [ ] 클라이언트가 `MCP-Protocol-Version` 헤더를 보내지 않으면 사양대로 `2025-03-26` 폴백 (SDK 기본 동작 그대로 두면 됨 — 추가 코드 불필요)
- [ ] 지원하지 않는 `protocolVersion` 은 HTTP 400 으로 거절 (SDK 기본 동작)
- [ ] Route Handler는 `runtime = 'nodejs'` 명시 (Edge runtime 사용 금지 — Drizzle/postgres 호환성)
- [ ] 타입체크/린트 통과

### US-006: 안전핀 — `MCP_PUBLIC_ENABLED` 환경변수 가드
**Description:** 운영자로서, 환경변수가 켜져 있을 때만 MCP 라우트가 응답하도록 해서, 배포 직후 의도치 않은 노출을 막고 싶다.

**Acceptance Criteria:**
- [ ] `app/api/mcp/route.ts` 에서 `process.env.MCP_PUBLIC_ENABLED !== '1'` 이면 `HTTP 404` 반환 (POST/GET/DELETE 모두)
- [ ] 404 응답 본문은 빈 문자열 또는 `{ "error": "MCP endpoint disabled" }` 짧은 JSON
- [ ] `.env.local.example` 에 `MCP_PUBLIC_ENABLED=1` 항목 추가 (없으면 신규 생성)
- [ ] README의 "MCP로 호출하기" 섹션에 환경변수 ON/OFF 설명 포함 (US-009)
- [ ] 타입체크/린트 통과

### US-007: Playwright e2e — MCP 라우트 통합 테스트
**Description:** 개발자로서, MCP 엔드포인트가 5개 tool을 노출하고 핵심 시나리오(생성 → 수정 → 진행률 100 자동 동기화 → 삭제)가 동작함을 자동화로 보장하고 싶다.

**Acceptance Criteria:**
- [ ] `tests/mcp.spec.ts` (또는 동등 위치) 신규 생성 — Playwright `test.describe('MCP /api/mcp', ...)` 안에 fetch 기반 테스트
- [ ] 브라우저 페이지를 띄우지 않고 `request` fixture로 직접 POST를 보냄 (UI 테스트 아님)
- [ ] 테스트 실행 전 `MCP_PUBLIC_ENABLED=1` 이 설정된 dev 서버 가정 (Playwright config에서 env 주입 또는 `webServer` 설정 활용)
- [ ] 시나리오:
  1. `tools/list` 응답에 5개 tool 이름이 모두 포함됨
  2. `create_task` 로 `{ title: 'mcp-test' }` 생성 → 반환된 ID로 `get_task` 조회 시 동일 row 확인
  3. `update_task` 로 `{ progress: 100 }` 업데이트 → 후속 `get_task` 조회 시 `status === 'done'` 확인
  4. `delete_task` 로 삭제 → 후속 `get_task` 조회 시 not-found 에러 확인
- [ ] 테스트 후 잔여 데이터가 남지 않도록 정리 (afterEach 또는 시나리오 마지막 단계의 delete 로 충분하면 그대로)
- [ ] `npm run test:e2e -- mcp.spec.ts` 통과

### US-008: `.mcp.json` 로컬 dev 항목 추가
**Description:** 수강생으로서, 로컬에서 띄운 MCP 서버를 Claude Code가 감지할 수 있도록 `.mcp.json` 에 항목을 추가하고 싶다.

**Acceptance Criteria:**
- [ ] `.mcp.json` 의 `mcpServers` 에 `wbs-local` (이름 고정) 항목 추가
- [ ] 항목은 Streamable HTTP 형태로 `http://localhost:3000/api/mcp` 를 가리킴
- [ ] 기존 `context7` / `playwright` / `chakra-ui` 항목은 변경하지 않음
- [ ] JSON 유효성 통과 (`node -e "JSON.parse(require('fs').readFileSync('.mcp.json'))"` 무에러)

### US-009: README "MCP로 호출하기" 섹션 + 5개 tool 스펙 표
**Description:** 수강생으로서, MCP Inspector로 어떻게 호출하는지, 각 tool의 입출력이 무엇인지 한눈에 보고 싶다.

**Acceptance Criteria:**
- [ ] `README.md` 하단(배포 섹션 이후)에 `## MCP로 호출하기` 섹션 추가
- [ ] 섹션은 다음 4개 하위 항목 포함:
  1. **활성화** — `MCP_PUBLIC_ENABLED=1` 환경변수 설명 (로컬은 `.env.local`, Vercel은 Production env)
  2. **Inspector로 호출** — `npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp` 명령
  3. **Claude Code에 등록** — `.mcp.json` 의 `wbs-local` 항목 예시 + 자기 Vercel URL 항목 추가 방법 안내
  4. **5개 tool 입출력 스펙 표** — 아래 형식의 마크다운 표
- [ ] 표 컬럼: `tool 이름 | 입력 스키마 (요약) | 출력 (요약) | 비즈니스 규칙 비고`
- [ ] 표에 5개 tool 모두 한 줄씩 등장하고, `update_task` 행에는 "진행률 100 → status `done` 자동 동기화" 명시
- [ ] 마크다운 lint/preview 깨지지 않음

## 4. Functional Requirements

- **FR-1**: `POST /api/mcp` 는 MCP JSON-RPC 요청을 받아 `StreamableHTTPServerTransport` 를 통해 처리한다.
- **FR-2**: `GET /api/mcp` / `DELETE /api/mcp` 도 동일 트랜스포트로 처리한다 (SDK 표준 동작).
- **FR-3**: 서버는 5개 tool — `list_tasks`, `get_task`, `create_task`, `update_task`, `delete_task` — 을 노출한다.
- **FR-4**: tool 입력 스키마는 모두 zod로 정의되며, `create_task` / `update_task` 의 검증 규칙은 SPEC.md §2 B-2 와 동일하다 (제목 필수, 상태는 3종, 진행률 0~100, 시작일 ≤ 목표 기한).
- **FR-5**: `update_task` 호출 시 `progress === 100` 이면 응답에서 `status === 'done'` 이 되어야 한다. 이 로직은 기존 `lib/actions/tasks.ts` 의 `applyAutoSync` 를 재사용해 보장한다.
- **FR-6**: `update_task` 에서 `status: 'done'` 만 보내고 진행률을 보내지 않으면 진행률은 변경되지 않는다 (역방향 동기화 없음).
- **FR-7**: `delete_task` 는 자식 행을 별도 처리하지 않는다 — Drizzle 스키마의 `parentId references tasks.id { onDelete: 'cascade' }` 가 처리한다.
- **FR-8**: 모든 tool 핸들러는 service role key를 사용하지 않으며, `DATABASE_URL` 로 연결된 기존 Drizzle 클라이언트(`lib/db/index.ts`)를 통해 DB에 접근한다.
- **FR-9**: 환경변수 `MCP_PUBLIC_ENABLED` 가 `'1'` 이 아니면 라우트는 HTTP 404 를 반환한다.
- **FR-10**: 서버는 MCP 프로토콜 버전 `2025-11-25` 로 `initialize` 를 협상한다. 누락된 `MCP-Protocol-Version` 헤더는 SDK 기본 동작에 따라 `2025-03-26` 로 폴백된다.
- **FR-11**: 라우트는 Node.js runtime(`export const runtime = 'nodejs'`)에서 실행된다 — Edge runtime 사용 금지.

## 5. Non-Goals (Out of Scope)

- ❌ Vercel 프로덕션 배포 검증은 PRD 범위 밖 — 사람이 수동으로 확인 (이슈 본문의 검증 절차 참고).
- ❌ MCP tool에 대한 단위 테스트(Vitest 등) — Playwright e2e 통합 테스트만.
- ❌ CSV import/export tool, 간트/Overdue 전용 조회 tool, 트리 구조 반환 tool — 별도 이슈.
- ❌ 인증, API key, 멀티 사용자 — MVP는 단일 사용자 가정(SPEC.md §0-1).
- ❌ 실시간 알림, change stream, subscription, resource(`@modelcontextprotocol/sdk` 의 `Resource` 개념) — 이번 범위 아님.
- ❌ MCP prompt 등록 — tool만 노출.
- ❌ Chakra UI / 프론트 페이지 변경 — 백엔드 전용 작업.

## 6. Design Considerations

- **재사용 우선**: 새 데이터 접근 레이어를 만들지 않는다. `lib/db/index.ts` 의 `db` 인스턴스와 `lib/actions/tasks.ts` 의 Server Action 을 그대로 import 해 사용한다. 검증 헬퍼는 이미 `lib/db/validation.ts` + `lib/actions/tasks.ts` 의 `applyAutoSync` 에 있다.
- **에러 변환**: Server Action은 `{ ok: false, error: string }` 패턴이고 MCP는 `isError: true` + `content` 패턴이다. 이 변환을 `lib/mcp/tools/tasks.ts` 안에 작은 헬퍼로 둔다 (예: `toMcpError(error: string)`).
- **응답 직렬화**: Date 필드는 ISO 문자열로 직렬화된 채로 반환 (Drizzle의 `timestamp` 결과를 그대로 `JSON.stringify` 하면 자동 처리). UI와 동일한 표현을 유지.
- **Stateless 트랜스포트**: 매 요청마다 `McpServer` + `StreamableHTTPServerTransport` 를 새로 생성하는 stateless 패턴을 채택. Vercel 서버리스에 적합하고 SDK 문서 권장 패턴.

## 7. Technical Considerations

- **MCP TypeScript SDK는 최근 API 변경 폭이 크다.** 코드를 작성하기 전 반드시 Context7 MCP로 최신 문서를 인용한다:
  - `mcp__context7__resolve-library-id` → `"@modelcontextprotocol/sdk"`
  - `mcp__context7__query-docs` → `"Streamable HTTP server transport Next.js route handler"`
  - `mcp__context7__query-docs` → `"McpServer registerTool zod input schema"`
- `'use server'` 함수의 직접 호출: Next.js의 Server Action 함수는 같은 서버 사이드 코드(Route Handler 등)에서 일반 함수처럼 import해 호출할 수 있다. `revalidatePath('/')` 가 호출되어도 Route Handler 컨텍스트에서 문제 없음.
- `app/api/mcp/route.ts` 는 반드시 `export const runtime = 'nodejs'` — Edge runtime 은 `postgres` 드라이버와 호환되지 않는다.
- Vercel 배포 시 `MCP_PUBLIC_ENABLED=1` 을 Production env 에 추가해야 동작한다 (PRD 범위 밖이지만 README 에 안내).
- 새 의존성: `@modelcontextprotocol/sdk`, `zod`. SDK가 최신 spec(2025-11-25) 을 지원하는 버전을 명시적으로 설치 (`npm i @modelcontextprotocol/sdk@latest zod@latest`).

## 8. Success Metrics

- 로컬 dev 서버에서 `npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp` 실행 시 5개 tool이 모두 보이고, 각 tool 호출에 200 응답이 떨어진다.
- `npm run test:e2e -- mcp.spec.ts` 가 5개 tool 전 시나리오에서 통과한다.
- `update_task` 로 `progress: 100` 을 보낸 후 `get_task` 응답의 `status` 가 `'done'` 이다 (자동 동기화 검증).
- `MCP_PUBLIC_ENABLED` 가 비어 있을 때 `/api/mcp` 가 404 를 반환한다.
- UI를 통한 Task CRUD 기능에 회귀가 없다 — 기존 Playwright 테스트(J1~J20) 모두 통과.

## 9. Open Questions

- `tools/list` 응답에 표시되는 description은 한국어로 둘지(예: `"모든 작업을 평면 배열로 반환합니다"`) 영어로 둘지? — 일단 **한국어**로 가되, 구현 중 에이전트 호환성 문제가 보이면 영어로 전환.
- `list_tasks` 의 정렬 기준이 `createdAt` 오름차순으로 충분한지, `parentId` 그룹핑까지 필요한지? — 이슈 본문 기준으로 평면 배열 + `createdAt` 만 — 트리 구조 변환은 클라이언트(에이전트) 책임.
- Vercel 배포 후 stateless 트랜스포트가 콜드 스타트에서 어떤 지연을 보일지? — 별도 측정 필요. PRD 범위 밖.
- 향후 변경 알림이 필요해지면 SSE 또는 MCP `notifications/*` 를 검토 — 이번 범위 아님.

---

## 구현 순서 제안 (참고)

1. US-001 → US-002 (의존성 + 골격)
2. US-003 → US-004 (tool 핸들러)
3. US-005 (Route Handler 와이어업) — 이 시점부터 Inspector로 수동 호출 가능
4. US-006 (안전핀)
5. US-007 (e2e) — 통과하면 사실상 DoD 달성
6. US-008 → US-009 (`.mcp.json` + README)

각 US 종료 시 `git commit` 권장 — Conventional Commits + 이슈 번호 (예: `feat: #24 list_tasks / get_task MCP tool`).
