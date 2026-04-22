import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getJobById, getJobDetails, getDocumentsRequired, Job, JobDetail, DocumentRequired } from '../../lib/supabase';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [jobDetails, setJobDetails] = useState<JobDetail[]>([]);
  const [documents, setDocuments] = useState<DocumentRequired[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [jobData, detailsData, docsData] = await Promise.all([
          getJobById(id),
          getJobDetails(id),
          getDocumentsRequired(id)
        ]);
        setJob(jobData);
        setJobDetails(detailsData);
        setDocuments(docsData);
      } catch (error) {
        console.error('Error fetching job data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const openSourceLink = () => {
    if (job?.source_link) {
      Linking.openURL(job.source_link);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text className="text-lg text-gray-600 mt-4">Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
        <Text className="text-xl text-gray-700 mt-4">Job not found</Text>
        <TouchableOpacity className="mt-6 bg-blue-900 px-6 py-3 rounded-xl" onPress={() => router.back()}>
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const applicationDocs = documents.filter(d => d.phase === 'Application');
  const examCenterDocs = documents.filter(d => d.phase === 'Exam Center');

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-900 px-6 py-6">
        <TouchableOpacity className="flex-row items-center mb-4" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
          <Text className="text-white text-lg ml-2">Back</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-white">{job.title}</Text>
        <Text className="text-lg text-blue-200 mt-1">{job.department}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}
      >
        {/* Job Info Section */}
        <View className="bg-white rounded-xl p-5 mb-4 shadow-sm">
          <Text className="text-xl font-bold text-gray-900 mb-4">Job Information</Text>
          
          <View className="flex-row items-center mb-3">
            <Ionicons name="business-outline" size={22} color="#1E3A8A" />
            <View className="ml-3">
              <Text className="text-sm text-gray-500">Department</Text>
              <Text className="text-base text-gray-900 font-medium">{job.department}</Text>
            </View>
          </View>

          <View className="flex-row items-center mb-3">
            <Ionicons name="calendar-outline" size={22} color="#1E3A8A" />
            <View className="ml-3">
              <Text className="text-sm text-gray-500">Post Date</Text>
              <Text className="text-base text-gray-900 font-medium">{formatDate(job.post_date)}</Text>
            </View>
          </View>

          <View className="flex-row items-center mb-3">
            <Ionicons name="time-outline" size={22} color="#DC2626" />
            <View className="ml-3">
              <Text className="text-sm text-gray-500">Last Date to Apply</Text>
              <Text className="text-base text-red-600 font-bold">{formatDate(job.deadline)}</Text>
            </View>
          </View>

          {job.salary && (
            <View className="flex-row items-center">
              <Ionicons name="cash-outline" size={22} color="#1E3A8A" />
              <View className="ml-3">
                <Text className="text-sm text-gray-500">Salary</Text>
                <Text className="text-base text-gray-900 font-medium">{job.salary}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Eligibility Section */}
        <View className="bg-white rounded-xl p-5 mb-4 shadow-sm">
          <Text className="text-xl font-bold text-gray-900 mb-4">Eligibility</Text>

          {jobDetails.length === 0 ? (
            <Text className="text-base text-gray-500">No eligibility information available</Text>
          ) : (
            jobDetails.map((detail, index) => (
              <View key={detail.id || index}>
                <View className="flex-row items-start mb-3">
                  <Ionicons name="person-outline" size={22} color="#1E3A8A" />
                  <View className="ml-3 flex-1">
                    <Text className="text-sm text-gray-500">Age Limit</Text>
                    <Text className="text-base text-gray-900 font-medium">{detail.age_limit}</Text>
                  </View>
                </View>

                <View className="flex-row items-start mb-3">
                  <Ionicons name="school-outline" size={22} color="#1E3A8A" />
                  <View className="ml-3 flex-1">
                    <Text className="text-sm text-gray-500">Required Qualification</Text>
                    <Text className="text-base text-gray-900 font-medium">{detail.required_qualifications}</Text>
                  </View>
                </View>

                {detail.application_fees && (
                  <View className="flex-row items-start">
                    <Ionicons name="card-outline" size={22} color="#1E3A8A" />
                    <View className="ml-3 flex-1">
                      <Text className="text-sm text-gray-500">Application Fees</Text>
                      <Text className="text-base text-gray-900 font-medium">{detail.application_fees}</Text>
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Required Documents Section */}
        <View className="bg-white rounded-xl p-5 mb-4 shadow-sm">
          <Text className="text-xl font-bold text-gray-900 mb-4">Required Documents</Text>

          {documents.length === 0 ? (
            <Text className="text-base text-gray-500">No document list available</Text>
          ) : (
            <>
              {applicationDocs.length > 0 && (
                <View className="mb-4">
                  <Text className="text-lg font-semibold text-blue-900 mb-2">Application Phase</Text>
                  {applicationDocs.map((doc, index) => (
                    <View key={doc.id || index} className="flex-row items-center mb-2">
                      <Ionicons name="checkbox-outline" size={20} color="#059669" />
                      <Text className="text-base text-gray-700 ml-2">{doc.document_name}</Text>
                    </View>
                  ))}
                </View>
              )}

              {examCenterDocs.length > 0 && (
                <View>
                  <Text className="text-lg font-semibold text-blue-900 mb-2">Exam Center Phase</Text>
                  {examCenterDocs.map((doc, index) => (
                    <View key={doc.id || index} className="flex-row items-center mb-2">
                      <Ionicons name="checkbox-outline" size={20} color="#059669" />
                      <Text className="text-base text-gray-700 ml-2">{doc.document_name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View className="space-y-3">
          {job.source_link && (
            <TouchableOpacity
              className="bg-green-600 rounded-xl p-4 items-center"
              onPress={openSourceLink}
            >
              <Text className="text-lg font-semibold text-white">Apply Now - Official Website</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className="bg-blue-900 rounded-xl p-4 items-center"
            onPress={() => router.push('/practice')}
          >
            <Text className="text-lg font-semibold text-white">Start Practice Test</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-orange-600 rounded-xl p-4 items-center"
            onPress={() => router.push('/documents')}
          >
            <Text className="text-lg font-semibold text-white">View Document Checklist</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}