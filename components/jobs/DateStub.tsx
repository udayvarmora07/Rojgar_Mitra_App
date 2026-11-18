import { Text, View } from 'react-native';
import { dateParts, deadlineStatus } from '../../lib/deadline';
import { useLanguage } from '../../hooks/useLanguage';
import { Mono } from '../ui/Mono';

/**
 * A tear-off date stub, the signature of the notice-board system. The day is the
 * largest thing on a job card because "can I still apply?" is the first question a
 * reader asks. Its surface changes with the deadline, and the exact date is also
 * spoken by the card's accessibility label, so the stub is reinforcement rather
 * than the only carrier.
 */
export function DateStub({ deadline }: { deadline: string }) {
  const { language } = useLanguage();
  const parts = dateParts(deadline, language);
  const status = deadlineStatus(deadline);

  const tone =
    status === 'expired'
      ? { box: 'bg-closed-bg border-closed-border', text: 'text-closed-text' }
      : status === 'closingSoon'
        ? { box: 'bg-closing-bg border-closing-border', text: 'text-closing-text' }
        : { box: 'bg-navy-tint border-navy-line', text: 'text-navy' };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`w-[68px] self-stretch items-center justify-center border-r border-dashed px-1 py-3 ${tone.box} ${tone.text}`}
    >
      {parts ? (
        <>
          <Text className={`text-[11px] font-extrabold uppercase tracking-[0.06em] ${tone.text}`}>
            {parts.month}
          </Text>
          <Mono className={`text-[30px] leading-[34px] font-bold ${tone.text}`}>{parts.day}</Mono>
          <Mono className={`text-[11px] leading-[14px] ${tone.text}`}>{parts.year}</Mono>
        </>
      ) : (
        <Text className={`text-[11px] text-center ${tone.text}`}>—</Text>
      )}
    </View>
  );
}
