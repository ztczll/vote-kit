import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('username', 50).notNullable().unique();
    table.string('email', 100).notNullable();
    table.string('password_hash', 255).notNullable();
    table.enum('role', ['user', 'admin']).notNullable().defaultTo('user');
    table.timestamps(true, true);
    table.index('username');
    table.index('email');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users');
}
