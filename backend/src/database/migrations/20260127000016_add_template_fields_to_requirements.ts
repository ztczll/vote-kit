import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('requirements', (table) => {
    table.uuid('app_template_id').nullable();
    table.text('prompt_template_ids').nullable(); // JSON: {"ui_ux":"uuid","tech_arch":"uuid"}
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('requirements', (table) => {
    table.dropColumn('app_template_id');
    table.dropColumn('prompt_template_ids');
  });
}
