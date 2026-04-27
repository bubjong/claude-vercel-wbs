// 폼 입력과 CSV 가져오기 모두에서 공유하는 도메인 검증 헬퍼.
// 한쪽에서만 검증을 한다든가 규칙이 갈라지는 사고를 막기 위한 단일 출처.

import type { TaskStatusCode } from '@/lib/csv/columns';

// SPEC.md §B-2: 시작일·목표 기한이 둘 다 있을 때만 둘의 순서를 따진다.
export function isValidDateRange(
  start: string | null | undefined,
  due: string | null | undefined
): boolean {
  if (!start || !due) return true;
  return due >= start;
}

// SPEC.md §B-4 / §C-2 (B·C 공통): 진행률이 100이면 상태를 'done'으로 강제.
// 역방향 자동 동기화는 없음.
export function autoSyncStatusByProgress(status: TaskStatusCode, progress: number): TaskStatusCode {
  return progress >= 100 ? 'done' : status;
}
