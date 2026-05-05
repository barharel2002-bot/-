// SQL סכמה — מוצגת באשף ההגדרה כדי שהמשתמש יוכל להעתיק ולהדביק
// זהה לקובץ supabase/schema.sql — אם משנים שם, להחליף גם פה

export const SUPABASE_SCHEMA_SQL = `-- מצב יוצר — סכמת בסיס הנתונים המלאה
-- הרץ את הקובץ הזה ב-Supabase: SQL Editor → New query → הדבק → Run

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  why_i_create TEXT,
  for_whom TEXT,
  preferred_locale TEXT DEFAULT 'he' CHECK (preferred_locale IN ('he', 'en')),
  reminder_frequency TEXT DEFAULT 'daily_morning'
    CHECK (reminder_frequency IN ('daily_morning', 'daily_evening', 'twice_week', 'weekly')),
  push_subscription JSONB,
  ai_monthly_budget_cents INT DEFAULT 5000,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  total_input_tokens BIGINT DEFAULT 0,
  total_output_tokens BIGINT DEFAULT 0,
  estimated_cost_cents INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month)
);

CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  voice_transcript TEXT,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS idea_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS video_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  video_url TEXT,
  file_name TEXT,
  file_size_bytes BIGINT,
  duration_seconds FLOAT,
  analysis_result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS swipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('videos', 'edit_styles', 'photos')),
  source_url TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('instagram', 'tiktok', 'other')),
  thumbnail_url TEXT,
  title TEXT,
  author_name TEXT,
  embed_html TEXT,
  decision TEXT CHECK (decision IN ('liked', 'skipped')),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('copy', 'analyze', 'develop')),
  feedback_text TEXT NOT NULL,
  original_output TEXT,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS published_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL
    CHECK (content_type IN ('story', 'short_video', 'long_video', 'post', 'carousel')),
  platform TEXT CHECK (platform IN ('instagram', 'tiktok', 'both')),
  title TEXT,
  description TEXT,
  tone TEXT CHECK (tone IN ('inspirational', 'educational', 'personal', 'funny', 'value')),
  is_draft BOOLEAN DEFAULT false,
  idea_id UUID REFERENCES ideas(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES published_content(id) ON DELETE CASCADE,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  saves INT DEFAULT 0,
  shares INT DEFAULT 0,
  comments INT DEFAULT 0,
  avg_watch_time_seconds FLOAT,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS youtube_saved (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  title TEXT,
  channel_name TEXT,
  thumbnail_url TEXT,
  category TEXT,
  is_watched BOOLEAN DEFAULT false,
  is_useful BOOLEAN DEFAULT false,
  saved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ideas_user ON ideas(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ideas_tags ON ideas USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_swipe_items_user_cat ON swipe_items(user_id, category, decision);
CREATE INDEX IF NOT EXISTS idx_published_content_user ON published_content(user_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_agent ON ai_feedback(user_id, agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_month ON ai_usage(user_id, month);
CREATE INDEX IF NOT EXISTS idx_idea_conversations_idea ON idea_conversations(idea_id, created_at);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_saved ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile" ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users manage own ai_usage" ON ai_usage FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own ideas" ON ideas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own idea_conversations" ON idea_conversations FOR ALL
  USING (EXISTS (SELECT 1 FROM ideas WHERE ideas.id = idea_conversations.idea_id AND ideas.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM ideas WHERE ideas.id = idea_conversations.idea_id AND ideas.user_id = auth.uid()));
CREATE POLICY "Users manage own video_analyses" ON video_analyses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own swipe_items" ON swipe_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own ai_feedback" ON ai_feedback FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own published_content" ON published_content FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own content_metrics" ON content_metrics FOR ALL
  USING (EXISTS (SELECT 1 FROM published_content WHERE published_content.id = content_metrics.content_id AND published_content.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM published_content WHERE published_content.id = content_metrics.content_id AND published_content.user_id = auth.uid()));
CREATE POLICY "Users manage own youtube_saved" ON youtube_saved FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic AI usage increment
CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_user_id UUID,
  p_month TEXT,
  p_input BIGINT,
  p_output BIGINT,
  p_cost INT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_usage (user_id, month, total_input_tokens, total_output_tokens, estimated_cost_cents)
  VALUES (p_user_id, p_month, p_input, p_output, p_cost)
  ON CONFLICT (user_id, month) DO UPDATE SET
    total_input_tokens = ai_usage.total_input_tokens + EXCLUDED.total_input_tokens,
    total_output_tokens = ai_usage.total_output_tokens + EXCLUDED.total_output_tokens,
    estimated_cost_cents = ai_usage.estimated_cost_cents + EXCLUDED.estimated_cost_cents,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;
