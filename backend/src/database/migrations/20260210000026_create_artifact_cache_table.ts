import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('artifact_cache', (table) => {
    table.increments('id').primary();
    table.string('content_hash', 64).notNullable();
    table.string('storage_path', 500).notNullable();
    table.timestamp('expires_at').nullable();
    table.uuid('user_id').nullable();
    table.string('artifact_type', 30).nullable(); // requirement_doc, html, code_package
    table.timestamps(true, true);

    table.unique('content_hash');
    table.index('expires_at');
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('artifact_cache');
}
