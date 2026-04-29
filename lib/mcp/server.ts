import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  listTasks,
  getTask,
  createTaskTool,
  updateTaskTool,
  deleteTaskTool,
  listTasksInputShape,
  getTaskInputShape,
  createTaskInputShape,
  updateTaskInputShape,
  deleteTaskInputShape,
} from './tools/tasks';

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: 'wbs-tasks-mcp', version: '1.0.0' });

  server.registerTool(
    'list_tasks',
    {
      description: 'WBS 전체 Task 목록을 createdAt 오름차순으로 반환한다.',
      inputSchema: listTasksInputShape,
    },
    async () => listTasks()
  );

  server.registerTool(
    'get_task',
    {
      description: 'id로 단일 Task를 조회한다. 없으면 에러를 반환한다.',
      inputSchema: getTaskInputShape,
    },
    async (input) => getTask(input)
  );

  server.registerTool(
    'create_task',
    {
      description: '새 Task를 생성한다. 진행률 100이면 status는 자동으로 done이 된다.',
      inputSchema: createTaskInputShape,
    },
    async (input) => createTaskTool(input)
  );

  server.registerTool(
    'update_task',
    {
      description:
        'Task 일부 필드를 수정한다. 진행률 100이면 status가 자동으로 done이 된다(역방향은 없음).',
      inputSchema: updateTaskInputShape,
    },
    async (input) => updateTaskTool(input)
  );

  server.registerTool(
    'delete_task',
    {
      description: 'Task를 삭제한다. 자식 Task는 DB cascade로 함께 삭제된다.',
      inputSchema: deleteTaskInputShape,
    },
    async (input) => deleteTaskTool(input)
  );

  return server;
}
