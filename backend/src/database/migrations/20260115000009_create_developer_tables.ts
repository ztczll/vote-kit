import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 创建 developers 表
  await knex.schema.createTable('developers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('name', 100).notNullable();
    table.string('email', 200).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.json('skills');
    table.decimal('total_earnings', 10, 2).defaultTo(0);
    table.integer('completed_tasks').defaultTo(0);
    table.timestamps(true, true);
    table.index('email');
  });

  // 创建 tasks 表
  await knex.schema.createTable('tasks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('requirement_id').notNullable();
    table.string('title', 200).notNullable();
    table.text('description');
    table.enum('difficulty', ['easy', 'medium', 'hard']).notNullable();
    table.decimal('expected_earnings', 10, 2).notNullable();
    table.enum('status', ['available', 'claimed', 'in_progress', 'completed', 'launched']).notNullable().defaultTo('available');
    table.string('claimed_by', 200);
    table.integer('progress').defaultTo(0);
    table.date('deadline');
    table.timestamps(true, true);
    table.foreign('requirement_id').references('requirements.id').onDelete('CASCADE');
    table.index('status');
    table.index('claimed_by');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('tasks');
  await knex.schema.dropTable('developers');
}
