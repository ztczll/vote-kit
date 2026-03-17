import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('teams', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('name', 100).notNullable();
    table.uuid('owner_id').notNullable();
    table.string('plan', 30).defaultTo('enterprise');
    table.integer('code_gen_pool').defaultTo(0); // team quota pool
    table.timestamps(true, true);

    table.foreign('owner_id').references('users.id').onDelete('CASCADE');
    table.index('owner_id');
  });

  await knex.schema.createTable('team_members', (table) => {
    table.increments('id').primary();
    table.uuid('team_id').notNullable();
    table.uuid('user_id').notNullable();
    table.string('role', 20).notNullable().defaultTo('member'); // admin, member
    table.timestamps(true, true);

    table.foreign('team_id').references('teams.id').onDelete('CASCADE');
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.unique(['team_id', 'user_id']);
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('team_members');
  await knex.schema.dropTableIfExists('teams');
}
