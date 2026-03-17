import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('generated_apps');
  if (!hasTable) {
    return knex.schema.createTable('generated_apps', (table) => {
      table.increments('id').primary();
      table.uuid('requirement_id').notNullable();
      table.string('name', 255).notNullable();
      table.text('description');
      table.string('subdomain', 100).unique().notNullable();
      table.enum('status', ['generating', 'ready', 'deploying', 'running', 'stopped', 'error']).defaultTo('generating');
      table.uuid('created_by').notNullable();
      table.timestamps(true, true);
      
      table.foreign('requirement_id').references('id').inTable('requirements').onDelete('CASCADE');
      table.foreign('created_by').references('id').inTable('users').onDelete('CASCADE');
      table.index(['status', 'created_at']);
      table.index(['created_by']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('generated_apps');
}
