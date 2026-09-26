import { api } from '@src/shared/api/client';

import type { ExtractedSource } from '../domain/extractedSource';

/** POST /api/sources — SPEC-001. */
export function extractSource(url: string): Promise<ExtractedSource> {
  return api.post<ExtractedSource>('/sources', { url });
}
