import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('requirements', (table) => {
    table.text('scene');
    table.text('pain');
    table.text('features');
    table.text('extra');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('requirements', (table) => {
    table.dropColumn('scene');
    table.dropColumn('pain');
    table.dropColumn('features');
    table.dropColumn('extra');
  });
}
