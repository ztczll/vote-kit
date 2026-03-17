import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 扩展 plans_config，增加每月基础 Credits 配额
  const hasCreditsColumn = await knex.schema.hasColumn('plans_config', 'credits_monthly');
  if (!hasCreditsColumn) {
    await knex.schema.alterTable('plans_config', (table) => {
      table.integer('credits_monthly').nullable().comment('每月基础 Credits 配额，null 表示未配置');
    });
  }

  // 用户当月 Credits 余额表（便于快速查询）
  const hasUserCredits = await knex.schema.hasTable('user_credits');
  if (!hasUserCredits) {
    await knex.schema.createTable('user_credits', (table) => {
      table.increments('id').primary();
      table.uuid('user_id').notNullable();
      table.string('month', 7).notNullable().comment('YYYY-MM');
      table.integer('credits_balance').notNullable().defaultTo(0).comment('当前可用 Credits 余额');
      table.timestamps(true, true);

      table
        .foreign('user_id')
        .references('users.id')
        .onDelete('CASCADE');
      table.unique(['user_id', 'month']);
      table.index(['month']);
    });
  }

  // Credits 变动明细表，便于审计与后台展示
  const hasCreditsTx = await knex.schema.hasTable('credits_transactions');
  if (!hasCreditsTx) {
    await knex.schema.createTable('credits_transactions', (table) => {
      table.uuid('id').primary();
      table.uuid('user_id').notNullable();
      table.string('source', 50).notNullable().comment('deepseek | kiro | topup | welcome | plan_monthly 等');
      table.integer('credits_delta').notNullable().comment('正数为增加，负数为扣减');
      table.jsonb('metadata').nullable().comment('原始 usage、模型名、任务ID等');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table
        .foreign('user_id')
        .references('users.id')
        .onDelete('CASCADE');
      table.index(['user_id', 'created_at']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasCreditsTx = await knex.schema.hasTable('credits_transactions');
  if (hasCreditsTx) {
    await knex.schema.dropTableIfExists('credits_transactions');
  }

  const hasUserCredits = await knex.schema.hasTable('user_credits');
  if (hasUserCredits) {
    await knex.schema.dropTableIfExists('user_credits');
  }

  const hasCreditsColumn = await knex.schema.hasColumn('plans_config', 'credits_monthly');
  if (hasCreditsColumn) {
    await knex.schema.alterTable('plans_config', (table) => {
      table.dropColumn('credits_monthly');
    });
  }
}

