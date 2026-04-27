import { expect, test } from '@playwright/test';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { seedTask, truncateTasks } from './helpers/db';

test.describe('기능 D — 작업 삭제 (Task Delete)', () => {
  test.beforeEach(async () => {
    await truncateTasks();
  });

  test('J8: 부모(자식 1개) 삭제 → 다이얼로그 문구 + 부모/자식 모두 사라짐', async ({ page }) => {
    const parent = await seedTask({ title: '기획 회의' });
    await seedTask({ title: '아젠다 초안 작성', parentId: parent.id });

    await page.goto('/');

    await page.getByRole('button', { name: '기획 회의 작업 메뉴' }).click();
    await page.getByRole('menuitem', { name: '삭제' }).click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText('이 작업과 하위 작업 1개가 모두 삭제됩니다. 계속할까요?')
    ).toBeVisible();

    await dialog.getByRole('button', { name: '삭제' }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.getByRole('cell', { name: '기획 회의', exact: true })).not.toBeVisible();
    await expect(
      page.getByRole('cell', { name: '아젠다 초안 작성', exact: true })
    ).not.toBeVisible();

    // 새로고침 후에도 복구되지 않음 (영속 검증)
    await page.reload();
    await expect(page.getByRole('cell', { name: '기획 회의', exact: true })).not.toBeVisible();
    await expect(
      page.getByRole('cell', { name: '아젠다 초안 작성', exact: true })
    ).not.toBeVisible();

    // DB도 비어 있어야 함 (cascade 검증)
    const remaining = await db.select().from(tasks);
    expect(remaining).toHaveLength(0);
  });

  test('자식 없는 행 삭제: 기본 문구 + 취소 시 행 유지', async ({ page }) => {
    await seedTask({ title: '리서치' });

    await page.goto('/');

    await page.getByRole('button', { name: '리서치 작업 메뉴' }).click();
    await page.getByRole('menuitem', { name: '삭제' }).click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('이 작업을 삭제합니다. 계속할까요?')).toBeVisible();

    await dialog.getByRole('button', { name: '취소' }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.getByRole('cell', { name: '리서치', exact: true })).toBeVisible();

    const remaining = await db.select().from(tasks);
    expect(remaining).toHaveLength(1);
  });

  test('자식 행에서 삭제: 자식만 사라지고 부모는 남음', async ({ page }) => {
    const parent = await seedTask({ title: '기획 회의' });
    await seedTask({ title: '아젠다 초안 작성', parentId: parent.id });

    await page.goto('/');

    await page.getByRole('button', { name: '아젠다 초안 작성 작업 메뉴' }).click();

    // E-3: 자식 행 ⋯ 메뉴에는 "하위 작업 추가" 항목이 없어야 한다
    await expect(page.getByRole('menuitem', { name: '하위 작업 추가' })).not.toBeVisible();
    await expect(page.getByRole('menuitem', { name: '삭제' })).toBeVisible();

    await page.getByRole('menuitem', { name: '삭제' }).click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    // 자식 자체는 더 이상 자식이 없으므로 기본 문구
    await expect(dialog.getByText('이 작업을 삭제합니다. 계속할까요?')).toBeVisible();

    await dialog.getByRole('button', { name: '삭제' }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.getByRole('cell', { name: '기획 회의', exact: true })).toBeVisible();
    await expect(
      page.getByRole('cell', { name: '아젠다 초안 작성', exact: true })
    ).not.toBeVisible();

    const remaining = await db.select().from(tasks);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].title).toBe('기획 회의');
  });
});
