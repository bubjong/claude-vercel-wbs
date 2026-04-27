// 간트 뷰의 날짜 그리드 계산 유틸.
// SPEC.md §7 G-2 — 주 단위 눈금 그리드 위에 막대를 가로로 그린다.

export type WeekColumn = {
  // 주의 시작일 (월요일 00:00 UTC 기준).
  start: Date;
  // 시작일 라벨 (월/일).
  label: string;
  // 그리드 시작일로부터의 오프셋(일).
  offsetDays: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// 날짜를 UTC 자정으로 정규화.
// JS Date는 로컬 타임존을 섞기 쉬워, 그리드 계산은 항상 UTC 자정으로 통일한다.
function atUtcMidnight(d: Date | string): Date {
  const x = typeof d === 'string' ? new Date(`${d}T00:00:00Z`) : d;
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
}

// 해당 날짜가 속한 주의 월요일 00:00 UTC.
function startOfWeekMonday(d: Date): Date {
  const x = atUtcMidnight(d);
  const dow = x.getUTCDay(); // 0(일)~6(토)
  const diff = dow === 0 ? -6 : 1 - dow;
  return new Date(x.getTime() + diff * DAY_MS);
}

function diffDays(a: Date, b: Date): number {
  return Math.round((atUtcMidnight(a).getTime() - atUtcMidnight(b).getTime()) / DAY_MS);
}

// 그리드 범위.
// 최소 표시 윈도우: 오늘 달을 중앙에 두고 ±2달 (총 5개월).
// 작업의 startDate/dueDate 가 이 윈도우를 벗어나면 그쪽 방향으로 확장한다.
export function computeGridRange(
  rows: { startDate: string | null; dueDate: string | null }[],
  today: Date = new Date()
): { start: Date; end: Date; totalDays: number } {
  const t = atUtcMidnight(today);
  const windowStart = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 2, 1));
  const windowEnd = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 3, 0));

  let min = windowStart;
  let max = windowEnd;
  for (const r of rows) {
    if (r.startDate) {
      const d = atUtcMidnight(r.startDate);
      if (d.getTime() < min.getTime()) min = d;
    }
    if (r.dueDate) {
      const d = atUtcMidnight(r.dueDate);
      if (d.getTime() > max.getTime()) max = d;
    }
  }

  const start = startOfWeekMonday(min);
  // max가 속한 주의 끝까지 포함하기 위해 +1주.
  const end = new Date(startOfWeekMonday(max).getTime() + 7 * DAY_MS);
  const totalDays = diffDays(end, start);
  return { start, end, totalDays };
}

// 그리드 시작일~끝일 사이의 주(월요일) 컬럼 배열.
export function buildWeekColumns(start: Date, end: Date): WeekColumn[] {
  const cols: WeekColumn[] = [];
  let cursor = startOfWeekMonday(start);
  const endMs = end.getTime();
  while (cursor.getTime() < endMs) {
    cols.push({
      start: cursor,
      label: `${cursor.getUTCMonth() + 1}/${cursor.getUTCDate()}`,
      offsetDays: diffDays(cursor, start),
    });
    cursor = new Date(cursor.getTime() + 7 * DAY_MS);
  }
  return cols;
}

// 막대의 left/width 퍼센트.
// startDate/dueDate가 없으면 null (호출 측에서 "— 일정 없음 —" 처리).
export function barStyle(
  startDate: string | null,
  dueDate: string | null,
  gridStart: Date,
  totalDays: number
): { leftPct: number; widthPct: number } | null {
  if (!startDate || !dueDate) return null;
  const s = atUtcMidnight(startDate);
  const e = atUtcMidnight(dueDate);
  const startOffset = diffDays(s, gridStart);
  // dueDate는 마지막 날을 포함하는 의미이므로 +1일.
  const span = Math.max(1, diffDays(e, s) + 1);
  return {
    leftPct: (startOffset / totalDays) * 100,
    widthPct: (span / totalDays) * 100,
  };
}

// 오늘 세로선의 left 퍼센트. 그리드 밖이면 null.
export function todayLinePct(
  gridStart: Date,
  totalDays: number,
  today: Date = new Date()
): number | null {
  const offset = diffDays(today, gridStart);
  if (offset < 0 || offset > totalDays) return null;
  return (offset / totalDays) * 100;
}

// Overdue 판정: 오늘 > dueDate AND status !== 'done'.
export function isOverdue(
  dueDate: string | null,
  status: string,
  today: Date = new Date()
): boolean {
  if (!dueDate) return false;
  if (status === 'done') return false;
  return atUtcMidnight(today).getTime() > atUtcMidnight(dueDate).getTime();
}
