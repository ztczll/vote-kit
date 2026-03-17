import db from '../database/db';
import { Task } from '../types/models';

export class TaskService {
  async getAvailableTasks(): Promise<Task[]> {
    return await db('tasks')
      .where({ status: 'available' })
      .orderBy('expected_earnings', 'desc');
  }

  async getMyTasks(developerEmail: string): Promise<any[]> {
    console.log('🔍 getMyTasks called with email:', developerEmail);
    
    // 获取开发者ID
    const developer = await db('developers').where({ email: developerEmail }).first();
    console.log('👤 Found developer:', developer);
    
    if (!developer) {
      console.log('❌ No developer found with email:', developerEmail);
      return [];
    }

    // 1. 从 tasks 表获取认领的任务
    const claimedTasks = await db('tasks')
      .where({ claimed_by: developerEmail })
      .orderBy('created_at', 'desc');
    console.log('📋 Claimed tasks:', claimedTasks.length);

    // 2. 从 requirements 表获取分配的需求（转换为任务格式）
    const assignedRequirements = await db('requirements')
      .where({ 
        assigned_to: developer.id,
        assigned_to_type: 'developer'
      })
      .whereIn('status', ['已采纳', '开发中', '测试中'])
      .select('*');
    console.log('📌 Assigned requirements:', assignedRequirements.length, assignedRequirements);

    // 将需求转换为任务格式
    const assignedTasks = assignedRequirements.map(req => ({
      id: req.id,
      requirement_id: req.id,
      title: req.title,
      description: req.description,
      difficulty: 'medium',
      expected_earnings: 5000,
      status: req.status === '测试中' ? 'completed' : 'in_progress',
      claimed_by: developerEmail,
      progress: req.status === '测试中' ? 80 : (req.status === '开发中' ? 50 : 0),
      created_at: req.created_at,
      updated_at: req.updated_at
    }));

    console.log('✅ Total tasks:', assignedTasks.length + claimedTasks.length);
    
    // 合并两种任务
    return [...assignedTasks, ...claimedTasks];
  }

  async claimTask(taskId: string, developerEmail: string): Promise<void> {
    const task = await db('tasks').where({ id: taskId }).first();
    
    if (!task) {
      throw new Error('任务不存在');
    }
    
    if (task.status !== 'available') {
      throw new Error('任务已被认领');
    }

    await db('tasks')
      .where({ id: taskId })
      .update({
        status: 'claimed',
        claimed_by: developerEmail,
        progress: 0,
      });
  }

  async updateProgress(taskId: string, developerEmail: string, progress: number): Promise<void> {
    const task = await db('tasks').where({ id: taskId, claimed_by: developerEmail }).first();
    
    if (!task) {
      throw new Error('无权更新此任务');
    }

    const status = progress >= 100 ? 'completed' : 'in_progress';
    
    await db('tasks')
      .where({ id: taskId })
      .update({ progress, status });

    // 如果完成，更新开发者统计
    if (progress >= 100) {
      await db('developers')
        .where({ email: developerEmail })
        .increment('completed_tasks', 1)
        .increment('total_earnings', task.expected_earnings);
    }
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    return await db('tasks').where({ id: taskId }).first();
  }
}
