import en from '../lib/locales/en';
import gu from '../lib/locales/gu';
import hi from '../lib/locales/hi';
import {
  APPLICATION_STEPS,
  PREREQUISITE_DOC_KEYS,
  UPLOAD_MAX_KB,
  UPLOAD_SPECS,
} from '../constants/applicationGuide';
import { DEFAULT_DOCUMENTS } from '../constants/documents';

/**
 * The guide is a transcription of the official OJAS process. These tests guard the two
 * things that make it useful: the steps stay in the portal's real order with the
 * registration-is-not-an-application trap marked, and the upload limits stay exact.
 */
describe('application guide', () => {
  it('states One-Time Registration before the trap that follows it', () => {
    const keys = APPLICATION_STEPS.map((s) => s.key);
    expect(keys[0]).toBe('otr');
    expect(keys[1]).toBe('otrNotApplication');

    // The trap must be an explicit step, not a footnote: that is the whole point.
    const trap = APPLICATION_STEPS.filter((s) => s.trap);
    expect(trap).toHaveLength(1);
    expect(trap[0].key).toBe('otrNotApplication');
  });

  it('walks the real portal order from registration to call letter', () => {
    expect(APPLICATION_STEPS.map((s) => s.key)).toEqual([
      'otr',
      'otrNotApplication',
      'openAdvertisement',
      'fillDetails',
      'uploadFiles',
      'payFee',
      'confirm',
      'callLetter',
    ]);
  });

  it('gives every step a title and a body in all three languages', () => {
    for (const step of APPLICATION_STEPS) {
      for (const dict of [en, gu, hi]) {
        const entry = dict.guideSteps[step.key];
        expect(entry.title.trim()).not.toBe('');
        expect(entry.body.trim()).not.toBe('');
        // A translated body must actually be in its script, not an English placeholder.
        if (dict !== en) expect(entry.title).toMatch(/[^\x00-\x7F]/);
      }
    }
  });

  it('keeps the upload limits exact, because 1 KB over is rejected', () => {
    expect(UPLOAD_MAX_KB).toBe(15);
    for (const spec of UPLOAD_SPECS) {
      expect(spec.format).toBe('JPG');
      expect(spec.maxKb).toBe(UPLOAD_MAX_KB);
      // A positive, non-empty dimension for each file.
      expect(Number(spec.widthCm)).toBeGreaterThan(0);
      expect(Number(spec.heightCm)).toBeGreaterThan(0);
    }
    expect(UPLOAD_SPECS.map((s) => s.key)).toEqual(['photo', 'signature']);
  });

  it('lists prerequisites that the checklist can actually render', () => {
    const checklistKeys = new Set(DEFAULT_DOCUMENTS.application.map((d) => d.key));
    for (const key of PREREQUISITE_DOC_KEYS) {
      expect(checklistKeys.has(key)).toBe(true);
    }
  });

  it('explains that the fee differs per post instead of quoting one amount', () => {
    // A single hard-coded fee would be wrong for most advertisements.
    const body = en.guideSteps.payFee.body.toLowerCase();
    expect(body).toContain('each post');
    expect(body).not.toMatch(/₹\s?\d/);
  });
});
