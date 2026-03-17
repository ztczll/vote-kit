import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('generated_apps', (table) => {
    // AI tokens 消耗
    table.integer('tokens_used').defaultTo(0).comment('AI tokens消耗数量');
    // 费用（单位：分，例如 100 表示 1.00 元）
    table.integer('cost_cents').defaultTo(0).comment('生成费用（单位：分）');
    // 计费状态
    table.enum('billing_status', ['pending', 'calculated', 'paid', 'free']).defaultTo('pending').comment('计费状态');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('generated_apps', (table) => {
    table.dropColumn('tokens_used');
    table.dropColumn('cost_cents');
    table.dropColumn('billing_status');
  });
}

