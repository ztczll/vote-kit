import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE requirements 
    MODIFY COLUMN status ENUM('待审核', '投票中', '已采纳', '开发中', '测试中', '已上线', '已拒绝') 
    NOT NULL DEFAULT '待审核'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE requirements 
    MODIFY COLUMN status ENUM('待审核', '投票中', '已采纳', '已上线', '已拒绝') 
    NOT NULL DEFAULT '待审核'
  `);
}
