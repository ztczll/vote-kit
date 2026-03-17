import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('quota_topups', (table) => {
    table.increments('id').primary();
    table.uuid('user_id').notNullable();
    table.string('type', 30).notNullable(); // e.g. code_gen
    table.integer('quantity').notNullable();
    table.integer('remaining').notNullable();
    table.timestamp('expires_at').nullable();
    table.timestamps(true, true);

    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.index(['user_id', 'type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('quota_topups');
}
