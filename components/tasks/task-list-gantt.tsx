'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, HStack, Portal, Text, VStack } from '@chakra-ui/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { TaskNode } from '@/lib/tasks/tree';
import {
  barStyle,
  buildWeekColumns,
  computeGridRange,
  isOverdue,
  todayLinePct,
} from '@/lib/gantt/date-grid';

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 48;
const COL_WIDTH = 64; // 주당 가로 픽셀
const NAME_COL_WIDTH = 240;
const NAME_INDENT = 16;

type Props = {
  nodes: TaskNode[];
  collapsed: ReadonlySet<string>;
  onToggle: (id: string) => void;
};

export function TaskListGantt({ nodes, collapsed, onToggle }: Props) {
  const today = new Date();
  const rows = nodes.map((n) => n.task);
  const { start: gridStart, totalDays } = computeGridRange(rows, today);
  const weekCols = buildWeekColumns(
    gridStart,
    new Date(gridStart.getTime() + totalDays * 86400000)
  );
  const gridWidth = weekCols.length * COL_WIDTH;
  const todayPct = todayLinePct(gridStart, totalDays, today);

  // 처음 렌더 시 오늘 세로선이 가로 중앙에 오도록 스크롤.
  // (그리드 폭이 viewport 보다 클 때 사용자에게 "오늘 주변"을 먼저 보여주기 위함)
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || todayPct === null) return;
    const todayPx = (todayPct / 100) * gridWidth;
    el.scrollLeft = Math.max(0, todayPx - el.clientWidth / 2);
  }, [todayPct, gridWidth]);

  // 월 경계: 같은 월이 연속된 컬럼을 묶어 상단 헤더에 한 번만 그린다.
  const monthSpans: { label: string; widthPx: number }[] = [];
  for (const col of weekCols) {
    const label = `${col.start.getUTCFullYear()}.${String(col.start.getUTCMonth() + 1).padStart(2, '0')}`;
    const last = monthSpans[monthSpans.length - 1];
    if (last && last.label === label) last.widthPx += COL_WIDTH;
    else monthSpans.push({ label, widthPx: COL_WIDTH });
  }

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      overflow="hidden"
      data-testid="gantt-root"
    >
      <HStack gap="0" align="stretch">
        {/* 좌측: 작업명 컬럼 */}
        <VStack
          gap="0"
          align="stretch"
          flexShrink="0"
          width={`${NAME_COL_WIDTH}px`}
          borderRightWidth="1px"
          borderColor="gray.200"
          bg="bg.subtle"
        >
          <Box
            height={`${HEADER_HEIGHT}px`}
            display="flex"
            alignItems="center"
            px="3"
            borderBottomWidth="1px"
            borderColor="gray.200"
            fontWeight="semibold"
            fontSize="sm"
          >
            작업
          </Box>
          {nodes.map((node) => {
            const expanded = !collapsed.has(node.task.id);
            return (
              <Box
                key={node.task.id}
                height={`${ROW_HEIGHT}px`}
                display="flex"
                alignItems="center"
                gap="2"
                pl={`${12 + node.depth * NAME_INDENT}px`}
                pr="2"
                borderBottomWidth="1px"
                borderColor="gray.100"
                fontSize="sm"
                title={node.task.title}
              >
                {node.hasChildren ? (
                  <button
                    type="button"
                    aria-label={expanded ? '접기' : '펼치기'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(node.task.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      width: '1rem',
                      height: '1rem',
                      flexShrink: 0,
                    }}
                  >
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : (
                  // 자식이 없으면 같은 폭의 spacer로 정렬 유지 (목록 뷰 TaskRow와 동일)
                  <span style={{ width: '1rem', display: 'inline-block', flexShrink: 0 }} />
                )}
                <Box
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  textDecoration={node.task.status === 'done' ? 'line-through' : undefined}
                >
                  {node.task.title}
                </Box>
              </Box>
            );
          })}
        </VStack>

        {/* 우측: 날짜 그리드 (가로 스크롤) */}
        <Box flex="1" overflowX="auto" ref={scrollRef}>
          {/*
            그리드 본체는 정확히 weekCols × COL_WIDTH 픽셀.
            막대의 left%/width%는 이 박스를 기준으로 계산되므로,
            여기에 minWidth: 100% 같은 stretch를 주면 헤더와 막대 위치가 어긋난다.
          */}
          <Box position="relative" width={`${gridWidth}px`}>
            {/* 월 헤더 */}
            <HStack
              gap="0"
              height={`${HEADER_HEIGHT / 2}px`}
              borderBottomWidth="1px"
              borderColor="gray.200"
              align="stretch"
            >
              {monthSpans.map((m, i) => (
                <Box
                  key={`${m.label}-${i}`}
                  width={`${m.widthPx}px`}
                  flexShrink="0"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="xs"
                  fontWeight="medium"
                  color="gray.600"
                  borderRightWidth="1px"
                  borderColor="gray.200"
                >
                  {m.label}
                </Box>
              ))}
            </HStack>

            {/* 주 헤더 */}
            <HStack
              gap="0"
              height={`${HEADER_HEIGHT / 2}px`}
              borderBottomWidth="1px"
              borderColor="gray.200"
              align="stretch"
            >
              {weekCols.map((c) => (
                <Box
                  key={c.start.toISOString()}
                  width={`${COL_WIDTH}px`}
                  flexShrink="0"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="xs"
                  color="gray.500"
                  borderRightWidth="1px"
                  borderColor="gray.100"
                >
                  {c.label}
                </Box>
              ))}
            </HStack>

            {/* 오늘 세로 강조선 */}
            {todayPct !== null && (
              <Box
                position="absolute"
                top="0"
                bottom="0"
                left={`${todayPct}%`}
                width="2px"
                bg="red.400"
                pointerEvents="none"
                zIndex="1"
                data-testid="gantt-today-line"
              />
            )}

            {/* 작업 행 */}
            {nodes.map((node) => {
              const t = node.task;
              const style = barStyle(t.startDate, t.dueDate, gridStart, totalDays);
              const overdue = isOverdue(t.dueDate, t.status, today);

              return (
                <Box
                  key={t.id}
                  position="relative"
                  height={`${ROW_HEIGHT}px`}
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                >
                  {/* 주 컬럼 가로 격자 */}
                  <HStack gap="0" height="100%" align="stretch" pointerEvents="none">
                    {weekCols.map((c) => (
                      <Box
                        key={c.start.toISOString()}
                        width={`${COL_WIDTH}px`}
                        flexShrink="0"
                        borderRightWidth="1px"
                        borderColor="gray.100"
                      />
                    ))}
                  </HStack>

                  {style ? (
                    <GanttBar
                      leftPct={style.leftPct}
                      widthPct={style.widthPct}
                      progress={t.progress}
                      overdue={overdue}
                      status={t.status}
                      startDate={t.startDate as string}
                      dueDate={t.dueDate as string}
                    />
                  ) : (
                    // 가로 스크롤이 일어나도 라벨이 좌측 끝에 보이도록 sticky 사용.
                    // 단 sticky 의 top: 50% 는 스크롤 컨테이너 기준이라 row 안에서 동작하지 않으므로,
                    // 수직 중앙 정렬은 외부 absolute 박스가 담당하고 sticky 는 가로 위치만 처리한다.
                    <Box
                      position="absolute"
                      top="0"
                      left="0"
                      width="100%"
                      height="100%"
                      display="flex"
                      alignItems="center"
                      pointerEvents="none"
                    >
                      <Box
                        position="sticky"
                        left="12px"
                        fontSize="xs"
                        color="gray.400"
                        data-testid="gantt-no-schedule"
                      >
                        — 일정 없음 —
                      </Box>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </HStack>

      {nodes.length === 0 && (
        <Box p="6" textAlign="center" color="gray.500">
          <Text fontSize="sm">표시할 작업이 없습니다</Text>
        </Box>
      )}
    </Box>
  );
}

type BarProps = {
  leftPct: number;
  widthPct: number;
  progress: number;
  overdue: boolean;
  status: string;
  startDate: string;
  dueDate: string;
};

function GanttBar({ leftPct, widthPct, progress, overdue, status, startDate, dueDate }: BarProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  // SPEC §7 G-2 — 완료 작업은 초록 계열, 미완료는 파랑 계열.
  // status-badge.tsx 의 `done → 'green'` 컨벤션과 일치시킨다.
  const done = status === 'done';
  const bgColor = done ? 'green.100' : 'blue.100';
  const fillColor = done ? 'green.500' : 'blue.500';
  const restingBorder = done ? 'green.300' : 'blue.300';
  // SPEC §7 G-2 — 막대 hover 툴팁: 시작일 ~ 목표 기한.
  // 긴 막대에서 트리거 박스 중앙에 툴팁이 떠 부자연스러워 보이지 않도록,
  // 마우스 좌표를 직접 추적해 cursor 옆에 띄운다.
  const tooltipText = `${startDate} ~ ${dueDate}`;
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);

  return (
    <>
      <Box
        position="absolute"
        top="50%"
        transform="translateY(-50%)"
        left={`${leftPct}%`}
        width={`${widthPct}%`}
        height="20px"
        borderRadius="sm"
        overflow="hidden"
        bg={bgColor}
        borderWidth={overdue ? '2px' : '1px'}
        borderColor={overdue ? 'red.500' : restingBorder}
        cursor="default"
        data-testid="gantt-bar"
        data-overdue={overdue ? 'true' : 'false'}
        data-status={status}
        onMouseEnter={(e) => setMouse({ x: e.clientX, y: e.clientY })}
        onMouseMove={(e) => setMouse({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setMouse(null)}
      >
        <Box
          height="100%"
          width={`${clamped}%`}
          bg={fillColor}
          pointerEvents="none"
          data-testid="gantt-bar-fill"
        />
      </Box>
      {mouse && (
        <Portal>
          <Box
            position="fixed"
            left={`${mouse.x + 12}px`}
            top={`${mouse.y + 16}px`}
            bg="gray.900"
            color="white"
            px="2"
            py="1"
            fontSize="xs"
            borderRadius="sm"
            pointerEvents="none"
            zIndex="tooltip"
            data-testid="gantt-bar-tooltip"
          >
            {tooltipText}
          </Box>
        </Portal>
      )}
    </>
  );
}
