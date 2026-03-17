import { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  // 清空 developers 表
  await knex('developers').del();

  // 创建测试开发者账号
  const password_hash = await bcrypt.hash('password123', 10);

  await knex('developers').insert([
    {
      name: '张三',
      email: 'dev@votekit.com',
      password_hash,
      skills: JSON.stringify(['Vue', 'React', 'Node.js']),
      total_earnings: 0,
      completed_tasks: 0,
    },
    {
      name: '李四',
      email: 'dev2@votekit.com',
      password_hash,
      skills: JSON.stringify(['Python', 'Django', 'FastAPI']),
      total_earnings: 5000,
      completed_tasks: 2,
    },
  ]);

  console.log('✅ 开发者测试账号创建成功！');
  console.log('账号1: dev@votekit.com / password123');
  console.log('账号2: dev2@votekit.com / password123');
}
