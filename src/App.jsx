import React, { useState, useEffect, useRef } from 'react';
import { Volume2, PlayCircle, Trophy, RefreshCw, Star, CheckCircle2, XCircle, Home, Upload, List, User, Download, HelpCircle } from 'lucide-react';

// ==========================================
// Firebase 雲端資料庫初始化設定 (Data Analytics)
// ==========================================
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// 👉 未來請將這裡替換為您在 Firebase 後台申請的真實金鑰
const firebaseConfig = {
  apiKey: "AIzaSyD5kJt5ATolT3uFKW2svVdOrZj6GzDOmDE",
  authDomain: "jept-english-game.firebaseapp.com",
  projectId: "jept-english-game",
  storageBucket: "jept-english-game.firebasestorage.app",
  messagingSenderId: "214976880076",
  appId: "1:214976880076:web:74c2cb77befcbb79e4d169",
  measurementId: "G-VLK4QPEZTN"
};

// 安全初始化：若未填入真實金鑰，系統將以「離線模式」運作，不會中斷遊戲
let db = null;
try {
  if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase 雲端資料庫連線成功！");
  }
} catch (e) {
  console.warn("Firebase 初始化失敗，請確認金鑰設定。");
}

// ==========================================
// 1. 內建 100 題完整題庫 (從 PDF Grammar & Comprehension 擷取)
// ==========================================
const RAW_QUESTIONS = [
  // --- Grammar: 基礎物品與顏色 ---
  ['picture', '🍎', "What is it?", "It's a banana.", "It's an apple.", "It's a tomato.", 1],
  ['picture', '⬛', "What color is it?", "It's red.", "It's black.", "It's yellow.", 1],
  ['conversation', '💬', "Is it a window?", "Yes, it is.", "No, it is not.", "It is blue.", 1],
  ['picture', '🚪', "Is it a door?", "Yes, it is.", "No, it is not.", "It is an apple.", 0],
  ['picture', '🍌', "Is this a banana?", "Yes, it is.", "No, it is not.", "It is red.", 0],
  ['picture', '✏️', "Is this a pencil?", "It is an ant.", "Yes, it is.", "No, it is not.", 1],
  ['conversation', '💬', "Is that an apple?", "Yes, it is.", "No, it is not.", "It is my hat.", 1],
  ['picture', '📺', "Is that a TV?", "No, it is not.", "Yes, it is.", "It is an eraser.", 1],
  ['conversation', '💬', "What is this?", "It is my dog.", "I am Abby.", "You are Nick.", 0],
  ['picture', '⭐', "What is it?", "It is a blue star.", "It is an ant.", "It is a bug.", 0],
  ['conversation', '💬', "What is that?", "She is Fifi.", "It is a yo-yo.", "I am seven.", 1],
  ['picture', '👒', "This is my hat. What color is it?", "It is orange.", "It is blue.", "It is ten.", 1],
  ['picture', '📖', "Whose book is that?", "This is a pencil.", "It is my book.", "It is a door.", 1],
  ['picture', '🐜', "What is it?", "It is an ant.", "It is a bat.", "It is a ball.", 0],
  ['picture', '🟩', "What color is it?", "It is green.", "It is yellow.", "It is black.", 0],

  // --- Grammar: 時間、年齡與數字 ---
  ['conversation', '🕒', "What time is it?", "It is a clock.", "It is three o'clock.", "It is time.", 1],
  ['conversation', '💬', "How old are you?", "I am seven years old.", "I am fine.", "Here.", 0],
  ['picture', '🤖', "How many robots?", "I am ten.", "Ten.", "It is a robot.", 1],
  ['picture', '⚽', "How many balls are there?", "Thirteen.", "Three.", "Ten.", 0],
  ['conversation', '💬', "What time is the party?", "It is at eight o'clock.", "It is a party.", "Yes, it is.", 0],
  ['conversation', '💬', "Are you 7?", "Yes, I am 7, too.", "I am a boy.", "It is red.", 0],
  ['picture', '🎂', "How old are you?", "I am four.", "I am seven.", "I am ten.", 0],
  ['picture', '🕙', "What time is it?", "Ten o'clock.", "Three o'clock.", "Eight o'clock.", 0],
  ['conversation', '💬', "How old is he?", "He is Oz.", "He is seven.", "He is my brother.", 1],
  ['picture', '🎈', "How many balloons?", "Ten.", "Thirteen.", "Eighteen.", 2],
  ['conversation', '💬', "Is it at eight o'clock?", "Yes, it is.", "I am eight.", "No, it is an apple.", 0],
  ['picture', '📚', "How many books are there?", "There are eighteen books.", "It is a book.", "They are books.", 0],
  ['conversation', '💬', "Are there three glasses?", "Yes, there are three glasses.", "No, there is not a plate.", "It is a glass.", 0],
  ['picture', '🍽️', "Is there a plate?", "Yes, there is a plate.", "No, there is not a plate.", "I am cooking.", 0],
  ['conversation', '💬', "How old are they?", "They are ten.", "There are ten.", "It is ten.", 0],

  // --- Grammar: 人物、外觀與感覺 ---
  ['conversation', '👩', "Who is she?", "She is my mother.", "He is my father.", "It is a girl.", 0],
  ['conversation', '👨', "Who is he?", "She is my sister.", "He is my father.", "I am a boy.", 1],
  ['picture', '👦', "Who is he?", "He is my big brother.", "She is my mother.", "It is a yo-yo.", 0],
  ['conversation', '💬', "Is she tall?", "Yes, she is.", "No, she is not. She is thin.", "I am at home.", 0],
  ['conversation', '💬', "Is she fat?", "Yes, she is tall.", "No, she is not. She is thin.", "It is fat.", 1],
  ['picture', '💧', "Are you thirsty?", "Yes, I am thirsty.", "No, I am not thirsty.", "It is hot.", 1],
  ['conversation', '🤒', "Is she sick?", "Yes, she is sick.", "No, she is tall.", "I am fine.", 0],
  ['conversation', '😢', "Are you sad?", "Yes, I am.", "No, I am not. I am sad.", "I am seven.", 0],
  ['picture', '👁️', "Are your eyes big?", "Yes, my eyes are big.", "No, my eyes are small.", "My head is big.", 0],
  ['conversation', '💬', "Are you OK?", "No, I am not.", "It is OK.", "Yes, it is a star.", 0],
  ['conversation', '💬', "Are you sleepy?", "Yes, we are sleepy.", "No, I am thirsty.", "It is tired.", 0],
  ['picture', '👦', "Are you a good boy?", "Yes, I am a good boy.", "No, she is not.", "They are good.", 0],
  ['conversation', '💬', "You look pretty.", "Thank you.", "I am strong.", "You look sleepy.", 0],
  ['conversation', '💬', "You look strong.", "I am weak.", "Thank you.", "He is sick.", 1],
  ['conversation', '💬', "Who is he?", "He is my friend.", "It is my dog.", "She is Fifi.", 0],
  ['picture', '👧', "Is she smart and pretty?", "Yes, she is.", "No, he is not.", "I am a girl.", 0],
  ['conversation', '💬', "Are they your brothers?", "No, they are not my brothers.", "Yes, it is my brother.", "I am a boy.", 0],
  ['conversation', '💬', "Are they your cousins?", "Yes, they are my cousins.", "No, he is my cousin.", "It is a cousin.", 0],
  ['picture', '👦', "Who is he?", "He is my friend. His name is Leo.", "She is Nini.", "I am Tom.", 0],
  ['conversation', '💬', "Is he sick?", "Yes, he is.", "No, I am not.", "She is thirsty.", 0],

  // --- Grammar: 物品複數與位置 ---
  ['picture', '🖍️', "What are these?", "They are markers.", "They are ducks.", "I am cooking.", 0],
  ['conversation', '💬', "What are those?", "They are flowers.", "It is hot.", "These are apples.", 0],
  ['picture', '🐐', "What are you?", "We are goats.", "They are cats.", "It is a goat.", 0],
  ['conversation', '💬', "Are they heavy?", "Yes, they are heavy.", "No, it is not heavy.", "I am heavy.", 0],
  ['picture', '👕', "Is this your T-shirt?", "No, it is not my T-shirt.", "Yes, they are my shoes.", "It is a hat.", 0],
  ['conversation', '💬', "Are these your shoes?", "Yes, they are my shoes.", "No, it is not my T-shirt.", "It is an eraser.", 0],
  ['picture', '🍉', "Are those watermelons?", "No, they are not watermelons.", "Yes, they are watermelons.", "They are flowers.", 1],
  ['conversation', '💬', "Where is my apple?", "Here.", "It is red.", "I am seven.", 0],
  ['conversation', '💬', "Where is my milk?", "There.", "It is a glass.", "Yes, it is.", 0],
  ['picture', '📦', "Is it in the box?", "Yes, it is in the box.", "No, it is under the desk.", "It is a box.", 0],
  ['conversation', '💬', "Is it under the desk?", "Yes, it is.", "No, it is in the box.", "I am under the desk.", 0],
  ['conversation', '💬', "Where are you?", "I am at the park.", "It is the park.", "I am a boy.", 0],
  ['picture', '🏪', "Where is the bookstore?", "It is near the park.", "I am at home.", "This is my bedroom.", 0],
  ['conversation', '💬', "Where is the duck?", "There is a duck.", "It is in the box.", "They are goats.", 1],
  ['picture', '🏠', "Let's go to my house!", "OK!", "It is a house.", "I am at home.", 0],

  // --- Grammar: 動作與能力 ---
  ['conversation', '💬', "He can sing!", "I can dance.", "Yes, he is.", "No, it is not.", 0],
  ['conversation', '💬', "We can dance.", "They can dance.", "It is dancing.", "I am a boy.", 0],
  ['picture', '🎨', "Can you draw?", "Yes, we can draw.", "No, I am not drawing.", "She is pretty.", 0],
  ['conversation', '💬', "May I play with you?", "Sorry.", "I am cooking.", "It is a game.", 0],
  ['picture', '🛝', "Let's play on the slide!", "Sure.", "It is a swing.", "I am at the park.", 0],
  ['conversation', '💬', "What are you doing?", "I am cooking.", "I am a boy.", "There is a plate.", 0],
  ['picture', '🍳', "What are you doing?", "I am cooking.", "I am a boy.", "There is a plate.", 0],
  ['conversation', '💬', "Can they sing?", "Yes, they can.", "No, we cannot.", "He is singing.", 0],
  ['conversation', '💬', "May I come in?", "Sure. Come in!", "I am Abby.", "It is a door.", 0],
  ['conversation', '💬', "Let's go!", "Great.", "It is a blue star.", "I am 7.", 0],

  // --- Comprehension: 招呼語與日常對話 ---
  ['conversation', '💬', "Good morning.", "Good morning.", "Goodbye.", "Good night.", 0],
  ['conversation', '💬', "How are you?", "I am fine.", "I am a boy.", "It is a dog.", 0],
  ['conversation', '💬', "Hello. / Hi.", "Hi.", "Bye.", "Yes, it is.", 0],
  ['conversation', '💬', "Goodbye. / See you.", "See you.", "Good morning.", "Thank you.", 0],
  ['conversation', '💬', "Thank you very much.", "You're welcome.", "Sorry.", "Please.", 0],
  ['conversation', '💬', "I am sorry.", "That is OK.", "Thank you.", "You are welcome.", 0],
  ['picture', '🎂', "Happy birthday!", "Thank you!", "Me too.", "Oops!", 0],
  ['conversation', '💬', "Merry Christmas!", "Merry Christmas!", "Happy birthday!", "Nice to meet you.", 0],
  ['conversation', '💬', "Nice to meet you.", "Nice to meet you, too.", "I am fine.", "See you.", 0],
  ['conversation', '💬', "What's up?", "Not much.", "I am seven.", "It is up.", 0],

  // --- Comprehension: 教室用語與指令 ---
  ['conversation', '💬', "Stand up.", "OK.", "Sit down.", "I am standing.", 0],
  ['conversation', '💬', "Sit down.", "Have a seat.", "Stand up.", "Walk.", 0],
  ['picture', '🤫', "Be quiet.", "OK.", "I am talking.", "Listen.", 0],
  ['conversation', '💬', "Listen!", "I am listening.", "Look.", "Write.", 0],
  ['conversation', '💬', "Open your book.", "OK.", "Close your book.", "Read aloud.", 0],
  ['conversation', '💬', "Clean up.", "OK.", "Don't litter.", "Wash your hands.", 0],
  ['picture', '🧼', "Wash your hands.", "OK.", "Try again.", "Thumbs up.", 0],
  ['conversation', '💬', "Line up.", "Wait your turn.", "Sit up.", "Run.", 0],
  ['conversation', '💬', "Hurry up.", "OK.", "Stop.", "Be careful.", 0],
  ['conversation', '💬', "Try again.", "OK.", "Very good!", "Catch the ball.", 0],
  ['conversation', '💬', "Very good!", "Thank you.", "Sorry.", "Oops!", 0],
  ['conversation', '💬', "Don't worry.", "Thank you.", "I am scared.", "What is wrong?", 0],
  ['picture', '✋', "Put up your hands.", "OK.", "No, it is not.", "You're welcome.", 0],
  ['conversation', '💬', "What's wrong?", "I am sick.", "I am fine.", "You're welcome.", 0],
  ['conversation', '💬', "Let's play a game.", "Hurray!", "Be quiet.", "No talking.", 0]
];

