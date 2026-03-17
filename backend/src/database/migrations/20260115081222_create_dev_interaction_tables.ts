import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // development_plans 表
  await knex.schema.createTable('development_plans', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('requirement_id').notNullable().unique();
    table.datetime('voting_end_date').notNullable();
    table.enum('status', ['voting', 'development', 'testing', 'completed']).notNullable().defaultTo('voting');
    table.timestamps(true, true);
    table.foreign('requirement_id').references('requirements.id').onDelete('CASCADE');
    table.index('requirement_id');
  });

  // plan_features 表
  await knex.schema.createTable('plan_features', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('plan_id').notNullable();
    table.string('title', 200).notNullable();
    table.text('description');
    table.integer('priority').notNullable().defaultTo(0);
    table.integer('must_have_votes').notNullable().defaultTo(0);
    table.integer('nice_to_have_votes').notNullable().defaultTo(0);
    table.timestamps(true, true);
    table.foreign('plan_id').references('development_plans.id').onDelete('CASCADE');
    table.index('plan_id');
  });

  // feature_votes 表
  await knex.schema.createTable('feature_votes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('feature_id').notNullable();
    table.uuid('user_id').notNullable();
    table.enum('vote_type', ['must_have', 'nice_to_have']).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('feature_id').references('plan_features.id').onDelete('CASCADE');
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.unique(['feature_id', 'user_id']);
    table.index('feature_id');
    table.index('user_id');
  });

  // dev_logs 表
  await knex.schema.createTable('dev_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('requirement_id').notNullable();
    table.uuid('developer_id').notNullable();
    table.string('title', 200).notNullable();
    table.text('content').notNullable();
    table.enum('log_type', ['feature', 'design', 'bugfix', 'milestone']).notNullable();
    table.integer('likes_count').notNullable().defaultTo(0);
    table.integer('comments_count').notNullable().defaultTo(0);
    table.timestamps(true, true);
    table.foreign('requirement_id').references('requirements.id').onDelete('CASCADE');
    table.foreign('developer_id').references('developers.id').onDelete('CASCADE');
    table.index('requirement_id');
    table.index(['requirement_id', 'created_at']);
  });

  // log_likes 表
  await knex.schema.createTable('log_likes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('log_id').notNullable();
    table.uuid('user_id').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('log_id').references('dev_logs.id').onDelete('CASCADE');
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.unique(['log_id', 'user_id']);
    table.index('log_id');
  });

  // log_comments 表
  await knex.schema.createTable('log_comments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('log_id').notNullable();
    table.uuid('user_id').notNullable();
    table.text('content').notNullable();
    table.timestamps(true, true);
    table.foreign('log_id').references('dev_logs.id').onDelete('CASCADE');
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.index('log_id');
    table.index(['log_id', 'created_at']);
  });

  // beta_applications 表
  await knex.schema.createTable('beta_applications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('requirement_id').notNullable();
    table.uuid('user_id').notNullable();
    table.string('email', 200).notNullable();
    table.string('device_type', 100).notNullable();
    table.string('available_hours', 100).notNullable();
    table.enum('status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    table.datetime('applied_at').notNullable().defaultTo(knex.fn.now());
    table.datetime('approved_at');
    table.foreign('requirement_id').references('requirements.id').onDelete('CASCADE');
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.unique(['requirement_id', 'user_id']);
    table.index('requirement_id');
    table.index(['requirement_id', 'status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('beta_applications');
  await knex.schema.dropTableIfExists('log_comments');
  await knex.schema.dropTableIfExists('log_likes');
  await knex.schema.dropTableIfExists('dev_logs');
  await knex.schema.dropTableIfExists('feature_votes');
  await knex.schema.dropTableIfExists('plan_features');
  await knex.schema.dropTableIfExists('development_plans');
}
