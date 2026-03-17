import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 移除外键约束
  await knex.schema.alterTable('requirements', (table) => {
    table.dropForeign('assigned_to');
  });
  
  // 添加新字段标识分配对象类型
  await knex.schema.alterTable('requirements', (table) => {
    table.enum('assigned_to_type', ['user', 'developer']).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  // 移除类型字段
  await knex.schema.alterTable('requirements', (table) => {
    table.dropColumn('assigned_to_type');
  });
  
  // 恢复外键约束
  await knex.schema.alterTable('requirements', (table) => {
    table.foreign('assigned_to').references('users.id').onDelete('SET NULL');
  });
}
