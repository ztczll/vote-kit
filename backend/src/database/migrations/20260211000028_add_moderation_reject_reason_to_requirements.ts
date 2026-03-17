import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('requirements', (table) => {
    table.text('moderation_reject_reason').nullable().comment('AI 内容审核不通过原因');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('requirements', (table) => {
    table.dropColumn('moderation_reject_reason');
  });
}
