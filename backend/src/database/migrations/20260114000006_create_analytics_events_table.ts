import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('analytics_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id');
    table.string('event_type', 50).notNullable();
    table.json('metadata');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('event_type');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('analytics_events');
}
