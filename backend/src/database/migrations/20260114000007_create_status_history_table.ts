import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('status_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('requirement_id').notNullable();
    table.string('from_status', 50).notNullable();
    table.string('to_status', 50).notNullable();
    table.uuid('admin_id').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('requirement_id').references('requirements.id').onDelete('CASCADE');
    table.foreign('admin_id').references('users.id').onDelete('CASCADE');
    table.index('requirement_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('status_history');
}
