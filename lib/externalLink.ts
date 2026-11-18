import { Linking } from 'react-native';
import { isSafeWebUrl } from './url';

/**
 * Opens an official advertisement page in the browser.
 *
 * Returns false when the link is missing, is not http(s), or the browser refuses it, so the
 * caller can show one message instead of guessing which of those happened.
 */
export async function openExternalLink(link: string | null | undefined): Promise<boolean> {
  if (!isSafeWebUrl(link)) return false;
  try {
    await Linking.openURL(link.trim());
    return true;
  } catch {
    return false;
  }
}
