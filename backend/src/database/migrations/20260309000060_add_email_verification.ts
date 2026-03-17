import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 为用户表增加邮箱验证相关字段
  await knex.schema.alterTable('users', (table) => {
    table
      .boolean('email_verified')
      .notNullable()
      .defaultTo(false);
    table.timestamp('email_verified_at').nullable();
  });

  // 创建邮箱验证令牌表
  await knex.schema.createTable('email_verification_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id').notNullable();
    table.string('token_hash', 128).notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('used_at').nullable();
    table.string('created_ip', 64).nullable();
    table.string('created_user_agent', 255).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['token_hash']);
    table.index('user_id');
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('email_verification_tokens');

  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('email_verified');
    table.dropColumn('email_verified_at');
  });
}

