import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('votes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id').notNullable();
    table.uuid('requirement_id').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.foreign('requirement_id').references('requirements.id').onDelete('CASCADE');
    table.unique(['user_id', 'requirement_id']);
    table.index('user_id');
    table.index('requirement_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('votes');
}
