import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import type { Resource } from '../../lib/database.types';

export default function ResourceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [resource, setResource] = React.useState<Resource | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) return;
    fetchResource();
  }, [id]);

  const fetchResource = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setResource(data);
    } catch (error) {
      console.error('Error fetching resource:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-lg text-gray-600">{t('common.loading')}</Text>
      </View>
    );
  }

  if (!resource) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-lg text-gray-600">{t('resources.noResourcesFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-6">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          {resource.title}
        </Text>
        {resource.category && (
          <View className="bg-blue-100 self-start px-3 py-1 rounded-full mb-4">
            <Text className="text-blue-800 text-sm">{resource.category}</Text>
          </View>
        )}
        {resource.description && (
          <Text className="text-gray-700 leading-relaxed mb-4">
            {resource.description}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
