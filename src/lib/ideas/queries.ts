import { createClient } from '@/lib/supabase/server';
import type { IdeaStatus, IdeaTag } from '@/types';

export interface IdeaRow {
  id: string;
  user_id: string;
  content: string;
  voice_transcript: string | null;
  image_url: string | null;
  tags: IdeaTag[];
  status: IdeaStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// שולף את כל הרעיונות של המשתמש המחובר
export async function fetchIdeas(): Promise<IdeaRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ideas.fetch] failed:', error.message);
    return [];
  }

  return (data ?? []) as IdeaRow[];
}
