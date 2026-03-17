import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ai_usage_logs', (table) => {
    table.uuid('user_id').nullable();
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ai_usage_logs', (table) => {
    table.dropIndex(['user_id']);
    table.dropColumn('user_id');
  });
}
