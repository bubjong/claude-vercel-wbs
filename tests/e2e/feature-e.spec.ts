import { expect, test } from '@playwright/test';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { createTask } from '@/lib/actions/tasks';
import { seedTask, truncateTasks } from './helpers/db';

test.describe('기능 E — 계층 (Hierarchy)', () => {
  test.beforeEach(async () => {
    await truncateTasks();
  });

  test('J3 보강: 자식 시드 시 부모에 토글 + 자식 들여쓰기', async ({ page }) => {
    const parent = await seedTask({ title: '기획 회의' });
    await seedTask({ title: '아젠다 초안', parentId: parent.id });

    await page.goto('/');

    // 부모 행에 토글 버튼(접기 = 펼친 상태)
    await expect(page.getByRole('button', { name: '접기' })).toBeVisible();

    // 두 행 모두 보임 (제목 텍스트 단위로 매치 — 셀 X 좌표는 들여쓰기와 무관)
    const parentTitle = page.getByText('기획 회의', { exact: true });
    const childTitle = page.getByText('아젠다 초안', { exact: true });
    await expect(parentTitle).toBeVisible();
    await expect(childTitle).toBeVisible();

    // 자식 들여쓰기 — 셀 내부 HStack의 paddingLeft로 처리하므로
    // 셀이 아니라 제목 span의 X 좌표를 비교
    const parentBox = await parentTitle.boundingBox();
    const childBox = await childTitle.boundingBox();
    expect(parentBox).not.toBeNull();
    expect(childBox).not.toBeNull();
    expect(childBox!.x).toBeGreaterThan(parentBox!.x);
  });

  test('J4: 토글 클릭으로 자식 숨김/표시 순환', async ({ page }) => {
    const parent = await seedTask({ title: '기획 회의' });
    await seedTask({ title: '아젠다 초안', parentId: parent.id });

    await page.goto('/');

    const childCell = page.getByRole('cell', { name: /아젠다 초안/ }).first();
    await expect(childCell).toBeVisible();
    await expect(page.getByRole('button', { name: '접기' })).toBeVisible();

    // 접기 → 자식 숨음 + 버튼이 '펼치기'로 변경
    await page.getByRole('button', { name: '접기' }).click();
    await expect(childCell).not.toBeVisible();
    await expect(page.getByRole('button', { name: '펼치기' })).toBeVisible();

    // 펼치기 → 자식 다시 보임 + 버튼이 '접기'로 변경
    await page.getByRole('button', { name: '펼치기' }).click();
    await expect(childCell).toBeVisible();
    await expect(page.getByRole('button', { name: '접기' })).toBeVisible();
  });

  test('자식 없는 부모 행에는 토글 버튼이 없다', async ({ page }) => {
    await seedTask({ title: '리서치' });

    await page.goto('/');

    await expect(page.getByRole('button', { name: '접기' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: '펼치기' })).not.toBeVisible();
  });

  test('깊이 제한 UI: 자식 행 ⋯ 메뉴에는 "하위 작업 추가" 항목이 없다', async ({ page }) => {
    const parent = await seedTask({ title: '기획 회의' });
    await seedTask({ title: '아젠다 초안', parentId: parent.id });

    await page.goto('/');

    // 부모/자식 행 모두 ⋯ 메뉴는 노출 (D-1: 삭제는 양쪽 모두 가능)
    await expect(page.getByRole('button', { name: '기획 회의 작업 메뉴' })).toBeVisible();
    await expect(page.getByRole('button', { name: '아젠다 초안 작업 메뉴' })).toBeVisible();

    // 부모 행 ⋯ 메뉴 → "하위 작업 추가" 항목 노출
    await page.getByRole('button', { name: '기획 회의 작업 메뉴' }).click();
    await expect(page.getByRole('menuitem', { name: '하위 작업 추가' })).toBeVisible();
    await page.keyboard.press('Escape');

    // 자식 행 ⋯ 메뉴 → "하위 작업 추가" 항목 미노출, "삭제"만 노출
    await page.getByRole('button', { name: '아젠다 초안 작업 메뉴' }).click();
    await expect(page.getByRole('menuitem', { name: '하위 작업 추가' })).not.toBeVisible();
    await expect(page.getByRole('menuitem', { name: '삭제' })).toBeVisible();
  });

  test('깊이 제한 서버: createTask가 손자(자식의 자식) 시도를 거부', async () => {
    const root = await seedTask({ title: '기획 회의' });
    const child = await seedTask({ title: '아젠다 초안', parentId: root.id });

    const result = await createTask({ title: '손자', parentId: child.id });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('한 단계');
    }

    // DB에 손자가 들어가지 않았는지
    const grand = await db.select().from(tasks).where(eq(tasks.title, '손자'));
    expect(grand).toHaveLength(0);
  });

  test('충돌 회귀: 토글 버튼 클릭 시 EditModal이 안 열린다', async ({ page }) => {
    const parent = await seedTask({ title: '기획 회의' });
    await seedTask({ title: '아젠다 초안', parentId: parent.id });

    await page.goto('/');
    await page.getByRole('button', { name: '접기' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
