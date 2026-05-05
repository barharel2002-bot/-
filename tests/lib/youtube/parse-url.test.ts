import { describe, it, expect } from 'vitest';
import { parseChannelInput } from '@/lib/youtube/parse-url';

describe('parseChannelInput', () => {
  it('parses bare @handle', () => {
    expect(parseChannelInput('@AliAbdaal')).toEqual({
      kind: 'handle',
      value: 'AliAbdaal',
      raw: '@AliAbdaal',
    });
  });

  it('parses youtube.com/@handle', () => {
    expect(parseChannelInput('https://youtube.com/@AliAbdaal')).toEqual({
      kind: 'handle',
      value: 'AliAbdaal',
      raw: 'https://youtube.com/@AliAbdaal',
    });
  });

  it('parses www.youtube.com/@handle with trailing slash', () => {
    expect(parseChannelInput('https://www.youtube.com/@AliAbdaal/')).toMatchObject({
      kind: 'handle',
      value: 'AliAbdaal',
    });
  });

  it('parses /channel/UC...', () => {
    expect(
      parseChannelInput('https://youtube.com/channel/UCJ24N4O0bP7LGLBDvye7oCA')
    ).toEqual({
      kind: 'id',
      value: 'UCJ24N4O0bP7LGLBDvye7oCA',
      raw: 'https://youtube.com/channel/UCJ24N4O0bP7LGLBDvye7oCA',
    });
  });

  it('parses /c/customname', () => {
    expect(parseChannelInput('https://youtube.com/c/MattDAvella')).toEqual({
      kind: 'custom',
      value: 'MattDAvella',
      raw: 'https://youtube.com/c/MattDAvella',
    });
  });

  it('throws on empty input', () => {
    expect(() => parseChannelInput('')).toThrow();
    expect(() => parseChannelInput('   ')).toThrow();
  });

  it('throws on non-youtube URL', () => {
    expect(() => parseChannelInput('https://example.com/foo')).toThrow();
  });
});
