import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const LANGUAGE_KEY = 'app_language';

// English translations
const en = {
  common: {
    loading: 'Loading...',
    error: 'An error occurred',
    retry: 'Retry',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search',
    filter: 'Filter',
    apply: 'Apply',
    clear: 'Clear',
  },
  tabs: {
    home: 'Home',
    jobs: 'Jobs',
    practice: 'Practice',
    resources: 'Resources',
    settings: 'Settings',
  },
  home: {
    welcome: 'Welcome to Rojgar Mitra',
    subtitle: 'Your gateway to government job opportunities',
    latestJobs: 'Latest Jobs',
    viewAll: 'View All',
    quickLinks: 'Quick Links',
    recentResources: 'Recent Resources',
  },
  jobs: {
    title: 'Government Jobs',
    searchPlaceholder: 'Search jobs...',
    noJobsFound: 'No jobs found',
    applyNow: 'Apply Now',
    share: 'Share',
    salary: 'Salary',
    location: 'Location',
    deadline: 'Deadline',
    requirements: 'Requirements',
    source: 'Source',
  },
  practice: {
    title: 'AI Practice Tests',
    subtitle: 'Generate personalized practice tests using AI',
    startTest: 'Start Test',
    submitAnswer: 'Submit Answer',
    nextQuestion: 'Next Question',
    finishTest: 'Finish Test',
    score: 'Score',
    correct: 'Correct',
    incorrect: 'Incorrect',
    explanation: 'Explanation',
    selectTestType: 'Select Test Type',
    generating: 'Generating test...',
    questionsAnswered: 'Questions Answered',
    completed: 'Completed',
    selectLanguage: 'Select Language',
  },
  resources: {
    title: 'Resources',
    categories: 'Categories',
    noResourcesFound: 'No resources found',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    selectLanguage: 'Select Language',
    english: 'English',
    gujarati: 'Gujarati',
    hindi: 'Hindi',
    notifications: 'Notifications',
    enableNotifications: 'Enable Notifications',
    about: 'About',
    version: 'Version',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    clearCache: 'Clear Cache',
    cacheCleared: 'Cache cleared successfully',
  },
};

// Gujarati translations
const gu = {
  common: {
    loading: 'લોડિંગ...',
    error: 'એક ભૂલ થઈ',
    retry: 'ફરી પ્રયાસ કરો',
    save: 'સંગ્રહ કરો',
    cancel: 'રદ કરો',
    search: 'શોધો',
    filter: 'ફિલ્ટર',
    apply: 'લાગુ કરો',
    clear: 'સાફ કરો',
  },
  tabs: {
    home: 'હોમ',
    jobs: 'નોકરીઓ',
    practice: 'અભ્યાસ',
    resources: 'સંસાધનો',
    settings: 'સેટિંગ્સ',
  },
  home: {
    welcome: 'રોજગાર મિત્ર માં આપનું સ્વાગત છે',
    subtitle: 'સરકારી નોકરીની તકો માટે તમારું દ્વાર',
    latestJobs: 'તાજી નોકરીઓ',
    viewAll: 'બધું જુઓ',
    quickLinks: 'ઝડપી લિંક્સ',
    recentResources: 'તાજા સંસાધનો',
  },
  jobs: {
    title: 'સરકારી નોકરીઓ',
    searchPlaceholder: 'નોકરીઓ શોધો...',
    noJobsFound: 'કોઈ નોકરી મળી નથી',
    applyNow: 'હવે અરજી કરો',
    share: 'શેર કરો',
    salary: 'પગાર',
    location: 'સ્થાન',
    deadline: 'છેલ્લી તારીખ',
    requirements: 'જરૂરિયાતો',
    source: 'સ્રોત',
  },
  practice: {
    title: 'AI અભ્યાસ પરીક્ષાઓ',
    subtitle: 'AI વાપરીને વ્યક્તિગત અભ્યાસ પરીક્ષાઓ બનાવો',
    startTest: 'પરીક્ષા શરૂ કરો',
    submitAnswer: 'જવાબ સબમિટ કરો',
    nextQuestion: 'આગળનો પ્રશ્ન',
    finishTest: 'પરીક્ષા પૂર્ણ કરો',
    score: 'ગુણ',
    correct: 'સાચું',
    incorrect: 'ખોટું',
    explanation: 'સમજૂતી',
    selectTestType: 'પરીક્ષા પ્રકાર પસંદ કરો',
    generating: 'પરીક્ષા બનાવી રહ્યા છીએ...',
    questionsAnswered: 'પ્રશ્નોના જવાબ આપ્યા',
    completed: 'પૂર્ણ થયું',
    selectLanguage: 'ભાષા પસંદ કરો',
  },
  resources: {
    title: 'સંસાધનો',
    categories: 'શ્રેણીઓ',
    noResourcesFound: 'કોઈ સંસાધન મળ્યું નથી',
  },
  settings: {
    title: 'સેટિંગ્સ',
    language: 'ભાષા',
    selectLanguage: 'ભાષા પસંદ કરો',
    english: 'English',
    gujarati: 'ગુજરાતી',
    hindi: 'हिंदी',
    notifications: 'સૂચનાઓ',
    enableNotifications: 'સૂચનાઓ સક્રિય કરો',
    about: 'વિશે',
    version: 'સંસ્કરણ',
    privacyPolicy: 'પ્રાઇવસી પોલિસી',
    termsOfService: 'સેવાની શરતો',
    clearCache: 'કેશ સાફ કરો',
    cacheCleared: 'કેશ સફ્ર્ય થયું',
  },
};

