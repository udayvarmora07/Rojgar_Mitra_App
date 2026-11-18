import { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { curve, palette } from '../../constants/theme';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeLabel: string;
  /** Pinned below the scroll area so the primary action is never buried. */
  footer?: ReactNode;
};

/**
 * A bottom sheet for choices that would otherwise become a wall of chips. It is a
 * modal because the reader is committing a filter and should not lose that context
 * behind a scroller.
 */
export function BottomSheet({ visible, title, onClose, children, closeLabel, footer }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          className="flex-1"
          onPress={onClose}
        />
        <View
          className="bg-card rounded-t-[20px] border-t border-rule w-full max-w-[600px] self-center"
          style={{ maxHeight: '85%', paddingBottom: insets.bottom + 16, ...curve }}
        >
          <Pressable onPress={() => {}} className="px-5 pt-3 pb-4">
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="w-10 h-1 rounded-full bg-rule-strong self-center mb-4"
            />
            <View className="flex-row items-center justify-between">
              <Text accessibilityRole="header" className="text-title font-extrabold text-ink tracking-tight">
                {title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
                onPress={onClose}
                className="min-h-[48px] min-w-[48px] items-center justify-center -mr-2 active:opacity-70"
              >
                <Ionicons name="close" size={26} color={palette.inkSoft} />
              </Pressable>
            </View>
          </Pressable>
          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer ? (
            <View className="px-5 pt-3 mt-1 border-t border-rule">{footer}</View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
