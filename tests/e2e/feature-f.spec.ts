import { expect, test } from '@playwright/test';
import { seedTask, truncateTasks } from './helpers/db';

const UTF8_BOM = '﻿';

test.describe('기능 F — CSV 가져오기/내보내기', () => {
  test.beforeEach(async () => {
    await truncateTasks();
  });

  test('J10: CSV 내보내기 — 헤더·행 수·상위 작업 제목·파일명', async ({ page }) => {
    const parent = await seedTask({
      title: '킥오프 미팅',
      assignee: '김PM',
      status: 'doing',
      progress: 60,
      startDate: '2026-05-01',
      dueDate: '2026-05-03',
    });
    await seedTask({
      title: '아젠다 초안 작성',
      assignee: '박기획',
      status: 'done',
      progress: 100,
      startDate: '2026-05-01',
      dueDate: '2026-05-02',
      parentId: parent.id,
    });
    await seedTask({
      title: '리서치',
      status: 'todo',
      progress: 0,
    });

    await page.goto('/');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV 내보내기' }).click();
    const download = await downloadPromise;

    // 파일명: wbs-YYYY-MM-DD.csv
    expect(download.suggestedFilename()).toMatch(/^wbs-\d{4}-\d{2}-\d{2}\.csv$/);

    const path = await download.path();
    const fs = await import('node:fs/promises');
    const raw = await fs.readFile(path, 'utf-8');

    // BOM 제거
    expect(raw.startsWith(UTF8_BOM)).toBe(true);
    const text = raw.slice(UTF8_BOM.length);

    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
    // 첫 줄: 헤더
    expect(lines[0]).toBe(
      '"제목","설명","담당자","상태","진행률","시작일","목표 기한","상위 작업 제목"'
    );
    // 데이터 행 수 = 시드 3건
    expect(lines).toHaveLength(1 + 3);

    // 자식 행("아젠다 초안 작성")의 "상위 작업 제목" 열에 부모 제목이 들어 있어야 함
    const childLine = lines.find((l) => l.includes('아젠다 초안 작성'))!;
    expect(childLine).toContain('"킥오프 미팅"');
    // 한국어 상태 라벨
    expect(childLine).toContain('"완료"');

    // 부모 행의 "상위 작업 제목" 열은 빈 칸
    const parentLine = lines.find((l) => l.startsWith('"킥오프 미팅"'))!;
    expect(parentLine.endsWith('""')).toBe(true);
    expect(parentLine).toContain('"진행 중"');
  });

  test('J10-empty: 작업이 없을 때도 CSV 내보내기가 헤더만 포함한 파일을 만든다', async ({
    page,
  }) => {
    await page.goto('/');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV 내보내기' }).click();
    const download = await downloadPromise;

    const path = await download.path();
    const fs = await import('node:fs/promises');
    const raw = await fs.readFile(path, 'utf-8');
    const text = raw.slice(UTF8_BOM.length);
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(
      '"제목","설명","담당자","상태","진행률","시작일","목표 기한","상위 작업 제목"'
    );
  });
});
