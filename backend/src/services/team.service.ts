import db from '../database/db';
import { randomUUID } from 'crypto';

export async function createTeam(ownerId: string, name: string): Promise<{ id: string }> {
  const id = randomUUID();
  await db('teams').insert({
    id,
    name,
    owner_id: ownerId,
    plan: 'enterprise',
    code_gen_pool: 0,
  });
  await db('team_members').insert({
    team_id: id,
    user_id: ownerId,
    role: 'admin',
  });
  return { id };
}

export async function getTeamsForUser(userId: string): Promise<Array<{ id: string; name: string; role: string; code_gen_pool: number }>> {
  const rows = await db('team_members')
    .join('teams', 'teams.id', 'team_members.team_id')
    .where('team_members.user_id', userId)
    .select('teams.id', 'teams.name', 'team_members.role', 'teams.code_gen_pool');
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    code_gen_pool: r.code_gen_pool || 0,
  }));
}

export async function inviteMember(teamId: string, inviterId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<void> {
  const team = await db('teams').where({ id: teamId }).first();
  if (!team || team.owner_id !== inviterId) throw new Error('无权限');
  const existing = await db('team_members').where({ team_id: teamId, user_id: userId }).first();
  if (existing) throw new Error('已在团队中');
  await db('team_members').insert({ team_id: teamId, user_id: userId, role });
}

export async function setTeamQuota(teamId: string, adminUserId: string, codeGenPool: number): Promise<void> {
  const member = await db('team_members').where({ team_id: teamId, user_id: adminUserId }).first();
  if (!member || member.role !== 'admin') throw new Error('无权限');
  await db('teams').where({ id: teamId }).update({ code_gen_pool: codeGenPool, updated_at: db.fn.now() });
}
