import React from 'react';
import { View, Text, TouchableOpacity, Switch, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = React.useState(false);
  const [currentLanguage, setCurrentLanguage] = React.useState(i18n.language);

  const handleLanguageChange = async (langCode: string) => {
    await i18n.changeLanguage(langCode);
    setCurrentLanguage(langCode);
    await AsyncStorage.setItem('app_language', langCode);
  };

  const handleClearCache = () => {
    Alert.alert(t('settings.clearCache'), t('settings.cacheCleared'));
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Language Section */}
      <View className="bg-white p-4 mb-4">
        <Text className="text-lg font-semibold mb-4">{t('settings.language')}</Text>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            onPress={() => handleLanguageChange(lang.code)}
            className={`p-4 rounded-lg mb-2 ${
              currentLanguage === lang.code
                ? 'bg-blue-50 border-2 border-blue-500'
                : 'bg-gray-50 border-2 border-transparent'
            }`}
          >
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="font-medium">{lang.label}</Text>
                <Text className="text-gray-500 text-sm">{lang.nativeLabel}</Text>
              </View>
              {currentLanguage === lang.code && (
                <Text className="text-blue-600 font-bold">✓</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notifications Section */}
      <View className="bg-white p-4 mb-4">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="font-medium">{t('settings.enableNotifications')}</Text>
            <Text className="text-gray-500 text-sm">{t('settings.notifications')}</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
          />
        </View>
      </View>

      {/* About Section */}
      <View className="bg-white p-4 mb-4">
        <Text className="text-lg font-semibold mb-4">{t('settings.about')}</Text>
        <View className="flex-row justify-between mb-2">
          <Text className="text-gray-600">{t('settings.version')}</Text>
          <Text className="text-gray-900">1.0.0</Text>
        </View>
        <TouchableOpacity className="p-3 bg-gray-50 rounded-lg mt-2">
          <Text className="text-blue-600">{t('settings.privacyPolicy')}</Text>
        </TouchableOpacity>
        <TouchableOpacity className="p-3 bg-gray-50 rounded-lg mt-2">
          <Text className="text-blue-600">{t('settings.termsOfService')}</Text>
        </TouchableOpacity>
      </View>

      {/* Clear Cache */}
      <View className="p-4">
        <TouchableOpacity
          onPress={handleClearCache}
          className="bg-red-50 p-4 rounded-lg items-center"
        >
          <Text className="text-red-600 font-medium">{t('settings.clearCache')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
