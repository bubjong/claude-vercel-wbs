import { expect, test } from '@playwright/test';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { seedTask, truncateTasks } from './helpers/db';

test.describe('기능 C — 작업 수정 (Task Edit)', () => {
  test.beforeEach(async () => {
    await truncateTasks();
  });

  test('J7: 행 클릭 → 모달(기존 값) → 제목 수정 → 저장 → 행 즉시 반영', async ({ page }) => {
    await seedTask({ title: '기획 회의', assignee: '김PM' });

    await page.goto('/');
    await page.getByRole('cell', { name: '기획 회의', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: /수정/ });
    await expect(dialog).toBeVisible();

    // 기존 값 채워졌는지
    await expect(dialog.getByRole('textbox', { name: '제목' })).toHaveValue('기획 회의');
    await expect(dialog.getByRole('textbox', { name: '담당자' })).toHaveValue('김PM');

    // 제목 수정
    await dialog.getByRole('textbox', { name: '제목' }).fill('킥오프 미팅');
    await dialog.getByRole('button', { name: '저장' }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('cell', { name: '킥오프 미팅', exact: true })).toBeVisible();
  });

  test('J5(수정 시점): 진행률 100 입력 시 상태 자동 "완료"', async ({ page }) => {
    await seedTask({ title: '아젠다 초안', status: 'todo', progress: 0 });

    await page.goto('/');
    await page.getByRole('cell', { name: '아젠다 초안', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: /수정/ });
    await dialog.getByRole('spinbutton', { name: '진행률 (0–100)' }).fill('100');
    await dialog.getByRole('button', { name: '저장' }).click();

    await expect(dialog).not.toBeVisible();

    const row = page.getByRole('row', { name: /아젠다 초안/ });
    await expect(row.getByText('완료')).toBeVisible();
    await expect(row.getByText('100%')).toBeVisible();

    const [task] = await db.select().from(tasks).where(eq(tasks.title, '아젠다 초안'));
    expect(task.status).toBe('done');
    expect(task.progress).toBe(100);
  });

  test('J6: 배지 클릭 → 메뉴 → 3개 상태 순환 (모달 안 열림, 진행률 자동 안 바뀜)', async ({
    page,
  }) => {
    await seedTask({ title: '리서치', status: 'todo', progress: 30 });

    await page.goto('/');

    const badge = page.getByRole('button', { name: '상태 변경' });
    const row = page.getByRole('row', { name: /리서치/ });

    // 1) '할 일' → '진행 중'
    await badge.click();
    await expect(page.getByRole('dialog')).not.toBeVisible(); // 모달 안 열림
    await page.getByRole('menuitem', { name: '진행 중' }).click();
    await expect(row.getByText('진행 중')).toBeVisible();

    let [task] = await db.select().from(tasks).where(eq(tasks.title, '리서치'));
    expect(task.status).toBe('doing');

    // 2) '진행 중' → '완료'
    await badge.click();
    await page.getByRole('menuitem', { name: '완료' }).click();
    await expect(row.getByText('완료')).toBeVisible();

    [task] = await db.select().from(tasks).where(eq(tasks.title, '리서치'));
    expect(task.status).toBe('done');

    // 3) '완료' → '할 일'
    await badge.click();
    await page.getByRole('menuitem', { name: '할 일' }).click();
    await expect(row.getByText('할 일')).toBeVisible();

    [task] = await db.select().from(tasks).where(eq(tasks.title, '리서치'));
    expect(task.status).toBe('todo');

    // 역방향 자동 동기화 없음 — 진행률은 시드 값 30 그대로 유지
    expect(task.progress).toBe(30);
  });

  test('충돌 회귀: 배지 클릭 시 EditModal 안 열림 (메뉴만 열림)', async ({ page }) => {
    await seedTask({ title: '회의' });

    await page.goto('/');
    await page.getByRole('button', { name: '상태 변경' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('menu', { name: '상태 변경' })).toBeVisible();
  });

  test('충돌 회귀: ⋯ 메뉴 클릭 시 EditModal 안 열림 (메뉴만 열림)', async ({ page }) => {
    await seedTask({ title: '회의' });

    await page.goto('/');
    await page.getByRole('button', { name: '회의 작업 메뉴' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('menuitem', { name: '하위 작업 추가' })).toBeVisible();
  });
});
