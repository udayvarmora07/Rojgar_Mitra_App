import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Masthead } from '../components/ui/Masthead';
import { LanguageToggle } from '../components/ui/LanguagePicker';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Screen } from '../components/ui/Screen';
import { Mono } from '../components/ui/Mono';
import { Stamp } from '../components/ui/Stamp';
import { Footnote } from '../components/ui/States';
import { curve, palette } from '../constants/theme';
import {
  APPLICATION_STEPS,
  OJAS_HELPLINE,
  PREREQUISITE_DOC_KEYS,
  UPLOAD_SPECS,
} from '../constants/applicationGuide';
import { useLanguage } from '../hooks/useLanguage';
import type { TranslationKey } from '../lib/locales/en';

/**
 * The official OJAS application process, in order.
 *
 * This screen exists because the most common way a candidate loses a government job
 * is not failing the exam — it is completing the One-Time Registration and believing
 * that counts as applying. That step is marked as a trap with a stamp, not buried in
 * body copy. The upload limits are shown as measured values because a JPG one
 * kilobyte over the limit is rejected outright.
 */
export default function ApplicationGuideScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen>
      <Masthead
        title={t('applyGuide')}
        subtitle={t('applyGuideIntro')}
        onBack={back}
        right={<LanguageToggle />}
      />

      <ScrollView
        className="flex-1"
        // This screen is all static text, so a keyboard user has nothing inside it to tab to
        // and cannot scroll it. A focusable region fixes axe's `scrollable-region-focusable`
        // (serious) without adding a fake control. Ignored on native, where it is a no-op.
        tabIndex={0}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 28,
        }}
      >
        {APPLICATION_STEPS.map((step, index) => {
          const current = index + 1;
          const total = APPLICATION_STEPS.length;
          const title = t(`guideSteps.${step.key}.title` as TranslationKey);
          const body = t(`guideSteps.${step.key}.body` as TranslationKey);

          return (
            <View
              key={step.key}
              accessible
              accessibilityLabel={t('guideCounterLabel', { current, total, title })}
              style={curve}
              className={`rounded-card border p-4 mb-3 ${
                step.trap ? 'bg-closing-bg border-closing-border' : 'bg-card border-rule'
              }`}
            >
              <View className="flex-row items-start">
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={curve}
                  className={`w-9 h-9 rounded-stub items-center justify-center border ${
                    step.trap
                      ? 'bg-card border-closing-border'
                      : 'bg-navy-tint border-navy-line'
                  }`}
                >
                  <Mono
                    className={`text-label font-bold ${
                      step.trap ? 'text-closing-text' : 'text-navy'
                    }`}
                  >
                    {current}
                  </Mono>
                </View>

                <View className="flex-1 ml-3">
                  <Text
                    className={`text-body font-bold leading-reading ${
                      step.trap ? 'text-closing-text' : 'text-ink'
                    }`}
                  >
                    {title}
                  </Text>
                  <Text className="text-label text-ink-soft mt-1 leading-reading">{body}</Text>
                </View>
              </View>

              {step.trap ? (
                <View className="mt-3 ml-12">
                  <Stamp tone="closing" label={t('guideTrapTitle')} />
                </View>
              ) : null}

              {step.key === 'uploadFiles' ? <UploadSpecs /> : null}
            </View>
          );
        })}

        <SectionHeading title={t('guidePrereqTitle')} />
        <View style={curve} className="bg-card border border-rule rounded-card px-4 py-2 mb-2">
          {PREREQUISITE_DOC_KEYS.map((key, index) => (
            <View
              key={key}
              className={`flex-row items-center py-3 ${
                index > 0 ? 'border-t border-rule' : ''
              }`}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={palette.success} />
              <Text className="text-body text-ink ml-2.5 flex-1 leading-reading">
                {t(`docs.${key}.name` as TranslationKey)}
              </Text>
            </View>
          ))}
        </View>

        <View style={curve} className="bg-navy-tint border border-navy-line rounded-card p-4 mt-2">
          <Text className="text-[11px] font-extrabold uppercase tracking-stamp text-navy">
            {t('guideHelpline')}
          </Text>
          <Mono className="text-title font-bold text-navy mt-1">{OJAS_HELPLINE}</Mono>
          <Text className="text-label text-ink-soft mt-1">
            {t('guideHelplineHours')} · {language.toUpperCase()}
          </Text>
        </View>

        <Footnote>{t('officialNote')}</Footnote>
      </ScrollView>
    </Screen>
  );
}

/**
 * The exact upload limits. Values come from `constants/applicationGuide.ts` so a limit
 * can never drift between this screen and a future validation step.
 */
function UploadSpecs() {
  const { t } = useTranslation();

  return (
    <View style={curve} className="mt-3 ml-12 rounded-control border border-rule bg-card p-3">
      <Text className="text-body font-bold text-ink">{t('guideUploadTitle')}</Text>
      <Text className="text-label text-ink-soft mt-1 leading-reading">{t('guideUploadHint')}</Text>

      {UPLOAD_SPECS.map((spec) => (
        <View key={spec.key} className="mt-3 pt-3 border-t border-rule">
          <Text className="text-label font-bold text-ink">
            {spec.key === 'photo' ? t('guideUploadPhoto') : t('guideUploadSignature')}
          </Text>
          <View className="flex-row flex-wrap mt-1.5">
            <SpecPill label={t('guideUploadFormat')} value={spec.format} />
            <SpecPill label={t('guideUploadMax')} value={`${spec.maxKb} KB`} />
            <SpecPill
              label={t('guideUploadSize')}
              value={`${spec.widthCm} × ${spec.heightCm} cm`}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function SpecPill({ label, value }: { label: string; value: string }) {
  return (
    <View className="mr-4 mb-1">
      <Text className="text-[10px] font-extrabold uppercase tracking-stamp text-ink-mute">
        {label}
      </Text>
      <Mono className="text-label font-bold text-ink mt-0.5">{value}</Mono>
    </View>
  );
}
