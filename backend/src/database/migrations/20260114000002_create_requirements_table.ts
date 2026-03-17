import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('requirements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('title', 200).notNullable();
    table.text('description').notNullable();
    table.string('category', 50).notNullable();
    table.string('contact_info', 200);
    table.enum('status', ['待审核', '投票中', '已采纳', '已上线', '已拒绝']).notNullable().defaultTo('待审核');
    table.uuid('submitter_id').notNullable();
    table.integer('vote_count').notNullable().defaultTo(0);
    table.timestamps(true, true);
    table.foreign('submitter_id').references('users.id').onDelete('CASCADE');
    table.index('status');
    table.index('vote_count');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('requirements');
}
