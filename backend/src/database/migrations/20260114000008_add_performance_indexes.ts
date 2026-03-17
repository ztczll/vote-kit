import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('requirements', (table) => {
    table.index(['status', 'vote_count', 'created_at'], 'idx_requirements_status_votes_created');
  });

  await knex.schema.table('votes', (table) => {
    table.index('created_at', 'idx_votes_created_at');
  });

  await knex.schema.table('analytics_events', (table) => {
    table.index(['user_id', 'event_type'], 'idx_analytics_user_event');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('requirements', (table) => {
    table.dropIndex(['status', 'vote_count', 'created_at'], 'idx_requirements_status_votes_created');
  });

  await knex.schema.table('votes', (table) => {
    table.dropIndex('created_at', 'idx_votes_created_at');
  });

  await knex.schema.table('analytics_events', (table) => {
    table.dropIndex(['user_id', 'event_type'], 'idx_analytics_user_event');
  });
}
