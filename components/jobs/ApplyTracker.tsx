import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { curve, palette } from '../../constants/theme';
import { Button } from '../ui/Button';
import { Stamp } from '../ui/Stamp';
import { Mono } from '../ui/Mono';
import {
  ApplicationRecord,
  loadApplications,
  markApplied,
  setConfirmationNo,
  unmarkApplied,
} from '../../lib/applications';
import type { Job } from '../../lib/supabase';

/**
 * "Have I actually applied to this one?"
 *
 * The reader arrives here from the official website, which they had to leave the app to
 * open. Without a local mark they cannot tell an advertisement they applied to from one they
 * merely read — and the documented failure mode is believing registration was an application.
 * Keeping the confirmation number on the same screen is what lets them recover a call letter.
 *
 * Everything is local to the phone: there is no account and no server write.
 */
export function ApplyTracker({ job }: { job: Job }) {
  const { t } = useTranslation();
  const [record, setRecord] = useState<ApplicationRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [number, setNumber] = useState('');

  // Re-read on focus: the reader may have marked it from the list Apply strip.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadApplications().then((map) => {
        if (!active) return;
        const found = map[job.id] ?? null;
        setRecord(found);
        setNumber(found?.confirmationNo ?? '');
      });
      return () => {
        active = false;
      };
    }, [job.id])
  );

  const mark = async () => {
    const map = await markApplied({
      jobId: job.id,
      confirmationNo: null,
      advertisementNo: job.advertisement_no,
      deadline: job.deadline,
    });
    setRecord(map[job.id] ?? null);
    setEditing(false);
  };

  const undo = () => {
    Alert.alert(t('appliedUndoTitle'), t('appliedUndoBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('appliedUndoConfirm'),
        style: 'destructive',
        onPress: async () => {
          await unmarkApplied(job.id);
          setRecord(null);
          setNumber('');
          setEditing(false);
        },
      },
    ]);
  };

  const saveNumber = async () => {
    const map = await setConfirmationNo(job.id, number);
    setRecord(map[job.id] ?? null);
    setEditing(false);
  };

  if (!record) {
    return (
      <View style={curve} className="bg-card border border-rule rounded-card p-4 mb-3">
        <View className="flex-row items-center">
          <Ionicons name="checkbox-outline" size={22} color={palette.navy} />
          <View className="flex-1 ml-2.5 pr-2">
            <Text className="text-body font-bold text-ink">{t('appliedQuestion')}</Text>
            <Text className="text-label text-ink-soft mt-0.5 leading-reading">
              {t('appliedQuestionHint')}
            </Text>
          </View>
        </View>
        <View className="mt-3">
          <Button
            variant="secondary"
            icon="checkmark-circle-outline"
            label={t('markApplied')}
            onPress={mark}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={curve} className="bg-open-bg border border-open-border rounded-card p-4 mb-3">
      <View className="flex-row items-start">
        <Ionicons name="checkmark-circle" size={24} color={palette.success} />
        <View className="flex-1 ml-2.5">
          <Stamp tone="open" label={t('appliedStamp')} />
          <Text className="text-body font-bold text-ink mt-2">{t('appliedTitle')}</Text>
          <Text className="text-label text-ink-soft mt-1 leading-reading">{t('appliedHint')}</Text>

          {record.advertisementNo ? (
            <View className="flex-row items-baseline mt-2">
              <Text className="text-label text-ink-soft">{t('advertisementNo')}: </Text>
              <Mono className="text-label font-bold text-ink">{record.advertisementNo}</Mono>
            </View>
          ) : null}

          {record.confirmationNo ? (
            <View className="flex-row items-baseline mt-1">
              <Text className="text-label text-ink-soft">{t('confirmationNo')}: </Text>
              <Mono className="text-label font-bold text-ink">{record.confirmationNo}</Mono>
            </View>
          ) : null}
        </View>
      </View>

      {editing ? (
        <View className="mt-3">
          <View
            style={curve}
            className="flex-row items-center bg-card rounded-control border border-rule px-3 min-h-[52px]"
          >
            <TextInput
              accessibilityLabel={t('confirmationNo')}
              placeholder={t('confirmationNoPlaceholder')}
              placeholderTextColor={palette.inkMute}
              value={number}
              onChangeText={setNumber}
              autoCapitalize="characters"
              autoCorrect={false}
              style={{ color: palette.ink }}
              className="flex-1 text-body py-2"
            />
          </View>
          <View className="flex-row gap-2 mt-2">
            <View className="flex-1">
              <Button label={t('save')} onPress={saveNumber} />
            </View>
            <View className="flex-1">
              <Button
                variant="secondary"
                label={t('cancel')}
                onPress={() => {
                  setEditing(false);
                  setNumber(record.confirmationNo ?? '');
                }}
              />
            </View>
          </View>
        </View>
      ) : (
        <View className="mt-3 gap-2">
          {!record.confirmationNo ? (
            <Button
              variant="secondary"
              icon="keypad-outline"
              label={t('addConfirmationNo')}
              onPress={() => setEditing(true)}
            />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('appliedUndoConfirm')}
            onPress={undo}
            className="min-h-[48px] justify-center"
          >
            <Text className="text-label font-semibold text-ink-soft text-center">
              {t('appliedUndoConfirm')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
