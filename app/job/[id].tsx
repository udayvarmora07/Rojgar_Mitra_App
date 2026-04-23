import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import type { Job } from '../../lib/database.types';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [job, setJob] = React.useState<Job | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) return;
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (error) {
      console.error('Error fetching job:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (job?.apply_link) {
      await Linking.openURL(job.apply_link);
    }
  };

  const handleShare = async () => {
    // Native share would be implemented here
    console.log('Share job:', job?.title);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-lg text-gray-600">{t('common.loading')}</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-lg text-gray-600">{t('jobs.noJobsFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-blue-800 p-6">
        <Text className="text-2xl font-bold text-white mb-2">{job.title}</Text>
        <Text className="text-lg text-blue-100">{job.organization}</Text>
      </View>

      {/* Quick Info */}
      <View className="p-4 border-b border-gray-200">
        <View className="flex-row flex-wrap gap-4">
          {job.location && (
            <View className="bg-gray-100 px-4 py-2 rounded-lg">
              <Text className="text-sm text-gray-600">{t('jobs.location')}</Text>
              <Text className="font-medium">{job.location}</Text>
            </View>
          )}
          {job.salary_min && job.salary_max && (
            <View className="bg-gray-100 px-4 py-2 rounded-lg">
              <Text className="text-sm text-gray-600">{t('jobs.salary')}</Text>
              <Text className="font-medium">
                {job.salary_min} - {job.salary_max}
              </Text>
            </View>
          )}
          {job.deadline && (
            <View className="bg-gray-100 px-4 py-2 rounded-lg">
              <Text className="text-sm text-gray-600">{t('jobs.deadline')}</Text>
              <Text className="font-medium">{job.deadline}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Description */}
      {job.description && (
        <View className="p-4 border-b border-gray-200">
          <Text className="text-xl font-semibold mb-2">Description</Text>
          <Text className="text-gray-700 leading-6">{job.description}</Text>
        </View>
      )}

      {/* Requirements */}
      {job.requirements && job.requirements.length > 0 && (
        <View className="p-4 border-b border-gray-200">
          <Text className="text-xl font-semibold mb-2">{t('jobs.requirements')}</Text>
          {job.requirements.map((req, index) => (
            <View key={index} className="flex-row items-start mb-2">
              <Text className="text-green-600 mr-2">•</Text>
              <Text className="text-gray-700 flex-1">{req}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Source */}
      {job.source && (
        <View className="p-4 border-b border-gray-200">
          <Text className="text-xl font-semibold mb-2">{t('jobs.source')}</Text>
          <View className="flex-row items-center">
            <Text className="text-gray-600">{job.source}</Text>
            {job.source_url && (
              <TouchableOpacity
                onPress={() => Linking.openURL(job.source_url!)}
                className="ml-2"
              >
                <Text className="text-blue-600 underline">View Original</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View className="p-4 gap-3">
        {job.apply_link && (
          <TouchableOpacity
            onPress={handleApply}
            className="bg-green-600 p-4 rounded-xl items-center"
          >
            <Text className="text-white text-lg font-semibold">
              {t('jobs.applyNow')}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleShare}
          className="bg-gray-200 p-4 rounded-xl items-center"
        >
          <Text className="text-gray-800 text-lg font-semibold">
            {t('jobs.share')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
