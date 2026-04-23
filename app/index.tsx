import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import type { Job, Resource } from '../lib/database.types';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [latestJobs, setLatestJobs] = React.useState<Job[]>([]);
  const [resources, setResources] = React.useState<Resource[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jobsRes, resourcesRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('resources')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (jobsRes.data) setLatestJobs(jobsRes.data);
      if (resourcesRes.data) setResources(resourcesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickLinks = [
    { id: 'jobs', label: t('home.latestJobs'), icon: '💼', route: '/jobs' },
    { id: 'practice', label: t('practice.title'), icon: '📝', route: '/practice' },
    { id: 'resources', label: t('resources.title'), icon: '📚', route: '/resources' },
    { id: 'settings', label: t('settings.title'), icon: '⚙️', route: '/settings' },
  ];

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Welcome Section */}
      <View className="bg-blue-800 p-6">
        <Text className="text-2xl font-bold text-white mb-2">
          {t('home.welcome')}
        </Text>
        <Text className="text-blue-100">{t('home.subtitle')}</Text>
      </View>

      {/* Quick Links */}
      <View className="p-4">
        <Text className="text-lg font-semibold mb-3">{t('home.quickLinks')}</Text>
        <View className="grid grid-cols-2 gap-3">
          {quickLinks.map((link) => (
            <TouchableOpacity
              key={link.id}
              onPress={() => router.push(link.route)}
              className="bg-gray-50 p-4 rounded-xl border border-gray-200"
            >
              <Text className="text-2xl mb-2">{link.icon}</Text>
              <Text className="font-medium text-gray-900">{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Latest Jobs */}
      <View className="p-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-semibold">{t('home.latestJobs')}</Text>
          <TouchableOpacity onPress={() => router.push('/jobs')}>
            <Text className="text-blue-600 font-medium">{t('home.viewAll')}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text className="text-gray-500">{t('common.loading')}</Text>
        ) : latestJobs.length === 0 ? (
          <Text className="text-gray-500">{t('jobs.noJobsFound')}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {latestJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                onPress={() => router.push(`/job/${job.id}`)}
                className="bg-gray-50 p-4 rounded-xl mr-3 w-64 border border-gray-200"
              >
                <Text className="font-semibold text-gray-900 mb-1" numberOfLines={2}>
                  {job.title}
                </Text>
                <Text className="text-gray-600 text-sm mb-2">{job.organization}</Text>
                {job.deadline && (
                  <Text className="text-amber-600 text-sm">Due: {job.deadline}</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Recent Resources */}
      <View className="p-4">
        <Text className="text-lg font-semibold mb-3">{t('home.recentResources')}</Text>
        {resources.length === 0 ? (
          <Text className="text-gray-500">{t('resources.noResourcesFound')}</Text>
        ) : (
          resources.map((resource) => (
            <TouchableOpacity
              key={resource.id}
              onPress={() => router.push(`/resources/${resource.id}`)}
              className="bg-gray-50 p-4 rounded-xl mb-2 border border-gray-200"
            >
              <Text className="font-medium text-gray-900">{resource.title}</Text>
              {resource.category && (
                <Text className="text-gray-500 text-sm mt-1">{resource.category}</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}
