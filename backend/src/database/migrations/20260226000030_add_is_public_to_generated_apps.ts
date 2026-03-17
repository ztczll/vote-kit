import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('generated_apps', (table) => {
    table.boolean('is_public').defaultTo(false).comment('是否在应用广场公开展示');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('generated_apps', (table) => {
    table.dropColumn('is_public');
  });
}