// Hindi translations
const hi = {
  common: {
    loading: 'लोड हो रहा है...',
    error: 'एक त्रुटि हुई',
    retry: 'पुनः प्रयास करें',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    search: 'खोजें',
    filter: 'फ़िल्टर',
    apply: 'लागू करें',
    clear: 'साफ़ करें',
  },
  tabs: {
    home: 'होम',
    jobs: 'नौकरियाँ',
    practice: 'अभ्यास',
    resources: 'संसाधन',
    settings: 'सेटिंग्स',
  },
  home: {
    welcome: 'रोज़गार मित्र में आपका स्वागत है',
    subtitle: 'सरकारी नौकरी के अवसरों का आपका द्वार',
    latestJobs: 'नवीनतम नौकरियाँ',
    viewAll: 'सभी देखें',
    quickLinks: 'त्वरित लिंक',
    recentResources: 'हाल के संसाधन',
  },
  jobs: {
    title: 'सरकारी नौकरियाँ',
    searchPlaceholder: 'नौकरियाँ खोजें...',
    noJobsFound: 'कोई नौकरी नहीं मिली',
    applyNow: 'अभी आवेदन करें',
    share: 'साझा करें',
    salary: 'वेतन',
    location: 'स्थान',
    deadline: 'अंतिम तिथि',
    requirements: 'आवश्यकताएँ',
    source: 'स्रोत',
  },
  practice: {
    title: 'AI अभ्यास परीक्षाएँ',
    subtitle: 'AI का उपयोग करके व्यक्तिगत अभ्यास परीक्षाएँ बनाएं',
    startTest: 'परीक्षा शुरू करें',
    submitAnswer: 'उत्तर जमा करें',
    nextQuestion: 'अगला प्रश्न',
    finishTest: 'परीक्षा समाप्त करें',
    score: 'अंक',
    correct: 'सही',
    incorrect: 'गलत',
    explanation: 'व्याख्या',
    selectTestType: 'परीक्षा प्रकार चुनें',
    generating: 'परीक्षा बना रहे हैं...',
    questionsAnswered: 'प्रश्नों के उत्तर दिए',
    completed: 'पूर्ण',
    selectLanguage: 'भाषा चुनें',
  },
  resources: {
    title: 'संसाधन',
    categories: 'श्रेणियाँ',
    noResourcesFound: 'कोई संसाधन नहीं मिला',
  },
  settings: {
    title: 'सेटिंग्स',
    language: 'भाषा',
    selectLanguage: 'भाषा चुनें',
    english: 'English',
    gujarati: 'ગુજરાતી',
    hindi: 'हिंदी',
    notifications: 'सूचनाएँ',
    enableNotifications: 'सूचनाएँ सक्षम करें',
    about: 'के बारे में',
    version: 'संस्करण',
    privacyPolicy: 'गोपनीयता नीति',
    termsOfService: 'सेवा की शर्तें',
    clearCache: 'कैश साफ़ करें',
    cacheCleared: 'कैश सफलतापूर्वक साफ़ हुआ',
  },
};

// Get stored language or default to 'en'
const getStoredLanguage = async (): Promise<string> => {
  try {
    const language = await AsyncStorage.getItem(LANGUAGE_KEY);
    return language || 'en';
  } catch {
    return 'en';
  }
};

// Initialize i18next
export const initI18n = async () => {
  const language = await getStoredLanguage();

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      gu: { translation: gu },
      hi: { translation: hi },
    },
    lng: language,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });

  return i18n;
};

// Change language and store it
export const changeLanguage = async (lang: string) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18n.changeLanguage(lang);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

export default i18n;
