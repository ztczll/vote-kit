import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_usage', (table) => {
    table.increments('id').primary();
    table.uuid('user_id').notNullable();
    table.string('month', 7).notNullable(); // YYYY-MM
    table.integer('requirement_prototype_count').defaultTo(0);
    table.integer('code_generation_count').defaultTo(0);
    table.timestamps(true, true);

    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.unique(['user_id', 'month']);
    table.index('month');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_usage');
}
