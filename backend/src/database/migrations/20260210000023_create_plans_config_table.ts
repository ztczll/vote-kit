import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('plans_config', (table) => {
    table.string('plan', 30).primary();
    table.integer('requirement_limit').notNullable(); // -1 = unlimited
    table.integer('code_gen_limit').notNullable();
    table.integer('cache_days').notNullable(); // 0 = no cache, -1 = permanent
    table.integer('price_monthly').nullable(); // cents, null = custom
    table.string('queue_priority', 20).defaultTo('normal'); // normal, priority, dedicated
    table.timestamps(true, true);
  });

  await knex('plans_config').insert([
    { plan: 'free', requirement_limit: 5, code_gen_limit: 1, cache_days: 7, price_monthly: 0, queue_priority: 'normal' },
    { plan: 'pro', requirement_limit: 50, code_gen_limit: 10, cache_days: 30, price_monthly: 2900, queue_priority: 'normal' },
    { plan: 'pro_plus', requirement_limit: 300, code_gen_limit: 50, cache_days: 90, price_monthly: 9900, queue_priority: 'priority' },
    { plan: 'enterprise', requirement_limit: -1, code_gen_limit: 200, cache_days: -1, price_monthly: null, queue_priority: 'dedicated' },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('plans_config');
}
