import { supabase } from '@/integrations/supabase/client';
import { QualityActionRow } from '@/types/quality';
import { assertMutationSucceeded, formatSupabaseError, runSupabaseQuery } from '@/utils/supabaseSafeQuery';

export interface SaveQualityActionsCtx {
  sessionId: string;
  productionLine: string;
  lineLeader: string;
  date: string;
  shiftType: string; // 'DAY' | 'NIGHT'
  rows: QualityActionRow[];
  recordedBy?: string | null;
}

/**
 * Replace all quality_actions for a session with the supplied list.
 */
export async function saveQualityActionsForSession(ctx: SaveQualityActionsCtx): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: delErr } = await runSupabaseQuery(
      supabase
        .from('quality_actions')
        .delete()
        .eq('session_id', ctx.sessionId),
      'Clear quality actions'
    );
    if (delErr) return { success: false, error: formatSupabaseError(delErr) };

    const valid = ctx.rows.filter(r => r.action_type_id);
    if (valid.length === 0) return { success: true };

    const payload = valid.map(r => ({
      session_id: ctx.sessionId,
      action_type_id: r.action_type_id,
      production_line: ctx.productionLine,
      line_leader: ctx.lineLeader,
      date: ctx.date,
      shift_type: ctx.shiftType,
      points: r.points,
      notes: r.notes || null,
      recorded_by: ctx.recordedBy ?? null,
    }));

    const insertRes = await runSupabaseQuery(
      supabase.from('quality_actions').insert(payload).select('id'),
      'Insert quality actions'
    );
    assertMutationSucceeded(insertRes, 'Insert quality actions');
    return { success: true };
  } catch (err) {
    console.error('[saveQualityActionsForSession] failed', err);
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function fetchQualityActionsForSessions(sessionIds: string[]) {
  if (sessionIds.length === 0) return {} as Record<string, QualityActionRow[]>;
  const chunkSize = 200;
  const chunks: string[][] = [];
  for (let i = 0; i < sessionIds.length; i += chunkSize) chunks.push(sessionIds.slice(i, i + chunkSize));
  const results = await Promise.all(chunks.map(c =>
    supabase
      .from('quality_actions')
      .select('id, session_id, action_type_id, points, notes, quality_action_types(name, severity)')
      .in('session_id', c)
  ));
  const map: Record<string, QualityActionRow[]> = {};
  for (const res of results) {
    if (res.error) continue;
    for (const row of res.data || []) {
      const sid = row.session_id as string | null;
      if (!sid) continue;
      if (!map[sid]) map[sid] = [];
      const t = row.quality_action_types as { name?: string; severity?: string } | null;
      map[sid].push({
        id: row.id,
        tempId: row.id,
        action_type_id: row.action_type_id,
        name: t?.name || '',
        points: Number(row.points) || 0,
        severity: (t?.severity as QualityActionRow['severity']) || undefined,
        notes: row.notes || '',
      });
    }
  }
  return map;
}
