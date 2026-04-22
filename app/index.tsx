import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getJobs, Job } from '../lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = async () => {
    try {
      const jobsData = await getJobs();
      // Take only the first 10 jobs for the home screen
      setJobs(jobsData.slice(0, 10));
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const isDeadlineNear = (dateString: string) => {
    const deadline = new Date(dateString);
    const today = new Date();
    const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7;
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text className="text-lg text-gray-600 mt-4">Loading jobs...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-900 px-6 py-8">
        <Text className="text-3xl font-bold text-white">Rojgar Mitra</Text>
        <Text className="text-lg text-blue-200 mt-1">રોજગાર મિત્ર</Text>
        <Text className="text-base text-blue-100 mt-2">Find government jobs in Gujarat</Text>
      </View>

      {/* Job List */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />
        }
      >
        <Text className="text-xl font-bold text-gray-800 mb-4">Latest Jobs</Text>

        {jobs.length === 0 ? (
          <View className="bg-white rounded-xl p-8 items-center shadow-sm">
            <Ionicons name="briefcase-outline" size={64} color="#9CA3AF" />
            <Text className="text-lg text-gray-500 mt-4 text-center">No jobs available yet</Text>
            <Text className="text-sm text-gray-400 mt-2 text-center">Check back later for new opportunities</Text>
          </View>
        ) : (
          jobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              className="bg-white rounded-xl p-5 mb-4 shadow-sm border-l-4 border-blue-900"
              onPress={() => router.push(`/job/${job.id}`)}
              activeOpacity={0.7}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900">{job.title}</Text>
                  <Text className="text-base text-blue-700 mt-1">{job.department}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
              </View>

              <View className="flex-row items-center mt-4">
                <Ionicons name="calendar-outline" size={18} color={isDeadlineNear(job.deadline) ? '#DC2626' : '#6B7280'} />
                <Text className={`text-base ml-2 ${isDeadlineNear(job.deadline) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                  Last Date: {formatDate(job.deadline)}
                </Text>
              </View>

              {job.salary && (
                <View className="flex-row items-center mt-2">
                  <Ionicons name="cash-outline" size={18} color="#6B7280" />
                  <Text className="text-base text-gray-600 ml-2">{job.salary}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}

        {jobs.length > 0 && (
          <TouchableOpacity
            className="bg-blue-900 rounded-xl p-4 mt-2 items-center"
            onPress={() => router.push('/jobs')}
          >
            <Text className="text-lg font-semibold text-white">View All Jobs</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Bottom Tab Info */}
      <View className="bg-white border-t border-gray-200 px-6 py-4">
        <View className="flex-row justify-around">
          <View className="items-center">
            <Ionicons name="home" size={28} color="#1E3A8A" />
            <Text className="text-xs text-blue-900 font-semibold mt-1">Home</Text>
          </View>
          <TouchableOpacity className="items-center" onPress={() => router.push('/jobs')}>
            <Ionicons name="briefcase" size={28} color="#6B7280" />
            <Text className="text-xs text-gray-500 mt-1">Jobs</Text>
          </TouchableOpacity>
          <TouchableOpacity className="items-center" onPress={() => router.push('/practice')}>
            <Ionicons name="school" size={28} color="#6B7280" />
            <Text className="text-xs text-gray-500 mt-1">Practice</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}