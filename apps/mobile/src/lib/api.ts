import { QueryClient, useQuery } from '@tanstack/react-query';

import type { components } from '@/lib/api-types';
import { supabase } from '@/lib/supabase';

type Schemas = components['schemas'];
export type Profile = Schemas['ProfileOut'];
export type Progress = Schemas['ProgressOut'];
export type Level = Schemas['LevelInfo'];
export type DayXp = Schemas['DayXp'];
export type League = Schemas['LeagueOut'];
export type RoadmapSummary = Schemas['RoadmapSummary'];
export type Roadmap = Schemas['RoadmapOut'];
export type Step = Schemas['StepDetail'];
export type Completion = Schemas['CompletionOut'];
export type Draft = Schemas['RoadmapDraft-Output'];
export type Brief = Schemas['RoadmapBrief'];
export type DraftRun = Schemas['RoadmapDraftRun'];
export type StepSuggestions = Schemas['StepSuggestions'];
export type Listing = Schemas['ListingOut'];
export type ListingDetail = Schemas['ListingDetail'];
export type Category = Draft['category'];

export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${data.session?.access_token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const { detail } = await response.json().catch(() => ({}));
    throw new Error(typeof detail === 'string' ? detail : (detail?.[0]?.msg ?? `Request failed (${response.status})`));
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const result = await api<T>(path, method, body);
  await queryClient.invalidateQueries();
  return result;
}

export function useApi<T>(path: string | null) {
  return useQuery({ queryKey: [path], queryFn: () => api<T>(path!), enabled: path !== null });
}
