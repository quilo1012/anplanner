type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

type AbortableQuery<T> = PromiseLike<T> & {
  abortSignal?: (signal: AbortSignal) => PromiseLike<T>;
};

export type SupabaseMutationResult<T = unknown> = {
  data: T | null;
  error: unknown | null;
};

export function formatSupabaseError(error: unknown): string {
  if (!error) return 'Unknown database error';
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    const e = error as SupabaseErrorLike;
    return [e.message, e.details, e.hint].filter(Boolean).join(' — ') || JSON.stringify(error);
  }
  return String(error);
}

export async function runSupabaseQuery<T>(
  query: AbortableQuery<T>,
  label: string,
  timeoutMs = 30_000,
): Promise<T> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const abortableQuery = controller && typeof query.abortSignal === 'function'
    ? query.abortSignal(controller.signal)
    : query;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller?.abort();
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([abortableQuery, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function assertMutationSucceeded<T>(
  result: SupabaseMutationResult<T[]>,
  label: string,
): T[] {
  if (result.error) throw new Error(`${label} failed: ${formatSupabaseError(result.error)}`);
  if (!result.data || result.data.length === 0) throw new Error(`${label} returned no rows — check permissions/RLS.`);
  return result.data;
}
