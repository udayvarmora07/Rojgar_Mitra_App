import type { Language } from './languages';
import type { Topic } from './testCategories';

export type OptionKey = 'A' | 'B' | 'C' | 'D';

export interface Question {
  question: string;
  options: Record<OptionKey, string>;
  correct: OptionKey;
  explanation: string;
}

type Localized = { q: string; o: [string, string, string, string]; e: string };
type BankItem = { correct: OptionKey } & Record<Language, Localized>;

/**
 * Pre-loaded offline question bank (PRD 6.4). Used when there is no network and
 * no cached AI test. Facts are deliberately stable (no time-sensitive news).
 */
const BANK: Record<Topic, BankItem[]> = {
  gk: [
    {
      correct: 'B',
      en: { q: 'What is the capital of Gujarat?', o: ['Ahmedabad', 'Gandhinagar', 'Surat', 'Vadodara'], e: 'Gandhinagar is the capital of Gujarat state.' },
      gu: { q: 'ગુજરાતની રાજધાની કઈ છે?', o: ['અમદાવાદ', 'ગાંધીનગર', 'સુરત', 'વડોદરા'], e: 'ગાંધીનગર ગુજરાત રાજ્યની રાજધાની છે.' },
      hi: { q: 'गुजरात की राजधानी कौन सी है?', o: ['अहमदाबाद', 'गांधीनगर', 'सूरत', 'वडोदरा'], e: 'गांधीनगर गुजरात राज्य की राजधानी है।' },
    },
    {
      correct: 'B',
      en: { q: 'Who is known as the "Iron Man of India"?', o: ['Mahatma Gandhi', 'Sardar Vallabhbhai Patel', 'Jawaharlal Nehru', 'Dr. B. R. Ambedkar'], e: 'Sardar Vallabhbhai Patel united the princely states of India, so he is called the Iron Man.' },
      gu: { q: 'ભારતના "લોખંડી પુરુષ" તરીકે કોણ ઓળખાય છે?', o: ['મહાત્મા ગાંધી', 'સરદાર વલ્લભભાઈ પટેલ', 'જવાહરલાલ નેહરુ', 'ડૉ. બી. આર. આંબેડકર'], e: 'સરદાર વલ્લભભાઈ પટેલે દેશનાં રજવાડાંને એક કર્યાં, તેથી તેમને લોખંડી પુરુષ કહેવાય છે.' },
      hi: { q: 'भारत के "लौह पुरुष" के रूप में किसे जाना जाता है?', o: ['महात्मा गांधी', 'सरदार वल्लभभाई पटेल', 'जवाहरलाल नेहरू', 'डॉ. बी. आर. आंबेडकर'], e: 'सरदार वल्लभभाई पटेल ने देश की रियासतों को एक किया, इसलिए उन्हें लौह पुरुष कहा जाता है।' },
    },
    {
      correct: 'B',
      en: { q: 'On which date did the Constitution of India come into effect?', o: ['15 August 1947', '26 January 1950', '26 November 1949', '2 October 1950'], e: 'The Constitution came into effect on 26 January 1950, which is why we celebrate Republic Day on that date.' },
      gu: { q: 'ભારતનું બંધારણ કઈ તારીખે અમલમાં આવ્યું?', o: ['15 ઓગસ્ટ 1947', '26 જાન્યુઆરી 1950', '26 નવેમ્બર 1949', '2 ઓક્ટોબર 1950'], e: 'બંધારણ 26 જાન્યુઆરી 1950ના રોજ અમલમાં આવ્યું, તેથી તે દિવસે પ્રજાસત્તાક દિવસ ઉજવાય છે.' },
      hi: { q: 'भारत का संविधान किस तारीख को लागू हुआ?', o: ['15 अगस्त 1947', '26 जनवरी 1950', '26 नवंबर 1949', '2 अक्टूबर 1950'], e: 'संविधान 26 जनवरी 1950 को लागू हुआ, इसीलिए इस दिन गणतंत्र दिवस मनाया जाता है।' },
    },
    {
      correct: 'C',
      en: { q: 'Which river flows through Ahmedabad city?', o: ['Narmada', 'Tapi', 'Sabarmati', 'Mahi'], e: 'The Sabarmati river flows through the middle of Ahmedabad.' },
      gu: { q: 'અમદાવાદ શહેરમાંથી કઈ નદી પસાર થાય છે?', o: ['નર્મદા', 'તાપી', 'સાબરમતી', 'મહી'], e: 'સાબરમતી નદી અમદાવાદ શહેરની વચ્ચેથી વહે છે.' },
      hi: { q: 'अहमदाबाद शहर से कौन सी नदी गुजरती है?', o: ['नर्मदा', 'तापी', 'साबरमती', 'माही'], e: 'साबरमती नदी अहमदाबाद शहर के बीच से बहती है।' },
    },
  ],
  math: [
    {
      correct: 'B',
      en: { q: 'What is 15 + 27?', o: ['41', '42', '43', '44'], e: '15 + 27 = 42' },
      gu: { q: '15 + 27 કેટલા થાય?', o: ['41', '42', '43', '44'], e: '15 + 27 = 42' },
      hi: { q: '15 + 27 कितना होता है?', o: ['41', '42', '43', '44'], e: '15 + 27 = 42' },
    },
    {
      correct: 'B',
      en: { q: 'What is 8 × 7?', o: ['54', '56', '58', '60'], e: '8 × 7 = 56' },
      gu: { q: '8 × 7 કેટલા થાય?', o: ['54', '56', '58', '60'], e: '8 × 7 = 56' },
      hi: { q: '8 × 7 कितना होता है?', o: ['54', '56', '58', '60'], e: '8 × 7 = 56' },
    },
    {
      correct: 'C',
      en: { q: 'What is 25% of 200?', o: ['25', '40', '50', '75'], e: '25% of 200 = 200 × 25 ÷ 100 = 50' },
      gu: { q: '200 ના 25% કેટલા થાય?', o: ['25', '40', '50', '75'], e: '200 ના 25% = 200 × 25 ÷ 100 = 50' },
      hi: { q: '200 का 25% कितना होता है?', o: ['25', '40', '50', '75'], e: '200 का 25% = 200 × 25 ÷ 100 = 50' },
    },
    {
      correct: 'C',
      en: { q: 'A field is 12 m long and 5 m wide. What is its area?', o: ['17 sq m', '34 sq m', '60 sq m', '120 sq m'], e: 'Area = length × width = 12 × 5 = 60 sq m' },
      gu: { q: 'એક ખેતર 12 મીટર લાંબું અને 5 મીટર પહોળું છે. તેનું ક્ષેત્રફળ કેટલું?', o: ['17 ચોરસ મીટર', '34 ચોરસ મીટર', '60 ચોરસ મીટર', '120 ચોરસ મીટર'], e: 'ક્ષેત્રફળ = લંબાઈ × પહોળાઈ = 12 × 5 = 60 ચોરસ મીટર' },
      hi: { q: 'एक खेत 12 मीटर लंबा और 5 मीटर चौड़ा है। उसका क्षेत्रफल कितना है?', o: ['17 वर्ग मीटर', '34 वर्ग मीटर', '60 वर्ग मीटर', '120 वर्ग मीटर'], e: 'क्षेत्रफल = लंबाई × चौड़ाई = 12 × 5 = 60 वर्ग मीटर' },
    },
  ],
  reasoning: [
    {
      correct: 'C',
      en: { q: 'Complete the series: 2, 4, 8, 16, ?', o: ['24', '30', '32', '36'], e: 'Each number is double the previous one: 16 × 2 = 32.' },
      gu: { q: 'શ્રેણી પૂર્ણ કરો: 2, 4, 8, 16, ?', o: ['24', '30', '32', '36'], e: 'દરેક સંખ્યા આગળની સંખ્યાથી બમણી છે: 16 × 2 = 32.' },
      hi: { q: 'श्रृंखला पूरी करें: 2, 4, 8, 16, ?', o: ['24', '30', '32', '36'], e: 'हर संख्या पिछली संख्या की दुगुनी है: 16 × 2 = 32।' },
    },
    {
      correct: 'B',
      en: { q: 'Find the odd one out.', o: ['Mango', 'Potato', 'Banana', 'Apple'], e: 'Potato is a vegetable; the others are fruits.' },
      gu: { q: 'બેજોડ પસંદ કરો.', o: ['કેરી', 'બટાકા', 'કેળું', 'સફરજન'], e: 'બટાકા શાકભાજી છે, બાકીના ફળ છે.' },
      hi: { q: 'बेमेल चुनें।', o: ['आम', 'आलू', 'केला', 'सेब'], e: 'आलू सब्ज़ी है, बाकी फल हैं।' },
    },
    {
      correct: 'A',
      en: { q: 'Ramesh walks 5 km north, then turns right and walks 3 km. Which direction is he facing now?', o: ['East', 'West', 'North', 'South'], e: 'Turning right while facing north means facing east.' },
      gu: { q: 'રમેશ 5 કિમી ઉત્તર તરફ ચાલે છે, પછી જમણી બાજુ વળીને 3 કિમી ચાલે છે. હવે તેનું મોં કઈ દિશામાં છે?', o: ['પૂર્વ', 'પશ્ચિમ', 'ઉત્તર', 'દક્ષિણ'], e: 'ઉત્તર તરફ જતાં જમણી બાજુ વળીએ તો પૂર્વ દિશા આવે.' },
      hi: { q: 'रमेश 5 किमी उत्तर की ओर चलता है, फिर दाईं ओर मुड़कर 3 किमी चलता है। अब उसका मुँह किस दिशा में है?', o: ['पूर्व', 'पश्चिम', 'उत्तर', 'दक्षिण'], e: 'उत्तर की ओर जाते हुए दाईं ओर मुड़ने पर पूर्व दिशा आती है।' },
    },
    {
      correct: 'B',
      en: { q: "A is B's father. C is A's father. How is C related to B?", o: ['Uncle', 'Grandfather', 'Father', 'Brother'], e: "Father's father is the grandfather." },
      gu: { q: 'A, B ના પિતા છે. C, A ના પિતા છે. તો C, B ના શું થાય?', o: ['કાકા', 'દાદા', 'પિતા', 'ભાઈ'], e: 'પિતાના પિતા એટલે દાદા.' },
      hi: { q: 'A, B के पिता हैं। C, A के पिता हैं। C, B के क्या लगते हैं?', o: ['चाचा', 'दादा', 'पिता', 'भाई'], e: 'पिता के पिता दादा होते हैं।' },
    },
  ],
  gujarati: [
    {
      correct: 'A',
      en: { q: 'What is the opposite of the Gujarati word "દિવસ" (day)?', o: ['રાત', 'સવાર', 'સાંજ', 'બપોર'], e: 'The opposite of "દિવસ" (day) is "રાત" (night).' },
      gu: { q: '"દિવસ" નો વિરુદ્ધાર્થી શબ્દ કયો છે?', o: ['રાત', 'સવાર', 'સાંજ', 'બપોર'], e: '"દિવસ" નો વિરુદ્ધાર્થી શબ્દ "રાત" છે.' },
      hi: { q: 'गुजराती शब्द "દિવસ" (दिन) का विलोम शब्द क्या है?', o: ['રાત', 'સવાર', 'સાંજ', 'બપોર'], e: '"દિવસ" (दिन) का विलोम "રાત" (रात) है।' },
    },
    {
      correct: 'A',
      en: { q: 'Which word is a synonym of the Gujarati word "જળ"?', o: ['પાણી', 'દૂધ', 'ભાત', 'રોટલી'], e: '"જળ" and "પાણી" both mean water.' },
      gu: { q: '"જળ" નો સમાનાર્થી શબ્દ કયો છે?', o: ['પાણી', 'દૂધ', 'ભાત', 'રોટલી'], e: '"જળ" અને "પાણી" સમાનાર્થી શબ્દો છે.' },
      hi: { q: 'गुजराती शब्द "જળ" का समानार्थी शब्द कौन सा है?', o: ['પાણી', 'દૂધ', 'ભાત', 'રોટલી'], e: '"જળ" और "પાણી" दोनों का अर्थ पानी है।' },
    },
    {
      correct: 'B',
      en: { q: 'Which script is used to write Gujarati?', o: ['Devanagari script', 'Gujarati script', 'Bengali script', 'Tamil script'], e: 'Gujarati is written in its own Gujarati script.' },
      gu: { q: 'ગુજરાતી ભાષા કઈ લિપિમાં લખાય છે?', o: ['દેવનાગરી લિપિ', 'ગુજરાતી લિપિ', 'બંગાળી લિપિ', 'તમિલ લિપિ'], e: 'ગુજરાતી ભાષા ગુજરાતી લિપિમાં લખાય છે.' },
      hi: { q: 'गुजराती भाषा किस लिपि में लिखी जाती है?', o: ['देवनागरी लिपि', 'गुजराती लिपि', 'बांग्ला लिपि', 'तमिल लिपि'], e: 'गुजराती भाषा गुजराती लिपि में लिखी जाती है।' },
    },
    {
      correct: 'A',
      en: { q: 'Who is regarded as the "Adi Kavi" (first poet) of Gujarati?', o: ['Narsinh Mehta', 'Mirabai', 'Premanand Bhatt', 'Dayaram'], e: 'Narsinh Mehta is honoured as the Adi Kavi of the Gujarati language.' },
      gu: { q: 'ગુજરાતી ભાષાના "આદિ કવિ" તરીકે કોને ગણવામાં આવે છે?', o: ['નરસિંહ મહેતા', 'મીરાંબાઈ', 'પ્રેમાનંદ ભટ્ટ', 'દયારામ'], e: 'નરસિંહ મહેતાને ગુજરાતી ભાષાના આદિ કવિ ગણવામાં આવે છે.' },
      hi: { q: 'गुजराती भाषा का "आदि कवि" किसे माना जाता है?', o: ['नरसिंह मेहता', 'मीराबाई', 'प्रेमानंद भट्ट', 'दयाराम'], e: 'नरसिंह मेहता को गुजराती भाषा का आदि कवि माना जाता है।' },
    },
  ],
  english: [
    {
      correct: 'B',
      en: { q: 'What is the plural of "child"?', o: ['childs', 'children', 'childes', 'childrens'], e: 'The plural of "child" is "children".' },
      gu: { q: '"child" નું બહુવચન શું થાય?', o: ['childs', 'children', 'childes', 'childrens'], e: '"child" નું બહુવચન "children" થાય છે.' },
      hi: { q: '"child" का बहुवचन क्या है?', o: ['childs', 'children', 'childes', 'childrens'], e: '"child" का बहुवचन "children" होता है।' },
    },
    {
      correct: 'A',
      en: { q: 'What is the opposite of "hot"?', o: ['cold', 'warm', 'big', 'slow'], e: 'The opposite of "hot" is "cold".' },
      gu: { q: '"hot" નો વિરુદ્ધાર્થી શબ્દ કયો છે?', o: ['cold', 'warm', 'big', 'slow'], e: '"hot" (ગરમ) નો વિરુદ્ધાર્થી "cold" (ઠંડું) છે.' },
      hi: { q: '"hot" का विलोम शब्द कौन सा है?', o: ['cold', 'warm', 'big', 'slow'], e: '"hot" (गरम) का विलोम "cold" (ठंडा) है।' },
    },
    {
      correct: 'B',
      en: { q: 'Fill in the blank: She ___ to school every day.', o: ['go', 'goes', 'going', 'gone'], e: 'With "she" in the simple present tense we use "goes".' },
      gu: { q: 'ખાલી જગ્યા પૂરો: She ___ to school every day.', o: ['go', 'goes', 'going', 'gone'], e: '"She" સાથે સાદા વર્તમાનકાળમાં "goes" વપરાય છે.' },
      hi: { q: 'रिक्त स्थान भरें: She ___ to school every day.', o: ['go', 'goes', 'going', 'gone'], e: '"She" के साथ सामान्य वर्तमान काल में "goes" का प्रयोग होता है।' },
    },
    {
      correct: 'A',
      en: { q: 'What is the past tense of "go"?', o: ['went', 'goed', 'gone', 'going'], e: 'The past tense of "go" is "went".' },
      gu: { q: '"go" નો ભૂતકાળ શું થાય?', o: ['went', 'goed', 'gone', 'going'], e: '"go" નો ભૂતકાળ "went" થાય છે.' },
      hi: { q: '"go" का भूतकाल क्या है?', o: ['went', 'goed', 'gone', 'going'], e: '"go" का भूतकाल "went" होता है।' },
    },
  ],
  current: [
    {
      correct: 'B',
      en: { q: 'In which state is the Statue of Unity located?', o: ['Maharashtra', 'Gujarat', 'Rajasthan', 'Madhya Pradesh'], e: 'The Statue of Unity stands near Kevadia (Ekta Nagar) in Narmada district, Gujarat.' },
      gu: { q: '"સ્ટેચ્યુ ઓફ યુનિટી" કયા રાજ્યમાં આવેલી છે?', o: ['મહારાષ્ટ્ર', 'ગુજરાત', 'રાજસ્થાન', 'મધ્ય પ્રદેશ'], e: 'સ્ટેચ્યુ ઓફ યુનિટી ગુજરાતના નર્મદા જિલ્લામાં કેવડિયા (એકતા નગર) પાસે આવેલી છે.' },
      hi: { q: '"स्टैच्यू ऑफ यूनिटी" किस राज्य में स्थित है?', o: ['महाराष्ट्र', 'गुजरात', 'राजस्थान', 'मध्य प्रदेश'], e: 'स्टैच्यू ऑफ यूनिटी गुजरात के नर्मदा जिले में केवड़िया (एकता नगर) के पास स्थित है।' },
    },
    {
      correct: 'A',
      en: { q: 'On which date was the state of Gujarat formed?', o: ['1 May 1960', '15 August 1947', '26 January 1950', '2 October 1960'], e: 'Gujarat was formed on 1 May 1960. This day is celebrated as Gujarat Day.' },
      gu: { q: 'ગુજરાત રાજ્યની સ્થાપના કઈ તારીખે થઈ?', o: ['1 મે 1960', '15 ઓગસ્ટ 1947', '26 જાન્યુઆરી 1950', '2 ઓક્ટોબર 1960'], e: 'ગુજરાત રાજ્યની સ્થાપના 1 મે 1960ના રોજ થઈ. આ દિવસ ગુજરાત સ્થાપના દિવસ તરીકે ઉજવાય છે.' },
      hi: { q: 'गुजरात राज्य की स्थापना किस तारीख को हुई?', o: ['1 मई 1960', '15 अगस्त 1947', '26 जनवरी 1950', '2 अक्टूबर 1960'], e: 'गुजरात राज्य की स्थापना 1 मई 1960 को हुई। यह दिन गुजरात स्थापना दिवस के रूप में मनाया जाता है।' },
    },
    {
      correct: 'A',
      en: { q: 'Which forest in Gujarat is the only wild home of Asiatic lions?', o: ['Gir', 'Dang', 'Velavadar', 'Shoolpaneshwar'], e: 'Wild Asiatic lions are found only in and around the Gir forest of Gujarat.' },
      gu: { q: 'જંગલી એશિયાઈ સિંહોનું એકમાત્ર ઘર ગુજરાતનું કયું જંગલ છે?', o: ['ગીર', 'ડાંગ', 'વેળાવદર', 'શૂલપાણેશ્વર'], e: 'જંગલી એશિયાઈ સિંહો ફક્ત ગુજરાતના ગીર જંગલ અને આસપાસ જોવા મળે છે.' },
      hi: { q: 'गुजरात का कौन सा जंगल जंगली एशियाई शेरों का एकमात्र घर है?', o: ['गिर', 'डांग', 'वेलावदर', 'शूलपाणेश्वर'], e: 'जंगली एशियाई शेर केवल गुजरात के गिर जंगल और उसके आसपास पाए जाते हैं।' },
    },
    {
      correct: 'B',
      en: { q: "Which city became India's first UNESCO World Heritage City in 2017?", o: ['Surat', 'Ahmedabad', 'Vadodara', 'Rajkot'], e: "Ahmedabad was declared India's first World Heritage City in 2017." },
      gu: { q: '2017માં ભારતનું પ્રથમ યુનેસ્કો વર્લ્ડ હેરિટેજ સિટી કયું શહેર બન્યું?', o: ['સુરત', 'અમદાવાદ', 'વડોદરા', 'રાજકોટ'], e: 'અમદાવાદને 2017માં ભારતના પ્રથમ વર્લ્ડ હેરિટેજ સિટીનો દરજ્જો મળ્યો.' },
      hi: { q: '2017 में कौन सा शहर भारत का पहला यूनेस्को विश्व धरोहर शहर बना?', o: ['सूरत', 'अहमदाबाद', 'वडोदरा', 'राजकोट'], e: 'अहमदाबाद को 2017 में भारत के पहले विश्व धरोहर शहर का दर्जा मिला।' },
    },
  ],
};

export function getBankQuestions(topic: Topic, language: Language): Question[] {
  return BANK[topic].map((item) => {
    const l = item[language];
    return {
      question: l.q,
      options: { A: l.o[0], B: l.o[1], C: l.o[2], D: l.o[3] },
      correct: item.correct,
      explanation: l.e,
    };
  });
}
