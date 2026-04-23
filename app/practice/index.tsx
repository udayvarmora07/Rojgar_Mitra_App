import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { generateTest } from '../../utils/aiGenerator';
import type { Question } from '../../lib/database.types';

const TEST_TYPES = [
  { id: 'general', label: 'General Knowledge', icon: '📚' },
  { id: 'math', label: 'Math', icon: '🔢' },
  { id: 'reasoning', label: 'Reasoning', icon: '🧠' },
  { id: 'english', label: 'English', icon: '📖' },
  { id: 'gujarati', label: 'Gujarati/Hindi', icon: '✍️' },
];

export default function PracticeHomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [selectedAnswer, setSelectedAnswer] = React.useState<number | null>(null);
  const [score, setScore] = React.useState(0);
  const [showResults, setShowResults] = React.useState(false);

  const handleGenerateTest = async (type: string) => {
    setSelectedType(type);
    setGenerating(true);
    try {
      const testQuestions = await generateTest(type, 5);
      setQuestions(testQuestions);
      setCurrentIndex(0);
      setScore(0);
      setShowResults(false);
    } catch (error) {
      console.error('Error generating test:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    setSelectedAnswer(optionIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || !questions[currentIndex]) return;

    const isCorrect = selectedAnswer === questions[currentIndex].correct_answer;
    if (isCorrect) setScore(s => s + 1);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
    } else {
      setShowResults(true);
    }
  };

  const handleReset = () => {
    setSelectedType(null);
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setShowResults(false);
  };

  if (generating) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-lg text-gray-600">{t('practice.generating')}</Text>
      </View>
    );
  }

  if (questions.length > 0 && !showResults) {
    const currentQuestion = questions[currentIndex];
    return (
      <ScrollView className="flex-1 bg-white p-4">
        {/* Progress */}
        <View className="mb-4">
          <Text className="text-gray-600">
            {t('practice.questionsAnswered')}: {currentIndex + 1}/{questions.length}
          </Text>
          <View className="h-2 bg-gray-200 rounded mt-2">
            <View
              className="h-full bg-blue-600 rounded"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </View>
        </View>

        {/* Question */}
        <Text className="text-xl font-semibold mb-4">
          {currentQuestion.question}
        </Text>

        {/* Options */}
        {currentQuestion.options.map((option, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleAnswer(index)}
            className={`p-4 mb-2 rounded-lg border-2 ${
              selectedAnswer === index
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <Text className="text-gray-800">{option}</Text>
          </TouchableOpacity>
        ))}

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmitAnswer}
          disabled={selectedAnswer === null}
          className={`p-4 rounded-lg mt-4 ${
            selectedAnswer !== null ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <Text className="text-white text-center font-semibold">
            {currentIndex < questions.length - 1
              ? t('practice.nextQuestion')
              : t('practice.finishTest')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <View className="flex-1 items-center justify-center bg-white p-6">
        <Text className="text-3xl font-bold mb-4">{t('practice.score')}</Text>
        <Text className="text-5xl font-bold text-blue-600 mb-2">{percentage}%</Text>
        <Text className="text-gray-600 mb-6">
          {score} / {questions.length} {t('practice.correct')}
        </Text>

        <TouchableOpacity
          onPress={handleReset}
          className="bg-blue-600 px-8 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-2">{t('practice.title')}</Text>
      <Text className="text-gray-600 mb-6">{t('practice.subtitle')}</Text>

      <Text className="text-lg font-semibold mb-4">{t('practice.selectTestType')}</Text>

      {TEST_TYPES.map((test) => (
        <TouchableOpacity
          key={test.id}
          onPress={() => handleGenerateTest(test.id)}
          className="flex-row items-center p-4 bg-gray-50 rounded-lg mb-3 border border-gray-200"
        >
          <Text className="text-2xl mr-4">{test.icon}</Text>
          <Text className="text-lg font-medium">{test.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
