import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('feedback', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('type', 32).notNullable();
    table.text('content').notNullable();
    table.string('contact', 200);
    table.uuid('user_id');
    table.string('page_url', 500);
    table.string('status', 32).notNullable().defaultTo('pending');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('created_at');
    table.index('type');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('feedback');
}
