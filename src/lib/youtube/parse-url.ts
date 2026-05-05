import type { ParsedChannelInput } from './types';

const HANDLE_RE = /^@([A-Za-z0-9._-]+)$/;
const URL_HANDLE_RE = /(?:youtube\.com|youtu\.be)\/@([A-Za-z0-9._-]+)/;
const URL_ID_RE = /(?:youtube\.com|youtu\.be)\/channel\/(UC[\w-]{20,})/;
const URL_CUSTOM_RE = /(?:youtube\.com|youtu\.be)\/c\/([A-Za-z0-9._-]+)/;

// המרת קלט משתמש לסוג + value נורמלי לקריאה ל-channels.list
export function parseChannelInput(rawInput: string): ParsedChannelInput {
  const raw = rawInput;
  const trimmed = rawInput.trim();
  if (!trimmed) throw new Error('Empty channel input');

  // bare @handle
  const handleMatch = trimmed.match(HANDLE_RE);
  if (handleMatch) {
    return { kind: 'handle', value: handleMatch[1], raw };
  }

  // /channel/UC...
  const idMatch = trimmed.match(URL_ID_RE);
  if (idMatch) {
    return { kind: 'id', value: idMatch[1], raw };
  }

  // /@handle anywhere in URL
  const urlHandleMatch = trimmed.match(URL_HANDLE_RE);
  if (urlHandleMatch) {
    return { kind: 'handle', value: urlHandleMatch[1], raw };
  }

  // /c/custom
  const customMatch = trimmed.match(URL_CUSTOM_RE);
  if (customMatch) {
    return { kind: 'custom', value: customMatch[1], raw };
  }

  throw new Error(`Could not parse channel input: ${trimmed}`);
}
