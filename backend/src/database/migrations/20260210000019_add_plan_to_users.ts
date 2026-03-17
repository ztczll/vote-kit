import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('plan', 30).defaultTo('free');
    table.timestamp('plan_expires_at').nullable();
    table.string('phone', 20).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('plan');
    table.dropColumn('plan_expires_at');
    table.dropColumn('phone');
  });
}
