import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('generated_apps', (table) => {
    table
      .string('deploy_mode', 20)
      .nullable()
      .comment('部署模式：local / registry');
    table
      .string('image_name', 255)
      .nullable()
      .comment('部署所用完整镜像名（含 registry 时）');
    table
      .string('jenkins_job_name', 255)
      .nullable()
      .comment('触发构建的 Jenkins 任务名');
    table
      .string('jenkins_build_url', 500)
      .nullable()
      .comment('最近一次 Jenkins 构建 URL');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('generated_apps', (table) => {
    table.dropColumn('deploy_mode');
    table.dropColumn('image_name');
    table.dropColumn('jenkins_job_name');
    table.dropColumn('jenkins_build_url');
  });
}