const DEFAULT_QUESTIONS = RAW_QUESTIONS.map((q, index) => {
  const options = [q[3], q[4], q[5]];
  return {
    id: index + 1,
    type: q[0],
    image: q[1],
    rawQuestion: q[2], 
    playAllText: q[0] === 'picture' ? `Look at the picture. A. ${q[3]} B. ${q[4]} C. ${q[5]}` : `Listen carefully. ${q[2]}`,
    playOptionTexts: options,
    options: options,
    correctAnswer: options[q[6]], 
    instruction: q[0] === 'picture' ? '請看圖片，點擊喇叭聽選項，選出正確答案' : '請點擊喇叭聽問題，選出最適合的回應'
  };
});

const playTone = (audioCtx, frequency, type, duration) => {
  try {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) { console.warn("Audio playback failed"); }
};

export default function App() {
  const [gameState, setGameState] = useState('start'); 
  const [playerName, setPlayerName] = useState('');
  
  const [questionsPool, setQuestionsPool] = useState(DEFAULT_QUESTIONS);
  const [currentRoundQuestions, setCurrentRoundQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null); 
  const [selectedOption, setSelectedOption] = useState(null);
  
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(true);
  
  const [voicesPool, setVoicesPool] = useState([]);
  const [mistakes, setMistakes] = useState([]); 
  
  // 👉 紀錄這回合每一題的作答狀況 (供數據分析用)
  const [responseLog, setResponseLog] = useState([]);

  const audioCtxRef = useRef(null);
  const QUESTIONS_PER_ROUND = 10;
  const TIME_LIMIT = 20;

  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT); 
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const APP_VERSION = "1.9"; 

  useEffect(() => {
    if (!('speechSynthesis' in window)) setTtsSupported(false);
    
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const usVoices = voices.filter(v => v.lang.includes('US') && v.lang.includes('en'));
        const gbVoices = voices.filter(v => (v.lang.includes('GB') || v.lang.includes('UK')) && v.lang.includes('en'));

        const mixed = [];
        const maxLen = Math.max(usVoices.length, gbVoices.length);
        
        for (let i = 0; i < maxLen; i++) {
          if (usVoices[i]) mixed.push(usVoices[i]);
          if (gbVoices[i]) mixed.push(gbVoices[i]);
        }
        
        if (mixed.length === 0) mixed.push(...voices.filter(v => v.lang.startsWith('en')));
        setVoicesPool(mixed);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    if (localStorage.getItem('cept_version') !== APP_VERSION) {
      localStorage.removeItem('cept_unplayed_pool');
      localStorage.setItem('cept_version', APP_VERSION);
    }
    
    const savedName = localStorage.getItem('cept_last_player');
    if (savedName) setPlayerName(savedName);
  }, []);

  const speakText = (text, rate = 0.85, seed = 0) => {
    if (!ttsSupported) return;
    try {
      window.speechSynthesis.cancel(); 
      const utterance = new SpeechSynthesisUtterance(text);
      
      if (voicesPool.length > 0) {
        const selectedVoice = voicesPool[seed % voicesPool.length];
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = 'en-US'; 
      }

      utterance.rate = rate;    
      
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) { setIsPlayingAudio(false); }
  };

  const initGame = () => {
    if (!playerName.trim()) {
      alert("請先輸入闖關者姓名喔！");
      return;
    }
    localStorage.setItem('cept_last_player', playerName);

    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      if (ttsSupported) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    } catch (e) {}

    let unplayed = JSON.parse(localStorage.getItem('cept_unplayed_pool')) || [];
    if (unplayed.length < QUESTIONS_PER_ROUND) {
      unplayed = [...questionsPool].sort(() => Math.random() - 0.5);
    }

    const roundQuestions = unplayed.splice(0, QUESTIONS_PER_ROUND);
    localStorage.setItem('cept_unplayed_pool', JSON.stringify(unplayed));

    setCurrentRoundQuestions(roundQuestions);
    setGameState('playing');
    setCurrentQuestionIndex(0);
    setScore(0);
    setFeedback(null);
    setSelectedOption(null);
    setMistakes([]); 
    setResponseLog([]); // 重置數據足跡
    setTimeLeft(TIME_LIMIT); 
    setIsTimerRunning(false); 
  };

  useEffect(() => {
    let timerId;
    if (isTimerRunning && timeLeft > 0) {
      timerId = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isTimerRunning && timeLeft === 0) {
      handleTimeUp();
    }
    return () => clearTimeout(timerId);
  }, [isTimerRunning, timeLeft, feedback]);

  const handleTimeUp = () => {
    if (feedback) return; 
    
    if (ttsSupported) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }

    setIsTimerRunning(false); 
    setFeedback('wrong');     
    playTone(audioCtxRef.current, 300, 'sawtooth', 0.2); 
    
    const currentQuestion = currentRoundQuestions[currentQuestionIndex];

    setMistakes(prev => [...prev, {
      question: currentQuestion,
      userAnswer: '未作答 (超時)'
    }]);

    // 紀錄數據足跡：超時
    setResponseLog(prev => [...prev, {
      questionId: currentQuestion.id,
      questionType: currentQuestion.type,
      rawQuestion: currentQuestion.rawQuestion,
      isCorrect: false,
      timeTaken: TIME_LIMIT, // 耗盡時間
      userAnswer: '未作答 (超時)'
    }]);

    setTimeout(() => {
      if (currentQuestionIndex < currentRoundQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setFeedback(null);
        setSelectedOption(null);
        setTimeLeft(TIME_LIMIT); 
      } else {
        finishGame(score);
      }
    }, 2000);
  };

  const handleAnswer = (option) => {
    if (feedback) return; 
    
    if (ttsSupported) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }

    setIsTimerRunning(false); 
    setSelectedOption(option);

    const currentQuestion = currentRoundQuestions[currentQuestionIndex];
    const isCorrect = option.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
    const timeTaken = TIME_LIMIT - timeLeft; // 計算出這題花了多少秒思考
    
    // 紀錄數據足跡
    setResponseLog(prev => [...prev, {
      questionId: currentQuestion.id,
      questionType: currentQuestion.type,
      rawQuestion: currentQuestion.rawQuestion,
      isCorrect: isCorrect,
      timeTaken: timeTaken,
      userAnswer: option
    }]);

    if (isCorrect) {
      setScore(prev => prev + 10); 
      setFeedback('correct');
      playTone(audioCtxRef.current, 523.25, 'sine', 0.1); 
      setTimeout(() => playTone(audioCtxRef.current, 659.25, 'sine', 0.1), 100); 
    } else {
      setFeedback('wrong');
      playTone(audioCtxRef.current, 300, 'sawtooth', 0.2);
      
      setMistakes(prev => [...prev, {
        question: currentQuestion,
        userAnswer: option
      }]);
    }

    setTimeout(() => {
      if (currentQuestionIndex < currentRoundQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setFeedback(null);
        setSelectedOption(null);
        setTimeLeft(TIME_LIMIT); 
      } else {
        finishGame(score + (isCorrect ? 10 : 0));
      }
    }, 2000);
  };

  const finishGame = async (finalScore) => {
    setGameState('result');
    [523, 659, 783, 1046].forEach((freq, i) => {
      setTimeout(() => playTone(audioCtxRef.current, freq, 'square', 0.15), i * 150);
    });

    const history = JSON.parse(localStorage.getItem('cept_leaderboard')) || [];
    history.push({ 
      name: playerName, 
      score: finalScore, 
      date: new Date().toLocaleString(),
      timestamp: Date.now()
    });
    const recent10 = history.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
    localStorage.setItem('cept_leaderboard', JSON.stringify(recent10));

    // 👉 執行：將這回合的精準數據上傳到 Firebase
    if (db) {
      try {
        const sessionData = {
          playerName: playerName,
          totalScore: finalScore,
          timestamp: new Date().toISOString(),
          details: responseLog // 剛才累積收集的詳細數據陣列
        };
        // 寫入名為 "game_sessions" 的資料表 (Collection) 中
        await addDoc(collection(db, "game_sessions"), sessionData);
        console.log("📊 學習數據已成功同步至雲端 Data Dashboard!");
      } catch (error) {
        console.error("數據同步失敗，請確認 Firebase 設定", error);
      }
    }
  };

  const downloadCSVTemplate = () => {
    const csvContent = '\uFEFF' + 
      '題型(1看圖/2對話),圖片(Emoji),題目語音內容,選項A,選項B,選項C,正確選項完整文字\n' +
      '1,⬛,What color is it?,It is red.,It is black.,It is yellow.,It is black.\n' +
      '1,🍎,What is it?,It is a banana.,It is an apple.,It is a tomato.,It is an apple.\n' +
      '2,💬,How are you?,I am a boy.,I am fine.,It is a dog.,I am fine.\n' +
      '2,💬,Stand up.,OK.,Sit down.,I am standing.,OK.\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "CEPT_聽力題庫範本.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n');
        const newQuestions = [];
        const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const parts = line.split(regex).map(val => val.replace(/^"|"$/g, '').trim());
          if (parts.length >= 7) {
            const typeId = parts[0] === '1' || String(parts[0]).includes('看圖') ? 'picture' : 'conversation';
            const options = [parts[3], parts[4], parts[5]];
            let rawCorrectAns = parts[6];

            if (!options.includes(rawCorrectAns)) {
               const closeMatch = options.find(o => o.toLowerCase().trim() === rawCorrectAns.toLowerCase().trim());
               if (closeMatch) {
                  rawCorrectAns = closeMatch;
               } else {
                  const mapIndex = { 'a': 0, 'b': 1, 'c': 2, '1': 0, '2': 1, '3': 2 };
                  const charKey = rawCorrectAns.toLowerCase();
                  if (mapIndex[charKey] !== undefined) {
                     rawCorrectAns = options[mapIndex[charKey]];
                  } else {
                     console.warn(`第 ${i} 行的正確答案格式錯誤，已自動設定為選項A避免崩潰`);
                     rawCorrectAns = options[0];
                  }
               }
            }

            newQuestions.push({
              id: i,
              type: typeId,
              image: parts[1],
              rawQuestion: parts[2],
              playAllText: typeId === 'picture' ? `Look at the picture. A. ${parts[3]} B. ${parts[4]} C. ${parts[5]}` : `Listen carefully. ${parts[2]}`,
              playOptionTexts: options,
              options: options,
              correctAnswer: rawCorrectAns,
              instruction: typeId === 'picture' ? '請看圖片，點擊喇叭聽選項' : '請聽問題，選出最適合的回應'
            });
          }
        }

        if (newQuestions.length > 0) {
          setQuestionsPool(newQuestions);
          localStorage.removeItem('cept_unplayed_pool'); 
          alert(`成功匯入 ${newQuestions.length} 題，並已完成答案自動檢核修復！`);
        } else {
          alert('解析失敗：請確認 CSV 格式是否正確。');
        }
      } catch (error) {
        alert('檔案讀取發生錯誤。');
      }
    };
    reader.readAsText(file);
  };

  const getLeaderboard = () => {
    const history = JSON.parse(localStorage.getItem('cept_leaderboard')) || [];
    return history.sort((a, b) => b.score - a.score);
  };

  // ==========================================
  // 畫面渲染區塊
  // ==========================================

  if (gameState === 'start') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-50 p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border-4 border-indigo-200">
          <div className="flex justify-center mb-4">
            <div className="bg-indigo-100 p-5 rounded-full shadow-inner">
               <Volume2 className="text-indigo-500 w-14 h-14 animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-indigo-800 mb-2">聽力特訓班</h1>
          <p className="text-gray-600 mb-6 font-medium bg-gray-100 py-1 px-4 rounded-full inline-block">混合口音實戰模擬</p>
          
          <div className="mb-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input 
              type="text" 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="請輸入你的名字 (中英文皆可)"
              className="w-full pl-10 pr-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold text-gray-700 bg-indigo-50/30"
            />
          </div>
          
          <button 
            onClick={initGame}
            disabled={!ttsSupported}
            className={`w-full text-white text-xl font-bold py-4 px-8 rounded-2xl transition-transform transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg mb-4 ${ttsSupported ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-gray-400'}`}
          >
            <PlayCircle className="w-6 h-6" />
            開始挑戰 (10題)
          </button>

          <button 
            onClick={() => setGameState('leaderboard')}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-lg font-bold py-3 px-8 rounded-2xl transition-transform transform hover:scale-105 flex items-center justify-center gap-3 shadow mb-8"
          >
            <Trophy className="w-5 h-5" />
            查看英雄榜
          </button>

          <div className="pt-4 border-t-2 border-dashed border-gray-200 text-left">
            <h3 className="font-bold text-gray-600 mb-2 text-sm flex items-center justify-center gap-1">
               <Upload className="w-4 h-4" /> 自訂題庫管理
            </h3>
            
            <div className="flex gap-2 mb-2">
              <button 
                onClick={downloadCSVTemplate}
                className="flex-1 flex items-center justify-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 px-3 rounded-xl border border-green-200 text-sm transition-colors font-bold"
              >
                <Download size={16}/> 下載範例
              </button>
              
              <label className="flex-1 cursor-pointer flex items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 px-3 rounded-xl border border-indigo-200 text-sm transition-colors font-bold">
                <Upload size={16}/> 匯入 CSV
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 mb-2 shadow-inner">
              <p className="font-bold flex items-center gap-1 mb-1 text-gray-600">
                <HelpCircle size={12} /> 題庫準備說明：
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>請先點擊「下載範例」取得標準格式檔案。</li>
                <li>可使用 <strong>Excel</strong> 編輯，完成後儲存為 <strong>CSV 格式</strong>。</li>
                <li>題型請填：<span className="text-indigo-500 font-bold">1 (看圖)</span> 或 <span className="text-indigo-500 font-bold">2 (對話)</span>。</li>
              </ul>
            </div>

            <p className="text-xs text-center text-gray-400 font-bold mt-2">目前載入: {questionsPool.length} 題</p>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'leaderboard') {
    const ranks = getLeaderboard();
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-yellow-50 p-4">
        <div className="bg-white rounded-3xl shadow-xl p-6 max-w-md w-full border-4 border-yellow-300">
          <div className="flex items-center justify-center gap-3 mb-6 bg-yellow-100 py-3 rounded-2xl text-yellow-800">
            <Trophy className="w-8 h-8" />
            <h2 className="text-2xl font-black">最近 10 次測驗排名</h2>
          </div>
          
          <div className="space-y-3 mb-8 max-h-80 overflow-y-auto pr-2">
            {ranks.length === 0 ? (
              <p className="text-center text-gray-400 py-8">目前還沒有人挑戰喔！</p>
            ) : (
              ranks.map((record, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-white ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-300' : idx === 2 ? 'bg-orange-300' : 'bg-indigo-200'}`}>
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-gray-700">{record.name}</div>
                      <div className="text-xs text-gray-400">{record.date.split(' ')[0]}</div>
                    </div>
                  </div>
                  <div className="font-black text-xl text-indigo-600">{record.score} 分</div>
                </div>
              ))
            )}
          </div>

          <button 
            onClick={() => setGameState('start')}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-lg font-bold py-3 px-8 rounded-2xl flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" /> 回到主畫面
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'result') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border-4 border-green-200 overflow-hidden flex flex-col max-h-[95vh]">
          <div className="flex-shrink-0">
            <div className="flex justify-center mb-4">
              <Trophy className="text-yellow-500 w-24 h-24" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">測驗完成！</h2>
            <p className="text-gray-500 mb-2 font-medium">{playerName}，你的總分是</p>
            <div className="text-7xl font-black text-green-500 mb-6 drop-shadow-sm">{score}</div>
          </div>
          
          <div className="flex-1 overflow-y-auto mb-6 text-left border-t-2 border-dashed border-gray-200 pt-4 px-2">
            {mistakes.length === 0 ? (
              <div className="bg-green-100 text-green-800 p-4 rounded-xl text-center font-bold flex items-center justify-center gap-2">
                <CheckCircle2 /> 太厲害了！全部答對！
              </div>
            ) : (
              <div>
                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" /> 錯題回顧 ({mistakes.length}題)
                </h3>
                <div className="space-y-3">
                  {mistakes.map((m, idx) => (
                    <div key={idx} className="bg-red-50 p-3 rounded-xl border border-red-100 text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{m.question.image}</span>
                        <span className="font-bold text-gray-800">{m.question.rawQuestion}</span>
                      </div>
                      <div className="text-red-600 mb-1 font-medium">
                        <strong>你的答案：</strong> <span className="line-through opacity-80">{m.userAnswer}</span>
                      </div>
                      <div className="text-green-700 font-bold">
                        <strong>正確答案：</strong> {m.question.correctAnswer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-3 flex-shrink-0">
            <button 
              onClick={initGame}
              className="w-full bg-green-500 hover:bg-green-600 text-white text-lg font-bold py-4 px-8 rounded-2xl flex items-center justify-center gap-2 shadow"
            >
              <RefreshCw /> 繼續下一回合 (抽新題)
            </button>
            <div className="flex gap-3">
              <button 
                onClick={() => setGameState('start')}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-lg font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5"/> 主畫面
              </button>
              <button 
                onClick={() => setGameState('leaderboard')}
                className="flex-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-lg font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2"
              >
                <List className="w-5 h-5"/> 排行榜
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = currentRoundQuestions[currentQuestionIndex];
  if (!currentQ) return null;

  const playMainQuestion = () => {
    speakText(currentQ.playAllText, 0.85, currentQ.id);
    if (!isTimerRunning && timeLeft === TIME_LIMIT && !feedback) {
      setIsTimerRunning(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-50 p-4 font-sans">
      <div className="w-full max-w-md mb-4 flex justify-between items-center px-2">
        <div className="bg-white px-4 py-2 rounded-full font-bold text-gray-500 shadow-sm border border-gray-200 text-sm">
          第 {currentQuestionIndex + 1} / {QUESTIONS_PER_ROUND} 題
        </div>
        <div className="bg-yellow-50 px-4 py-2 rounded-full font-bold text-yellow-700 shadow-sm border border-yellow-200 flex items-center gap-1 text-sm">
          <Star className="w-4 h-4 text-yellow-500 fill-current" /> {score} 分
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-lg p-6 max-w-md w-full border-b-8 border-indigo-200 relative overflow-hidden">
        <div className="text-center mb-6">
          <p className="text-sm font-bold text-indigo-600 mb-4 bg-indigo-50 py-2 rounded-xl inline-block px-4 border border-indigo-100">
            {currentQ.instruction}
          </p>
          
          <div className="relative inline-block mt-2">
            <div className="text-8xl select-none bg-gray-50 rounded-3xl p-8 shadow-inner border-2 border-gray-100 flex items-center justify-center h-48 w-48 mx-auto">
              {currentQ.image}
            </div>
            
            <button 
              onClick={playMainQuestion}
              className={`absolute -bottom-5 -right-5 rounded-full p-4 text-white shadow-xl transition-all border-4 border-white ${isPlayingAudio ? 'bg-red-500 animate-pulse scale-110' : 'bg-indigo-500 hover:bg-indigo-600 hover:scale-105'}`}
            >
              <Volume2 className="w-8 h-8" />
            </button>

            <div className={`absolute -top-4 -right-4 rounded-full w-14 h-14 flex flex-col items-center justify-center font-black text-xl shadow-lg border-4 border-white transition-colors duration-300 ${isTimerRunning ? (timeLeft <= 5 ? 'bg-red-500 text-white animate-pulse' : 'bg-yellow-400 text-yellow-900') : 'bg-gray-200 text-gray-500'}`}>
              {timeLeft}
              <span className="text-[10px] -mt-1 opacity-80">sec</span>
            </div>
          </div>
          
          {currentQ.type === 'conversation' && (
             <div 
                className="mt-8 text-indigo-400 font-bold text-sm animate-pulse flex justify-center items-center gap-2 cursor-pointer" 
                onClick={playMainQuestion}
             >
                <Volume2 className="w-4 h-4" /> 點擊喇叭聽問題
             </div>
          )}
        </div>

        <div className="space-y-3 mt-6">
          {currentQ.options.map((option, index) => {
            let btnClass = "w-full text-left p-4 rounded-2xl text-lg font-bold border-2 transition-all flex items-center justify-between ";
            
            const isThisOptionCorrect = option.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();
            const isThisOptionSelected = selectedOption === option;

            if (feedback && isThisOptionCorrect) {
              btnClass += "bg-green-50 border-green-500 text-green-700 shadow-md"; 
            } else if (feedback && isThisOptionSelected && !isThisOptionCorrect) {
              btnClass += "bg-red-50 border-red-500 text-red-700 shadow-md"; 
            } else {
              btnClass += "bg-white border-gray-200 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow"; 
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                disabled={feedback !== null}
                className={btnClass}
              >
                <div className="flex items-center gap-4">
                  <span className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-black ${feedback && isThisOptionCorrect ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                </div>
                
                <div 
                  className={`p-2 rounded-full transition-colors ${feedback ? 'hidden' : 'text-indigo-300 hover:text-indigo-600 hover:bg-indigo-100'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    speakText(currentQ.playOptionTexts[index], 0.85, currentQ.id);
                  }}
                >
                  <Volume2 size={20} />
                </div>
              </button>
            );
          })}
        </div>

        {feedback && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-10 animate-in fade-in zoom-in duration-300">
            {feedback === 'correct' ? (
              <div className="text-center transform scale-110">
                <CheckCircle2 className="w-32 h-32 text-green-500 mx-auto mb-4 drop-shadow-md" />
                <h3 className="text-4xl font-black text-green-600 tracking-wider">答對了！</h3>
              </div>
            ) : (
              <div className="text-center transform scale-110">
                <XCircle className="w-32 h-32 text-red-500 mx-auto mb-4 drop-shadow-md" />
                <h3 className="text-4xl font-black text-red-600 tracking-wider">再接再厲！</h3>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}