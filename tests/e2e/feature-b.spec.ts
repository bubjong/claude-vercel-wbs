import { expect, test } from '@playwright/test';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { seedTask, truncateTasks } from './helpers/db';

test.describe('기능 B — 작업 생성 (Task Create)', () => {
  test.beforeEach(async () => {
    await truncateTasks();
  });

  test('J2: + 작업 추가 → 모달 → 저장 → 목록에 행 즉시 추가', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: '+ 작업 추가' }).click();

    const dialog = page.getByRole('dialog', { name: '새 작업 추가' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('textbox', { name: '제목' }).fill('기획 회의');
    await dialog.getByRole('textbox', { name: '담당자' }).fill('김PM');
    await dialog.getByRole('textbox', { name: '시작일' }).fill('2026-05-01');
    await dialog.getByRole('textbox', { name: '목표 기한' }).fill('2026-05-03');

    await dialog.getByRole('button', { name: '저장' }).click();

    // 모달 닫힘 + 빈 상태 안내 사라짐
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('아직 작업이 없습니다')).not.toBeVisible();

    // 행 추가
    const row = page.getByRole('row', { name: /기획 회의/ });
    await expect(row).toBeVisible();
    await expect(row.getByText('김PM')).toBeVisible();
    await expect(row.getByText('할 일')).toBeVisible();
    await expect(row.getByText('5/1 ~ 5/3')).toBeVisible();
  });

  test('필수: 제목이 비어있으면 저장 버튼 비활성', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '+ 작업 추가' }).click();

    const dialog = page.getByRole('dialog', { name: '새 작업 추가' });
    await expect(dialog.getByText('제목은 필수입니다.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: '저장' })).toBeDisabled();
  });

  test('J17: 시작일 > 목표 기한 입력 시 헬퍼 텍스트 + 저장 비활성', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '+ 작업 추가' }).click();

    const dialog = page.getByRole('dialog', { name: '새 작업 추가' });
    await dialog.getByRole('textbox', { name: '제목' }).fill('테스트');
    await dialog.getByRole('textbox', { name: '시작일' }).fill('2026-05-10');
    await dialog.getByRole('textbox', { name: '목표 기한' }).fill('2026-05-05');

    await expect(dialog.getByText('목표 기한은 시작일 이후여야 합니다.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: '저장' })).toBeDisabled();
  });

  test('진행률 100% 입력 시 상태가 자동으로 "완료"가 된다', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '+ 작업 추가' }).click();

    const dialog = page.getByRole('dialog', { name: '새 작업 추가' });
    await dialog.getByRole('textbox', { name: '제목' }).fill('킥오프');
    // 상태는 기본값 '할 일' 그대로 두고 진행률만 100으로
    await dialog.getByRole('spinbutton', { name: '진행률 (0–100)' }).fill('100');
    await dialog.getByRole('button', { name: '저장' }).click();

    await expect(dialog).not.toBeVisible();

    const row = page.getByRole('row', { name: /킥오프/ });
    await expect(row.getByText('완료')).toBeVisible();
    await expect(row.getByText('100%')).toBeVisible();
  });

  test('진행률 100 초과 입력 시 인라인 에러 + 저장 비활성', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '+ 작업 추가' }).click();

    const dialog = page.getByRole('dialog', { name: '새 작업 추가' });
    await dialog.getByRole('textbox', { name: '제목' }).fill('테스트');
    await dialog.getByRole('spinbutton', { name: '진행률 (0–100)' }).fill('150');

    await expect(dialog.getByText('진행률은 0과 100 사이여야 합니다.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: '저장' })).toBeDisabled();
  });

  test('J3: ⋯ 메뉴 → 하위 작업 추가 → parent_id가 부모 id로 채워짐', async ({ page }) => {
    const parent = await seedTask({ title: '부모 작업' });

    await page.goto('/');
    await page.getByRole('button', { name: '부모 작업 작업 메뉴' }).click();
    await page.getByRole('menuitem', { name: '하위 작업 추가' }).click();

    const dialog = page.getByRole('dialog', { name: '"부모 작업"의 하위 작업 추가' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('textbox', { name: '제목' }).fill('자식 작업');
    await dialog.getByRole('button', { name: '저장' }).click();

    await expect(dialog).not.toBeVisible();

    // UI: 자식 행 등장 (들여쓰기는 기능 E에서 처리하므로 단순 등장 여부만 확인)
    await expect(page.getByRole('row', { name: /자식 작업/ })).toBeVisible();

    // DB: parent_id 검증
    const [child] = await db.select().from(tasks).where(eq(tasks.title, '자식 작업'));
    expect(child).toBeDefined();
    expect(child.parentId).toBe(parent.id);
  });
});
