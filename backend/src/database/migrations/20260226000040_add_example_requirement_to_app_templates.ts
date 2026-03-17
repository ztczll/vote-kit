import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('app_templates', (table) => {
    table
      .string('example_requirement_id', 36)
      .nullable()
      .comment('示例需求 ID，用于模板页跳转与原型封面展示');
    table.index(['example_requirement_id'], 'idx_app_templates_example_requirement_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('app_templates', (table) => {
    table.dropIndex(['example_requirement_id'], 'idx_app_templates_example_requirement_id');
    table.dropColumn('example_requirement_id');
  });
}

