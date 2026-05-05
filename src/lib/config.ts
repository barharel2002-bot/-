// בודק אם המפתחות הסביבתיים מוגדרים
// משמש להצגת מסך setup-required במקום קריסה

export function isSupabaseConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
  );
}

export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function isPushConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;
}

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function isYouTubeConfigured(): boolean {
  return !!process.env.YOUTUBE_API_KEY;
}

// OAuth של YouTube — להתחברות אישית של היוצר (analytics אמיתי)
export function isYouTubeOAuthConfigured(): boolean {
  return (
    !!process.env.GOOGLE_OAUTH_CLIENT_ID &&
    !!process.env.GOOGLE_OAUTH_CLIENT_SECRET
  );
}

// Instagram — דורש Meta App Review בנוסף ל-keys
export function isInstagramOAuthConfigured(): boolean {
  return !!process.env.META_APP_ID && !!process.env.META_APP_SECRET;
}

// TikTok — דורש App Review בנוסף ל-keys
export function isTikTokOAuthConfigured(): boolean {
  return !!process.env.TIKTOK_CLIENT_KEY && !!process.env.TIKTOK_CLIENT_SECRET;
}

// רשימת מה שחסר — לשימוש במסך setup
export function getMissingConfig() {
  const missing: string[] = [];
  if (!isSupabaseConfigured()) missing.push('Supabase');
  if (!isAnthropicConfigured()) missing.push('Anthropic');
  if (!isPushConfigured()) missing.push('VAPID (Push)');
  if (!isOpenAIConfigured()) missing.push('OpenAI (Whisper)');
  if (!isYouTubeConfigured()) missing.push('YouTube');
  return missing;
}
