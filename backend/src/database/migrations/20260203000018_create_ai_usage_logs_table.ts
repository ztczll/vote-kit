import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('ai_usage_logs', (table) => {
    table.increments('id').primary();
    table.string('provider', 50).notNullable();
    table.string('model', 100);
    table.string('operation', 100).notNullable();
    table.integer('input_tokens');
    table.integer('output_tokens');
    table.decimal('cost', 10, 6);
    table.boolean('success').defaultTo(true);
    table.text('error_message');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['provider', 'created_at']);
    table.index(['operation', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('ai_usage_logs');
}
