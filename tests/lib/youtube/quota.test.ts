import { describe, it, expect } from 'vitest';
import {
  isOverQuotaThreshold,
  QUOTA_DAILY_CAP,
  QUOTA_WARN_THRESHOLD,
} from '@/lib/youtube/quota';

describe('quota thresholds', () => {
  it('cap is 10000 (YouTube Data API v3 default)', () => {
    expect(QUOTA_DAILY_CAP).toBe(10000);
  });

  it('warn threshold is 80% of cap', () => {
    expect(QUOTA_WARN_THRESHOLD).toBe(8000);
  });

  it('isOverQuotaThreshold returns false under threshold', () => {
    expect(isOverQuotaThreshold(0)).toBe(false);
    expect(isOverQuotaThreshold(7999)).toBe(false);
  });

  it('isOverQuotaThreshold returns true at and above threshold', () => {
    expect(isOverQuotaThreshold(8000)).toBe(true);
    expect(isOverQuotaThreshold(10000)).toBe(true);
  });
});
