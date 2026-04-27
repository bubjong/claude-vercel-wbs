import path from 'node:path';
import { expect, test } from '@playwright/test';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { seedTask, truncateTasks } from './helpers/db';

const UTF8_BOM = '﻿';
const FIXTURE_DIR = path.join(__dirname, 'fixtures');

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

    const downloadPath = await download.path();
    const fs = await import('node:fs/promises');
    const raw = await fs.readFile(downloadPath, 'utf-8');
    const text = raw.slice(UTF8_BOM.length);
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(
      '"제목","설명","담당자","상태","진행률","시작일","목표 기한","상위 작업 제목"'
    );
  });

  test('J11: CSV 가져오기 정상 — 3건 추가, 계층 연결', async ({ page }) => {
    await seedTask({ title: '기존 1' });
    await seedTask({ title: '기존 2' });

    await page.goto('/');

    await page
      .getByTestId('csv-import-file-input')
      .setInputFiles(path.join(FIXTURE_DIR, 'feature-f-valid.csv'));

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('csv-import-summary')).toHaveText(
      '3개 작업을 추가합니다. 제외 0건'
    );

    await dialog.getByRole('button', { name: '적용' }).click();
    await expect(dialog).not.toBeVisible();

    // DB 검증: 5건 있고 "리서치 요약"의 부모가 "리서치"
    const all = await db.select().from(tasks);
    expect(all).toHaveLength(5);

    const research = all.find((t) => t.title === '리서치')!;
    const summary = all.find((t) => t.title === '리서치 요약')!;
    expect(research).toBeDefined();
    expect(summary).toBeDefined();
    expect(summary.parentId).toBe(research.id);

    // 화면에도 "리서치 요약"이 보인다
    await expect(page.getByRole('cell', { name: '리서치 요약', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: '리뷰 미팅', exact: true })).toBeVisible();
  });

  test('J12: CSV 가져오기 부분 오류 — 제목 누락 행 제외 + 부모 매칭 실패 경고', async ({
    page,
  }) => {
    await page.goto('/');

    await page
      .getByTestId('csv-import-file-input')
      .setInputFiles(path.join(FIXTURE_DIR, 'feature-f-partial-errors.csv'));

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await expect(dialog.getByTestId('csv-import-summary')).toHaveText(
      '2개 작업을 추가합니다. 제외 1건'
    );

    // 제외 사유: "3행: 제목 누락" (헤더가 1행, 첫 데이터가 2행, 두 번째 데이터가 3행)
    await expect(dialog.getByTestId('csv-import-rejected')).toContainText('3행: 제목 누락');

    // 경고: QA(4행) 상위 매칭 실패 → 최상위로 처리
    await expect(dialog.getByTestId('csv-import-warnings')).toContainText(
      '4행: 상위 매칭 실패 → 최상위로 처리'
    );

    await dialog.getByRole('button', { name: '적용' }).click();
    await expect(dialog).not.toBeVisible();

    const all = await db.select().from(tasks);
    expect(all).toHaveLength(2);
    const titles = all.map((t) => t.title).sort();
    expect(titles).toEqual(['QA', '문서화']);
    // 둘 다 최상위
    expect(all.every((t) => t.parentId === null)).toBe(true);
  });
});
