import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('gen_tasks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.uuid('user_id').nullable();
    table.uuid('team_id').nullable();
    table.uuid('requirement_id').nullable();
    table.integer('generated_app_id').unsigned().nullable();
    table.string('priority', 20).notNullable().defaultTo('normal'); // normal, priority, dedicated
    table.string('status', 30).notNullable().defaultTo('pending'); // pending, running, completed, failed
    table.text('result_artifact_url').nullable();
    table.text('error_message').nullable();
    table.timestamps(true, true);

    table.index('user_id');
    table.index('team_id');
    table.index('status');
    table.index(['priority', 'created_at']);
    table.foreign('requirement_id').references('requirements.id').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('gen_tasks');
}
