import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('app_deployments');
  if (!hasTable) {
    return knex.schema.createTable('app_deployments', (table) => {
      table.increments('id').primary();
      table.integer('app_id').unsigned().notNullable();
      table.string('docker_container_id', 255);
      table.integer('port').unsigned();
      table.enum('status', ['pending', 'building', 'running', 'stopped', 'failed']).defaultTo('pending');
      table.text('logs');
      table.json('config');
      table.timestamps(true, true);
      
      table.foreign('app_id').references('id').inTable('generated_apps').onDelete('CASCADE');
      table.index(['app_id', 'status']);
      table.index(['docker_container_id']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('app_deployments');
}
