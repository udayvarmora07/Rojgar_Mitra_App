import React from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import type { Job } from '../../lib/database.types';

export default function JobsListScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.organization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderJobCard = ({ item }: { item: Job }) => (
    <TouchableOpacity
      onPress={() => router.push(`/job/${item.id}`)}
      className="bg-white p-4 border-b border-gray-200"
    >
      <Text className="text-lg font-semibold text-gray-900">{item.title}</Text>
      <Text className="text-gray-600 mt-1">{item.organization}</Text>
      <View className="flex-row mt-2 gap-2">
        {item.location && (
          <Text className="text-sm text-gray-500">{item.location}</Text>
        )}
        {item.deadline && (
          <Text className="text-sm text-amber-600">Due: {item.deadline}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search Bar */}
      <View className="p-4 bg-white border-b border-gray-200">
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('jobs.searchPlaceholder')}
          className="bg-gray-100 p-3 rounded-lg text-gray-900"
        />
      </View>

      {/* Job List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text>{t('common.loading')}</Text>
        </View>
      ) : filteredJobs.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-600">{t('jobs.noJobsFound')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          renderItem={renderJobCard}
          keyExtractor={(item) => item.id}
          refreshControl={{
            onRefresh: fetchJobs,
            refreshing: loading,
          }}
        />
      )}
    </View>
  );
}
