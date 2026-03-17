import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id').notNullable();
    table.string('plan', 30).notNullable();
    table.integer('amount').notNullable(); // cents or smallest currency unit
    table.string('provider', 20).notNullable(); // alipay, wechat
    table.string('status', 20).notNullable().defaultTo('pending'); // pending, paid, failed, cancelled
    table.timestamp('start_at').nullable();
    table.timestamp('end_at').nullable();
    table.string('transaction_id', 100).nullable();
    table.timestamps(true, true);

    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.index('user_id');
    table.index('status');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('subscriptions');
}
