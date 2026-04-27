import { expect, test } from '@playwright/test';
import { seedTask, truncateTasks } from './helpers/db';

// dueDate를 시스템 시각의 UTC 자정 기준으로 N일 전후로 계산.
// isOverdue() 가 UTC 자정 비교를 쓰므로 timezone 안전.
function utcDateOffset(days: number): string {
  const t = new Date();
  const utc = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
  const past = new Date(utc.getTime() + days * 86400000);
  return past.toISOString().slice(0, 10);
}

test.describe('기능 H — 목표 기한 지남 시각 표시', () => {
  test.beforeEach(async () => {
    await truncateTasks();
  });

  test('J9: 목록 뷰 — overdue 행에 "지남" 배지 + data-overdue=true (정상 행은 표시 없음)', async ({
    page,
  }) => {
    // 어제가 dueDate, 진행 중 → overdue
    await seedTask({
      title: '킥오프 미팅',
      startDate: utcDateOffset(-3),
      dueDate: utcDateOffset(-1),
      status: 'doing',
    });
    // 미래 dueDate → overdue 아님
    await seedTask({
      title: '리서치',
      startDate: utcDateOffset(1),
      dueDate: utcDateOffset(7),
      status: 'todo',
    });
    // 과거 dueDate지만 done → overdue 아님 (H-1 단서)
    await seedTask({
      title: '완료된 작업',
      startDate: utcDateOffset(-5),
      dueDate: utcDateOffset(-2),
      status: 'done',
    });

    await page.goto('/');

    const overdueRows = page.locator('tr[data-overdue="true"]');
    const normalRows = page.locator('tr[data-overdue="false"]');

    await expect(overdueRows).toHaveCount(1);
    await expect(normalRows).toHaveCount(2);

    const overdueRow = page.getByRole('row', { name: /킥오프 미팅/ });
    await expect(overdueRow.getByTestId('overdue-badge')).toBeVisible();
    await expect(overdueRow.getByTestId('overdue-badge')).toHaveText('지남');

    // 정상 행에는 "지남" 배지가 없다
    const normalRow = page.getByRole('row', { name: /리서치/ });
    await expect(normalRow.getByTestId('overdue-badge')).toHaveCount(0);
    const doneRow = page.getByRole('row', { name: /완료된 작업/ });
    await expect(doneRow.getByTestId('overdue-badge')).toHaveCount(0);
  });

  test('J15: 간트 뷰 — overdue 막대에 data-overdue=true (동적 dueDate)', async ({ page }) => {
    await seedTask({
      title: '킥오프 미팅',
      startDate: utcDateOffset(-3),
      dueDate: utcDateOffset(-1),
      status: 'doing',
    });
    await seedTask({
      title: '리서치',
      startDate: utcDateOffset(1),
      dueDate: utcDateOffset(7),
      status: 'todo',
    });

    await page.goto('/');
    await page.getByRole('button', { name: '간트' }).click();

    await expect(page.getByTestId('gantt-root')).toBeVisible();
    await expect(page.locator('[data-testid="gantt-bar"][data-overdue="true"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="gantt-bar"][data-overdue="false"]')).toHaveCount(1);
  });

  test('H-3: 상태를 "완료"로 바꾸면 목록·간트 양쪽에서 경고 표시가 즉시 사라짐', async ({
    page,
  }) => {
    await seedTask({
      title: '킥오프 미팅',
      startDate: utcDateOffset(-3),
      dueDate: utcDateOffset(-1),
      status: 'doing',
    });

    await page.goto('/');

    // 사전 조건: 목록 뷰에서 overdue 표시 노출
    const row = page.getByRole('row', { name: /킥오프 미팅/ });
    await expect(row).toHaveAttribute('data-overdue', 'true');
    await expect(row.getByTestId('overdue-badge')).toBeVisible();

    // 인라인 상태 배지 → "완료" 선택
    await page.getByRole('button', { name: '상태 변경' }).click();
    await page.getByRole('menuitem', { name: '완료' }).click();

    // 목록: data-overdue=false, "지남" 배지 사라짐
    await expect(row).toHaveAttribute('data-overdue', 'false');
    await expect(row.getByTestId('overdue-badge')).toHaveCount(0);

    // 간트로 전환: 막대 data-overdue=false
    await page.getByRole('button', { name: '간트' }).click();
    await expect(page.getByTestId('gantt-root')).toBeVisible();
    await expect(page.locator('[data-testid="gantt-bar"][data-overdue="true"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="gantt-bar"][data-overdue="false"]')).toHaveCount(1);
  });
});
