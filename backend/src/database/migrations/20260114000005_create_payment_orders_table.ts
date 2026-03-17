import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('payment_orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id').notNullable();
    table.uuid('app_id').notNullable();
    table.integer('amount').notNullable();
    table.enum('provider', ['alipay', 'wechat']).notNullable();
    table.enum('status', ['pending', 'paid', 'failed']).notNullable().defaultTo('pending');
    table.string('transaction_id', 100);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('paid_at');
    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.index('user_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('payment_orders');
}
