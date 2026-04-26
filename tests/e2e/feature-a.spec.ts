import { expect, test } from '@playwright/test';
import { truncateTasks } from './helpers/db';

test.describe('기능 A — 작업 목록 (Task List)', () => {
  test.beforeEach(async () => {
    await truncateTasks();
  });

  test('J1: 빈 상태 안내 + 툴바 버튼이 보인다', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('아직 작업이 없습니다')).toBeVisible();
    await expect(page.getByText('첫 작업을 추가해 시작하세요')).toBeVisible();

    await expect(page.getByRole('button', { name: '+ 작업 추가' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'CSV 내보내기' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'CSV 불러오기' })).toBeVisible();
  });
});
