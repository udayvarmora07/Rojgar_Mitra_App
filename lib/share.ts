import { Platform, Share } from 'react-native';

/**
 * Sending a notice to a family member is how this audience actually decides to apply.
 * The message carries only facts already on the notice — title, department, last date and
 * the official link — so a shared message can never claim something the app does not show.
 */
export type NoticeShareInput = {
  title: string;
  department: string;
  lastDateLabel: string;
  lastDate: string;
  sourceLabel: string;
  link: string | null;
  footer: string;
};

export function buildNoticeShareText(input: NoticeShareInput): string {
  const head = [input.title.trim(), input.department.trim()].filter(Boolean).join('\n');
  const details = `${input.lastDateLabel}: ${input.lastDate}`;
  const source = input.link ? `\n${input.sourceLabel}: ${input.link.trim()}` : '';
  return `${head}\n${details}${source}\n\n${input.footer.trim()}`;
}

export type ShareResult = 'shared' | 'copied' | 'failed';

/**
 * The clipboard API needs a secure context and a trusted gesture, and refuses both in some
 * embedded browsers. A temporary selected textarea still works there, and the reader gets
 * one confirmation instead of a control that appears broken.
 */
function copyWithTextarea(text: string): boolean {
  if (typeof document === 'undefined' || !document.body) return false;
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}

/**
 * Native shows the OS share sheet. The web build uses the Web Share API where it exists
 * (HTTPS only) and otherwise copies the message, because a browser without share support
 * would otherwise make the control do nothing visible.
 *
 * A dismissed share sheet is not an error: the reader simply changed their mind.
 */
export async function shareNoticeText(text: string, title: string): Promise<ShareResult> {
  if (Platform.OS === 'web') {
    const nav = typeof navigator === 'undefined' ? undefined : navigator;
    if (nav && typeof nav.share === 'function') {
      try {
        await nav.share({ title, text });
        return 'shared';
      } catch (error) {
        if ((error as Error | undefined)?.name === 'AbortError') return 'shared';
      }
    }
    try {
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(text);
        return 'copied';
      }
    } catch {
      // The textarea fallback below covers browsers that reject the clipboard here.
    }
    return copyWithTextarea(text) ? 'copied' : 'failed';
  }

  try {
    await Share.share({ message: text, title });
    return 'shared';
  } catch {
    return 'failed';
  }
}
