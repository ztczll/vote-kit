import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // 清空 tasks 表
  await knex('tasks').del();

  // 获取一些需求ID
  const requirements = await knex('requirements').select('id', 'title').limit(5);

  if (requirements.length === 0) {
    console.log('⚠️  没有需求数据，跳过任务种子数据');
    return;
  }

  const tasks = [
    {
      requirement_id: requirements[0]?.id,
      title: '开发微信图片自动整理工具',
      description: '实现自动保存微信聊天图片并按群组分类的功能',
      difficulty: 'medium',
      expected_earnings: 2000,
      status: 'available',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
    },
    {
      requirement_id: requirements[1]?.id || requirements[0]?.id,
      title: '番茄钟专注应用',
      description: '开发一个简洁的番茄钟计时器，支持任务记录和统计',
      difficulty: 'easy',
      expected_earnings: 800,
      status: 'available',
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    },
    {
      requirement_id: requirements[2]?.id || requirements[0]?.id,
      title: '智能待办事项管理系统',
      description: '开发支持AI智能提醒和优先级排序的待办事项应用',
      difficulty: 'hard',
      expected_earnings: 5000,
      status: 'available',
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
  ];

  await knex('tasks').insert(tasks);

  console.log('✅ 任务种子数据创建成功！');
  console.log(`创建了 ${tasks.length} 个示例任务`);
}
