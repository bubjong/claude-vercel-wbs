import { Badge } from '@chakra-ui/react';

const STATUS_LABEL = {
  todo: '할 일',
  doing: '진행 중',
  done: '완료',
} as const;

const STATUS_COLOR = {
  todo: 'gray',
  doing: 'blue',
  done: 'green',
} as const;

type Status = keyof typeof STATUS_LABEL;

function isStatus(value: string): value is Status {
  return value in STATUS_LABEL;
}

export function StatusBadge({ status }: { status: string }) {
  const safe: Status = isStatus(status) ? status : 'todo';
  return (
    <Badge colorPalette={STATUS_COLOR[safe]} variant="subtle">
      {STATUS_LABEL[safe]}
    </Badge>
  );
}
