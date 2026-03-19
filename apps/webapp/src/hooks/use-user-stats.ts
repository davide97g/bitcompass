import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Profile, RuleKind } from '@/types/bitcompass';

export interface UserStats {
  profile: Profile;
  rules: number;
  docs: number;
  skills: number;
  commands: number;
  total: number;
  publicCount: number;
  privateCount: number;
  sharedProjects: number;
}

interface RuleRow {
  user_id: string;
  kind: RuleKind;
  visibility: 'private' | 'public';
}

interface MemberRow {
  user_id: string;
  project_id: string;
}

const fetchAllUserStats = async (): Promise<UserStats[]> => {
  if (!supabase) return [];

  // Fetch all data in parallel
  const [rulesRes, membersRes, profilesRes] = await Promise.all([
    supabase.from('rules').select('user_id, kind, visibility'),
    supabase.from('compass_project_members').select('user_id, project_id'),
    supabase.from('profiles').select('*'),
  ]);

  if (rulesRes.error) throw rulesRes.error;
  if (membersRes.error) throw membersRes.error;
  if (profilesRes.error) throw profilesRes.error;

  const rules = (rulesRes.data ?? []) as RuleRow[];
  const members = (membersRes.data ?? []) as MemberRow[];
  const profiles = (profilesRes.data ?? []) as Profile[];

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // Aggregate rules by user
  const userRules = new Map<string, { rule: number; documentation: number; skill: number; command: number; public: number; private: number }>();
  for (const r of rules) {
    let entry = userRules.get(r.user_id);
    if (!entry) {
      entry = { rule: 0, documentation: 0, skill: 0, command: 0, public: 0, private: 0 };
      userRules.set(r.user_id, entry);
    }
    entry[r.kind]++;
    entry[r.visibility]++;
  }

  // Count projects per user
  const userProjects = new Map<string, Set<string>>();
  for (const m of members) {
    let set = userProjects.get(m.user_id);
    if (!set) {
      set = new Set();
      userProjects.set(m.user_id, set);
    }
    set.add(m.project_id);
  }

  // Collect all user IDs that have either rules or project memberships
  const allUserIds = new Set([...userRules.keys(), ...userProjects.keys()]);

  const stats: UserStats[] = [];
  for (const userId of allUserIds) {
    const profile = profileMap.get(userId);
    if (!profile) continue;

    const r = userRules.get(userId) ?? { rule: 0, documentation: 0, skill: 0, command: 0, public: 0, private: 0 };
    stats.push({
      profile,
      rules: r.rule,
      docs: r.documentation,
      skills: r.skill,
      commands: r.command,
      total: r.rule + r.documentation + r.skill + r.command,
      publicCount: r.public,
      privateCount: r.private,
      sharedProjects: userProjects.get(userId)?.size ?? 0,
    });
  }

  // Sort by total contributions descending
  stats.sort((a, b) => b.total - a.total);
  return stats;
};

export const useAllUserStats = () => {
  return useQuery({
    queryKey: ['all-user-stats'],
    queryFn: fetchAllUserStats,
    enabled: Boolean(supabase),
  });
};

/** Stats for a single user (rules by kind + visibility + project count). */
const fetchUserStats = async (userId: string): Promise<Omit<UserStats, 'profile'> | null> => {
  if (!supabase) return null;

  const [rulesRes, membersRes] = await Promise.all([
    supabase.from('rules').select('kind, visibility').eq('user_id', userId),
    supabase.from('compass_project_members').select('project_id').eq('user_id', userId),
  ]);

  if (rulesRes.error) throw rulesRes.error;
  if (membersRes.error) throw membersRes.error;

  const rules = (rulesRes.data ?? []) as { kind: RuleKind; visibility: 'private' | 'public' }[];
  const members = (membersRes.data ?? []) as { project_id: string }[];

  const counts = { rule: 0, documentation: 0, skill: 0, command: 0, public: 0, private: 0 };
  for (const r of rules) {
    counts[r.kind]++;
    counts[r.visibility]++;
  }

  const uniqueProjects = new Set(members.map((m) => m.project_id));

  return {
    rules: counts.rule,
    docs: counts.documentation,
    skills: counts.skill,
    commands: counts.command,
    total: counts.rule + counts.documentation + counts.skill + counts.command,
    publicCount: counts.public,
    privateCount: counts.private,
    sharedProjects: uniqueProjects.size,
  };
};

export const useUserStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-stats', userId],
    queryFn: () => (userId ? fetchUserStats(userId) : Promise.resolve(null)),
    enabled: Boolean(supabase && userId),
  });
};
