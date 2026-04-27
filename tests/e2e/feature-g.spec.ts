import { expect, test } from '@playwright/test';
import { seedTask, truncateTasks } from './helpers/db';

test.describe('기능 G — 간트 일정 시각화', () => {
  test.beforeEach(async () => {
    await truncateTasks();
  });

  test('J13: 간트 토글로 전환 → 그리드·일정 없음 표기·좌측 작업명', async ({ page }) => {
    await seedTask({
      title: '리서치',
      startDate: '2026-06-01',
      dueDate: '2026-06-10',
    });
    // 시작일/목표 기한이 비어 있으면 "— 일정 없음 —" 표기 대상
    await seedTask({ title: '디자인 리뷰' });

    await page.goto('/');
    await page.getByRole('button', { name: '간트' }).click();

    await expect(page.getByTestId('gantt-root')).toBeVisible();
    // 일정 없음 작업이 정확히 1건
    await expect(page.getByTestId('gantt-no-schedule')).toHaveCount(1);
    await expect(page.getByTestId('gantt-no-schedule')).toHaveText('— 일정 없음 —');
    // 좌측 작업명 컬럼에 두 작업 모두 노출
    await expect(page.getByText('리서치', { exact: true })).toBeVisible();
    await expect(page.getByText('디자인 리뷰', { exact: true })).toBeVisible();
  });

  test('J14: 진행률 60% 작업의 fill 폭이 막대 폭의 약 60%', async ({ page }) => {
    await seedTask({
      title: '리서치',
      startDate: '2026-06-01',
      dueDate: '2026-06-10',
      progress: 60,
    });

    await page.goto('/');
    await page.getByRole('button', { name: '간트' }).click();

    const bar = page.getByTestId('gantt-bar').first();
    const fill = bar.getByTestId('gantt-bar-fill');

    await expect(bar).toBeVisible();

    const barW = await bar.evaluate((el) => el.getBoundingClientRect().width);
    const fillW = await fill.evaluate((el) => el.getBoundingClientRect().width);

    // 부모-자식 width의 비율이 progress 60%에 근접 (border 두께만큼 약간 작아질 수 있음)
    expect(fillW / barW).toBeGreaterThan(0.55);
    expect(fillW / barW).toBeLessThan(0.65);
  });

  test('J15: Overdue 작업의 막대에 빨강 테두리(2px) + data-overdue=true', async ({ page }) => {
    // 명백히 과거인 dueDate + status가 done이 아니면 Overdue
    await seedTask({
      title: '문서화',
      startDate: '1900-01-01',
      dueDate: '1900-01-02',
      status: 'doing',
    });
    // 과거 dueDate라도 status=done이면 Overdue 아님 — 비교용
    await seedTask({
      title: '리서치',
      startDate: '1900-01-01',
      dueDate: '1900-01-02',
      status: 'done',
    });

    await page.goto('/');
    await page.getByRole('button', { name: '간트' }).click();

    await expect(page.getByTestId('gantt-bar')).toHaveCount(2);

    const overdueBar = page.locator('[data-testid="gantt-bar"][data-overdue="true"]');
    const normalBar = page.locator('[data-testid="gantt-bar"][data-overdue="false"]');
    await expect(overdueBar).toHaveCount(1);
    await expect(normalBar).toHaveCount(1);

    const overdueBorder = await overdueBar.evaluate((el) => ({
      width: getComputedStyle(el).borderWidth,
      color: getComputedStyle(el).borderColor,
    }));
    expect(overdueBorder.width).toBe('2px');
    // red.500 계열 (rgb(239, 68, 68))
    expect(overdueBorder.color).toMatch(/rgb\(\s*239\s*,\s*68\s*,\s*68\s*\)/);

    const normalBorder = await normalBar.evaluate((el) => getComputedStyle(el).borderWidth);
    expect(normalBorder).toBe('1px');
  });

  test('J16: 간트 막대를 클릭해도 편집 모달이 열리지 않는다 (읽기 전용)', async ({ page }) => {
    await seedTask({
      title: '리서치',
      startDate: '2026-06-01',
      dueDate: '2026-06-10',
    });

    await page.goto('/');
    await page.getByRole('button', { name: '간트' }).click();

    const bar = page.getByTestId('gantt-bar').first();
    await expect(bar).toBeVisible();
    await bar.click();

    // 편집 다이얼로그가 한 건도 떠 있지 않아야 함
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('J18: 막대 hover 시 시작일~목표 기한 툴팁이 마우스를 따라가고, leave 시 사라짐', async ({
    page,
  }) => {
    await seedTask({
      title: '리서치',
      startDate: '2026-06-01',
      dueDate: '2026-06-10',
    });

    await page.goto('/');
    await page.getByRole('button', { name: '간트' }).click();

    const bar = page.getByTestId('gantt-bar').first();
    // 5개월 그리드는 viewport보다 넓을 수 있어, 마우스 이벤트 전에 막대를 viewport 안으로 스크롤.
    await bar.scrollIntoViewIfNeeded();
    const box = await bar.boundingBox();
    if (!box) throw new Error('gantt-bar bounding box not found');

    // 1) 막대 좌측 끝 hover → 툴팁 노출 + 텍스트 확인
    const leftX = box.x + 4;
    const cy = box.y + box.height / 2;
    await page.mouse.move(leftX, cy);

    const tooltip = page.getByTestId('gantt-bar-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText('2026-06-01 ~ 2026-06-10');

    const tt1 = await tooltip.boundingBox();
    if (!tt1) throw new Error('tooltip box (left) not found');

    // 2) 막대 우측 끝으로 이동 → 툴팁이 cursor를 따라 우측으로 이동
    const rightX = box.x + box.width - 4;
    await page.mouse.move(rightX, cy);

    // 미세한 위치 갱신을 받기 위해 잠깐 기다림
    await expect
      .poll(async () => {
        const b = await tooltip.boundingBox();
        return b ? b.x : -1;
      })
      .toBeGreaterThan(tt1.x + 5);

    // 3) 막대 밖으로 이동 → 툴팁 사라짐
    await page.mouse.move(0, 0);
    await expect(tooltip).toHaveCount(0);
  });

  test('J19: 간트 부모 토글 → 좌·우 모두에서 자식 사라짐 + 다시 클릭 시 복원', async ({ page }) => {
    const parent = await seedTask({
      title: '킥오프 미팅',
      startDate: '2026-04-01',
      dueDate: '2026-04-10',
    });
    await seedTask({
      title: '아젠다 초안',
      startDate: '2026-04-02',
      dueDate: '2026-04-05',
      parentId: parent.id,
    });

    await page.goto('/');
    await page.getByRole('button', { name: '간트' }).click();

    // 초기: 좌측 라벨 2행, 우측 막대 2개 (1:1 정렬)
    await expect(page.getByText('킥오프 미팅', { exact: true })).toBeVisible();
    await expect(page.getByText('아젠다 초안', { exact: true })).toBeVisible();
    await expect(page.getByTestId('gantt-bar')).toHaveCount(2);
    await expect(page.getByRole('button', { name: '접기' })).toBeVisible();

    // 접기 → 자식 좌·우 모두 사라짐, 토글이 '펼치기'로 변경
    await page.getByRole('button', { name: '접기' }).click();
    await expect(page.getByText('아젠다 초안', { exact: true })).not.toBeVisible();
    await expect(page.getByTestId('gantt-bar')).toHaveCount(1);
    await expect(page.getByRole('button', { name: '펼치기' })).toBeVisible();

    // 펼치기 → 다시 좌·우 2행으로 복원
    await page.getByRole('button', { name: '펼치기' }).click();
    await expect(page.getByText('아젠다 초안', { exact: true })).toBeVisible();
    await expect(page.getByTestId('gantt-bar')).toHaveCount(2);
    await expect(page.getByRole('button', { name: '접기' })).toBeVisible();
  });

  test('J19 공유 상태: 간트에서 접은 뒤 목록으로 전환해도 접힘 유지 + 그 반대', async ({
    page,
  }) => {
    const parent = await seedTask({
      title: '킥오프 미팅',
      startDate: '2026-04-01',
      dueDate: '2026-04-10',
    });
    await seedTask({ title: '아젠다 초안', parentId: parent.id });

    await page.goto('/');

    // 1) 간트 뷰에서 접기
    await page.getByRole('button', { name: '간트' }).click();
    await page.getByRole('button', { name: '접기' }).click();
    await expect(page.getByRole('button', { name: '펼치기' })).toBeVisible();

    // 2) 목록 뷰로 전환 → 자식 셀이 보이지 않고 토글이 '펼치기' 상태
    await page.getByRole('button', { name: '목록' }).click();
    const childCell = page.getByRole('cell', { name: /아젠다 초안/ }).first();
    await expect(childCell).not.toBeVisible();
    await expect(page.getByRole('button', { name: '펼치기' })).toBeVisible();

    // 3) 목록에서 다시 펼친 뒤 간트로 → 자식 행도 같이 펼쳐져 있음
    await page.getByRole('button', { name: '펼치기' }).click();
    await page.getByRole('button', { name: '간트' }).click();
    await expect(page.getByText('아젠다 초안', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '접기' })).toBeVisible();
  });

  test('J19 새로고침: reload 시 펼침 상태가 초기화되어 자식이 다시 보인다', async ({ page }) => {
    const parent = await seedTask({ title: '킥오프 미팅' });
    await seedTask({ title: '아젠다 초안', parentId: parent.id });

    await page.goto('/');
    await page.getByRole('button', { name: '간트' }).click();
    await page.getByRole('button', { name: '접기' }).click();
    await expect(page.getByRole('button', { name: '펼치기' })).toBeVisible();

    await page.reload();

    // 기본 뷰는 목록. 새로고침 후 모두 펼친 상태로 복귀 → 자식 셀과 '접기' 버튼 노출.
    await expect(page.getByRole('button', { name: '접기' })).toBeVisible();
    await expect(page.getByRole('cell', { name: /아젠다 초안/ }).first()).toBeVisible();
  });

  test('자식 없는 부모 행은 간트 좌측 라벨에 토글 버튼이 없다', async ({ page }) => {
    await seedTask({
      title: '리서치',
      startDate: '2026-04-01',
      dueDate: '2026-04-05',
    });

    await page.goto('/');
    await page.getByRole('button', { name: '간트' }).click();

    await expect(page.getByTestId('gantt-root')).toBeVisible();
    await expect(page.getByRole('button', { name: '접기' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: '펼치기' })).not.toBeVisible();
  });
});
