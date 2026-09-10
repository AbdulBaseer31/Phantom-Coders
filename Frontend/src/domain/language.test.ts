import { describe, expect, it } from 'vitest';
import { MONITORING_LABEL, WELFARE_VERIFICATION, statusText, syncText } from './language';

describe('clinical safety language', () => {
  it('keeps the monitoring label non-diagnostic', () => {
    expect(MONITORING_LABEL).not.toMatch(/diagnos|emergency/i);
  });

  it('words welfare alerts as verification requests only', () => {
    expect(WELFARE_VERIFICATION).toMatch(/welfare check|verification/i);
    expect(WELFARE_VERIFICATION).not.toMatch(/emergency proof|confirmed emergency/i);
  });

  it('distinguishes awaiting sync from zero or missed in every status label', () => {
    expect(syncText.awaiting_sync).not.toBe(syncText.current);
    expect(syncText.awaiting_sync).not.toMatch(/zero|missed/i);
    expect(statusText.missed).not.toBe(statusText.awaiting_sync);
    expect(statusText.unable).not.toBe(statusText.missed);
  });

  it('labels every sync state with text, not a code', () => {
    for (const key of ['current', 'awaiting_sync', 'offline', 'unknown'] as const) {
      expect(syncText[key].length).toBeGreaterThan(0);
    }
  });
});
