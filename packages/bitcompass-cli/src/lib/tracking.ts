import { getSupabaseClient, getCurrentUserId } from '../api/client.js';
import { getProjectConfig } from '../auth/project-config.js';

/**
 * Fire-and-forget: inserts a download record after each pull.
 * Never throws – errors are silently swallowed so pulls are never blocked.
 */
export const trackDownload = (ruleId: string, source: 'cli' | 'mcp' | 'sync' = 'cli'): void => {
  void (async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;
      const client = await getSupabaseClient();
      if (!client) return;
      const config = getProjectConfig({ warnIfMissing: false });
      await client.from('downloads').insert({
        rule_id: ruleId,
        user_id: userId,
        editor: config?.editor ?? null,
        compass_project_id: config?.compassProjectId ?? null,
        source,
      });
    } catch { /* silent */ }
  })();
};
