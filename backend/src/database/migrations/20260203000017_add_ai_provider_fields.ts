import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('requirements', (table) => {
    table.string('ai_provider', 50).defaultTo('deepseek');
  });

  await knex.schema.alterTable('development_plans', (table) => {
    table.string('ai_provider', 50).defaultTo('deepseek');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('requirements', (table) => {
    table.dropColumn('ai_provider');
  });

  await knex.schema.alterTable('development_plans', (table) => {
    table.dropColumn('ai_provider');
  });
}
