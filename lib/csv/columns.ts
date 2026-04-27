// 클라이언트·서버 공유 가능. papaparse 의존 없음.

export const CSV_HEADERS = [
  '제목',
  '설명',
  '담당자',
  '상태',
  '진행률',
  '시작일',
  '목표 기한',
  '상위 작업 제목',
] as const;

export type CsvHeader = (typeof CSV_HEADERS)[number];

export type TaskStatusCode = 'todo' | 'doing' | 'done';

export const STATUS_KO_TO_CODE: Record<string, TaskStatusCode> = {
  '할 일': 'todo',
  '진행 중': 'doing',
  완료: 'done',
};

export const STATUS_CODE_TO_KO: Record<TaskStatusCode, string> = {
  todo: '할 일',
  doing: '진행 중',
  done: '완료',
};
