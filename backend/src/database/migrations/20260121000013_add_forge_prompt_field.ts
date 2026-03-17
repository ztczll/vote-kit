import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 为 generated_apps 表添加 forge_prompt 字段
  await knex.schema.alterTable('generated_apps', (table) => {
    table.text('forge_prompt').nullable().comment('Coze AI生成的Forge提示词');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('generated_apps', (table) => {
    table.dropColumn('forge_prompt');
  });
}
