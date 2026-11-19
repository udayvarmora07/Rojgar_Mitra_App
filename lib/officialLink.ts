import type { TranslationKey } from './locales/en';
import type { Job } from './supabase';
import { isSafeWebUrl } from './url';

/**
 * What the apply action would open.
 *
 * `summary` is the FreeJobAlert article: useful, but never an official website. The other
 * three are official destinations with different promises, so each gets its own label.
 */
export type ApplyDestinationKind =
  | 'officialSite'
  | 'applicationForm'
  | 'notificationPdf'
  | 'summary';

export type ApplyDestination = {
  url: string;
  official: boolean;
  kind: ApplyDestinationKind;
};

export type ApplyActionCopy = {
  label: TranslationKey;
  hint: TranslationKey;
};

/** Aggregators must never be presented as the official destination. */
const AGGREGATOR_HOSTS = ['freejobalert.com'];

function hostOf(url: string): string | null {
  try {
    return new URL(url.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isAggregatorUrl(url: string | null | undefined): boolean {
  if (!isSafeWebUrl(url)) return false;
  const host = hostOf(url);
  if (!host) return false;
  return AGGREGATOR_HOSTS.some(
    (blocked) => host === blocked || host.endsWith(`.${blocked}`)
  );
}

function kindOfOfficialUrl(url: string): Exclude<ApplyDestinationKind, 'summary'> {
  const host = hostOf(url) ?? '';
  let path = '';
  try {
    path = new URL(url.trim()).pathname.toLowerCase();
  } catch {
    path = '';
  }

  const isForm =
    host === 'forms.gle' ||
    (host.endsWith('docs.google.com') && path.includes('/forms/')) ||
    host.endsWith('forms.office.com') ||
    host.endsWith('jotform.com');
  if (isForm) return 'applicationForm';

  const isDocument =
    path.endsWith('.pdf') ||
    host.endsWith('drive.google.com') ||
    (host.endsWith('docs.google.com') && !path.includes('/forms/'));
  if (isDocument) return 'notificationPdf';

  return 'officialSite';
}

/** The kind of a single stored URL, once its host is known to be safe. */
export function destinationKind(
  url: string | null | undefined
): ApplyDestinationKind | null {
  if (!isSafeWebUrl(url)) return null;
  if (isAggregatorUrl(url)) return 'summary';
  return kindOfOfficialUrl(url);
}

/**
 * The best safe destination for the apply action.
 *
 * Returns `null` when there is nothing safe to open, so the screens can fall back to practice
 * instead of rendering a dead button.
 */
export function applyDestination(
  job: Pick<Job, 'official_link' | 'source_link'>
): ApplyDestination | null {
  if (isSafeWebUrl(job.official_link) && !isAggregatorUrl(job.official_link)) {
    return {
      url: job.official_link.trim(),
      official: true,
      kind: kindOfOfficialUrl(job.official_link),
    };
  }
  if (isSafeWebUrl(job.source_link)) {
    const official = !isAggregatorUrl(job.source_link);
    return {
      url: job.source_link.trim(),
      official,
      kind: official ? kindOfOfficialUrl(job.source_link) : 'summary',
    };
  }
  return null;
}

/**
 * The label and hint for a destination.
 *
 * A PDF is the notification, not an application page; a Google Form is the application form,
 * not the organisation's website. Keeping the copy here means the list, the detail screen and
 * the archived applications can never disagree.
 */
export function applyActionCopy(kind: ApplyDestinationKind): ApplyActionCopy {
  switch (kind) {
    case 'applicationForm':
      return { label: 'openApplicationForm', hint: 'openApplicationFormHint' };
    case 'notificationPdf':
      return {
        label: 'openOfficialNotification',
        hint: 'openOfficialNotificationHint',
      };
    case 'summary':
      return { label: 'readFullNotice', hint: 'readFullNoticeHint' };
    default:
      return { label: 'applyOfficial', hint: 'applyOfficialHint' };
  }
}

/**
 * The label for a notice whose last date has passed.
 *
 * The destination is still useful (a corrigendum or call letter appears there), but it can no
 * longer be an invitation to apply.
 */
export function closedNoticeCopy(kind: ApplyDestinationKind): ApplyActionCopy {
  switch (kind) {
    case 'applicationForm':
      return { label: 'openApplicationForm', hint: 'openApplicationFormHint' };
    case 'notificationPdf':
      return {
        label: 'openOfficialNotification',
        hint: 'openOfficialNotificationHint',
      };
    case 'summary':
      return { label: 'readFullNotice', hint: 'readFullNoticeHint' };
    default:
      return { label: 'openNotice', hint: 'applyOfficialHint' };
  }
}
