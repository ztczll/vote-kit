import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('generated_apps', (table) => {
    // Forge Engine 集成字段
    table.string('forge_task_id', 255).nullable(); // Forge Engine 任务ID
    table.text('git_repository_url').nullable(); // Git 仓库地址
    table.string('docker_image', 255).nullable(); // Docker 镜像名称
    table.text('deployment_url').nullable(); // 部署访问地址
    table.text('source_download_url').nullable(); // 源码下载链接
    table.string('source_file_name', 255).nullable(); // 源码文件名
    table.text('error_message').nullable(); // 错误信息
    
    // 索引
    table.index(['forge_task_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('generated_apps', (table) => {
    table.dropColumn('forge_task_id');
    table.dropColumn('git_repository_url');
    table.dropColumn('docker_image');
    table.dropColumn('deployment_url');
    table.dropColumn('source_download_url');
    table.dropColumn('source_file_name');
    table.dropColumn('error_message');
  });
}
