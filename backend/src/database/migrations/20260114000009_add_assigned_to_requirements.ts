import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('requirements', (table) => {
    table.uuid('assigned_to');
    table.foreign('assigned_to').references('users.id').onDelete('SET NULL');
    table.index('assigned_to');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('requirements', (table) => {
    table.dropForeign(['assigned_to']);
    table.dropColumn('assigned_to');
  });
}
