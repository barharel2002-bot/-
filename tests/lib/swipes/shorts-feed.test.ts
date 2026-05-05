import { describe, it, expect } from 'vitest';
import { mergeAndDedupe, deterministicShuffle } from '@/lib/swipes/shorts-feed';

const v = (id: string) => ({
  videoId: id,
  title: id,
  thumbnailUrl: '',
  channelTitle: '',
});

describe('mergeAndDedupe', () => {
  it('removes duplicate video IDs', () => {
    const out = mergeAndDedupe([v('a'), v('b'), v('a')]);
    expect(out.map((x) => x.videoId)).toEqual(['a', 'b']);
  });

  it('returns empty array for empty input', () => {
    expect(mergeAndDedupe([])).toEqual([]);
  });

  it('preserves first occurrence order', () => {
    const out = mergeAndDedupe([v('a'), v('b'), v('c'), v('a'), v('b')]);
    expect(out.map((x) => x.videoId)).toEqual(['a', 'b', 'c']);
  });
});

describe('deterministicShuffle', () => {
  it('is stable for the same seed', () => {
    const a = deterministicShuffle([v('1'), v('2'), v('3'), v('4')], 'seed-x');
    const b = deterministicShuffle([v('1'), v('2'), v('3'), v('4')], 'seed-x');
    expect(a.map((x) => x.videoId)).toEqual(b.map((x) => x.videoId));
  });

  it('produces different orders for different seeds', () => {
    const a = deterministicShuffle([v('1'), v('2'), v('3'), v('4'), v('5')], 'seed-x');
    const b = deterministicShuffle([v('1'), v('2'), v('3'), v('4'), v('5')], 'seed-y');
    expect(a.map((x) => x.videoId)).not.toEqual(b.map((x) => x.videoId));
  });

  it('does not mutate input', () => {
    const input = [v('1'), v('2'), v('3')];
    const snapshot = input.map((x) => x.videoId);
    deterministicShuffle(input, 'seed');
    expect(input.map((x) => x.videoId)).toEqual(snapshot);
  });
});
