import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('app_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('name', 100).notNullable();
    table.string('type_key', 50).notNullable();
    table.text('layer1_product_vision');
    table.text('layer2_functional_spec');
    table.text('layer3_impl_guidance');
    table.text('layer4_deployment_spec');
    table.integer('sort_order').notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
    table.index('is_active');
    table.index('sort_order');
  });

  await knex.schema.createTable('prompt_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('(UUID())'));
    table.string('dimension', 50).notNullable();
    table.string('title', 200).notNullable();
    table.text('content').notNullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
    table.index('dimension');
    table.index(['dimension', 'is_active']);
    table.index('sort_order');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('prompt_templates');
  await knex.schema.dropTableIfExists('app_templates');
}
