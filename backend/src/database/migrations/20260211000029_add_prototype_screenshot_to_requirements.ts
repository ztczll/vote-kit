import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('requirements', (table) => {
    table.string('prototype_screenshot_url', 500).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('requirements', (table) => {
    table.dropColumn('prototype_screenshot_url');
  });
}
