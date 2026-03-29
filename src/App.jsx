import React, { useState, useEffect, useRef } from 'react';
import { Volume2, PlayCircle, Trophy, RefreshCw, Star, CheckCircle2, XCircle, Home, Upload, List, User, Download, HelpCircle } from 'lucide-react';

// ==========================================
// 1. 內建題庫 (精簡展示版，保留原邏輯)
// 這裡保留預設題庫，當作沒網路或是 API 尚未設定時的備用機制
// ==========================================
const RAW_QUESTIONS = [
  ['picture', '🍎', "What is it?", "It's a banana.", "It's an apple.", "It's a tomato.", 1],
  ['picture', '⬛', "What color is it?", "It's red.", "It's black.", "It's yellow.", 1],
  ['conversation', '💬', "Is it a window?", "Yes, it is.", "No, it is not.", "It is blue.", 1],
  ['picture', '🚪', "Is it a door?", "Yes, it is.", "No, it is not.", "It is an apple.", 0],
  ['picture', '🍌', "Is this a banana?", "Yes, it is.", "No, it is not.", "It is red.", 0],
  ['picture', '✏️', "Is this a pencil?", "It is an ant.", "Yes, it is.", "No, it is not.", 1],
  ['conversation', '🕒', "What time is it?", "It is a clock.", "It is three o'clock.", "It is time.", 1],
  ['conversation', '💬', "How old are you?", "I am seven years old.", "I am fine.", "Here.", 0],
  ['picture', '🤖', "How many robots?", "I am ten.", "Ten.", "It is a robot.", 1],
  ['conversation', '👩', "Who is she?", "She is my mother.", "He is my father.", "It is a girl.", 0]
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

// 音效引擎 (獨立抽離)
const playAudioTone = (audioCtx, frequency, type, duration) => {
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
  // --- 狀態管理 (State) ---
  const [gameState, setGameState] = useState('start'); 
  const [playerName, setPlayerName] = useState('');
  
  const [questionsPool, setQuestionsPool] = useState(DEFAULT_QUESTIONS);
  const [isLoading, setIsLoading] = useState(true); // 新增：讀取 Google Sheet API 的狀態
  const [currentRoundQuestions, setCurrentRoundQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null); 
  const [selectedOption, setSelectedOption] = useState(null);
  const [mistakes, setMistakes] = useState([]); 
  
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(true);
  const [voicesPool, setVoicesPool] = useState([]);
  
  const audioCtxRef = useRef(null);
  const QUESTIONS_PER_ROUND = 10;
  const TIME_LIMIT = 20;
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT); 
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // 初始化 TTS 與 題庫資料連線
  useEffect(() => {
    if (!('speechSynthesis' in window)) setTtsSupported(false);
    
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        let safeVoices = voices.filter(v => v.lang.startsWith('en') && v.localService === true);
        if (safeVoices.length === 0) safeVoices = voices.filter(v => v.lang.startsWith('en'));
        safeVoices = safeVoices.filter(v => !v.name.toLowerCase().includes('compact'));
        setVoicesPool(safeVoices);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    const savedName = localStorage.getItem('cept_last_player');
    if (savedName) setPlayerName(savedName);

    // --- 新增：從 Google Apps Script API 獲取最新題庫 ---
    // 👉 請將下方引號內的網址，替換為您部署 GAS 後取得的「網頁應用程式網址」
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxK-hwA1kSIQ2A44FYAdT0rs0ECkFicP4HtomGdRFaQE0kyOxZjyrrMUecFDFuETHZwjQ/exec"; 
    
    if (GAS_API_URL) {
      fetch(GAS_API_URL)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            const formatted = data.map((q, index) => ({
              id: index + 1,
              type: q.type,
              image: q.image,
              rawQuestion: q.rawQuestion,
              playAllText: q.type === 'picture' ? `Look at the picture. A. ${q.options[0]} B. ${q.options[1]} C. ${q.options[2]}` : `Listen carefully. ${q.rawQuestion}`,
              playOptionTexts: q.options,
              options: q.options,
              correctAnswer: q.correctAnswer,
              instruction: q.type === 'picture' ? '請看圖片，點擊喇叭聽選項，選出正確答案' : '請點擊喇叭聽問題，選出最適合的回應'
            }));
            setQuestionsPool(formatted);
          }
          setIsLoading(false);
        })
        .catch(err => {
          console.error("無法載入線上題庫，將使用內建預設題庫", err);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false); // 若未填寫 API 網址，直接結束讀取，採用預設題庫
    }
  }, []);

  // 計時器邏輯
  useEffect(() => {
    let timerId;
    if (isTimerRunning && timeLeft > 0) {
      timerId = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isTimerRunning && timeLeft === 0) {
      handleTimeUp();
    }
    return () => clearTimeout(timerId);
  }, [isTimerRunning, timeLeft, feedback]);

  const speakText = (text, rate = 0.6, seed = 0) => { 
    if (!ttsSupported) return;
    try {
      window.speechSynthesis.cancel(); 
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        if (voicesPool.length > 0) {
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          utterance.voice = isMobile ? voicesPool[0] : voicesPool[seed % voicesPool.length];
        } else {
          utterance.lang = 'en-US'; 
        }
        utterance.rate = 1.0; 
        utterance.onstart = () => setIsPlayingAudio(true);
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
      }, 50);
    } catch (e) { setIsPlayingAudio(false); }
  };

  const initGame = () => {
    if (!playerName.trim()) return alert("請先輸入闖關者姓名喔！");
    localStorage.setItem('cept_last_player', playerName);

    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      if (ttsSupported) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    } catch (e) {}

    // 隨機抽取題目
    const shuffled = [...questionsPool].sort(() => Math.random() - 0.5);
    const roundQuestions = shuffled.slice(0, Math.min(QUESTIONS_PER_ROUND, shuffled.length));

    setCurrentRoundQuestions(roundQuestions);
    setGameState('playing');
    setCurrentQuestionIndex(0);
    setScore(0);
    setFeedback(null);
    setSelectedOption(null);
    setMistakes([]); 
    setTimeLeft(TIME_LIMIT); 
    setIsTimerRunning(false); 
  };

  const handleTimeUp = () => {
    if (feedback) return; 
    stopAudio();
    setIsTimerRunning(false); 
    setFeedback('wrong');     
    playAudioTone(audioCtxRef.current, 300, 'sawtooth', 0.2); 
    
    setMistakes(prev => [...prev, { question: currentRoundQuestions[currentQuestionIndex], userAnswer: '未作答 (超時)' }]);
    moveToNextQuestion(false);
  };

  const handleAnswer = (option) => {
    if (feedback) return; 
    stopAudio();
    setIsTimerRunning(false); 
    setSelectedOption(option);

    const currentQuestion = currentRoundQuestions[currentQuestionIndex];
    const isCorrect = option.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
    
    if (isCorrect) {
      setScore(prev => prev + 10); 
      setFeedback('correct');
      playAudioTone(audioCtxRef.current, 523.25, 'sine', 0.1); 
      setTimeout(() => playAudioTone(audioCtxRef.current, 659.25, 'sine', 0.1), 100); 
    } else {
      setFeedback('wrong');
      playAudioTone(audioCtxRef.current, 300, 'sawtooth', 0.2);
      setMistakes(prev => [...prev, { question: currentQuestion, userAnswer: option }]);
    }
    moveToNextQuestion(isCorrect);
  };

  const moveToNextQuestion = (isCorrect) => {
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
  }

  const stopAudio = () => {
    if (ttsSupported) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    }
  }

  const finishGame = (finalScore) => {
    setGameState('result');
    [523, 659, 783, 1046].forEach((freq, i) => {
      setTimeout(() => playAudioTone(audioCtxRef.current, freq, 'square', 0.15), i * 150);
    });

    const history = JSON.parse(localStorage.getItem('cept_leaderboard')) || [];
    history.push({ name: playerName, score: finalScore, date: new Date().toLocaleDateString(), timestamp: Date.now() });
    localStorage.setItem('cept_leaderboard', JSON.stringify(history.sort((a, b) => b.score - a.score).slice(0, 10)));
    
    // (已移除原本的 Firebase 數據上傳邏輯，確保不再收集使用者紀錄)
  };

  // ==========================================
  // 畫面渲染區塊 (已模組化拆分)
  // ==========================================

  const renderStartScreen = () => (
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
          placeholder="請輸入你的名字"
          className="w-full pl-10 pr-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold text-gray-700 bg-indigo-50/30"
        />
      </div>
      
      <button 
        onClick={initGame} 
        disabled={!ttsSupported || isLoading} 
        className={`w-full text-white text-xl font-bold py-4 px-8 rounded-2xl transition-transform transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg mb-4 ${(!ttsSupported || isLoading) ? 'bg-gray-400' : 'bg-indigo-500 hover:bg-indigo-600'}`}
      >
        <PlayCircle className="w-6 h-6" /> 
        {isLoading ? '線上題庫同步中...' : `開始挑戰 (${QUESTIONS_PER_ROUND}題)`}
      </button>

      <button onClick={() => setGameState('leaderboard')} className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-lg font-bold py-3 px-8 rounded-2xl transition-transform transform hover:scale-105 flex items-center justify-center gap-3 shadow mb-8">
        <Trophy className="w-5 h-5" /> 查看英雄榜
      </button>
    </div>
  );

  const renderGameScreen = () => {
    const currentQ = currentRoundQuestions[currentQuestionIndex];
    if (!currentQ) return null;

    const playMainQuestion = () => {
      speakText(currentQ.playAllText, 0.6, currentQ.id);
      if (!isTimerRunning && timeLeft === TIME_LIMIT && !feedback) setIsTimerRunning(true);
    };

    return (
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-between items-center px-2">
          <div className="bg-white px-4 py-2 rounded-full font-bold text-gray-500 shadow-sm border border-gray-200 text-sm">
            第 {currentQuestionIndex + 1} / {currentRoundQuestions.length} 題
          </div>
          <div className="bg-yellow-50 px-4 py-2 rounded-full font-bold text-yellow-700 shadow-sm border border-yellow-200 flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 text-yellow-500 fill-current" /> {score} 分
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 w-full border-b-8 border-indigo-200 relative overflow-hidden">
          <div className="text-center mb-6">
            <p className="text-sm font-bold text-indigo-600 mb-4 bg-indigo-50 py-2 rounded-xl inline-block px-4 border border-indigo-100">
              {currentQ.instruction}
            </p>
            
            <div className="relative inline-block mt-2">
              <div className="text-8xl select-none bg-gray-50 rounded-3xl p-8 shadow-inner border-2 border-gray-100 flex items-center justify-center h-48 w-48 mx-auto">
                {currentQ.image}
              </div>
              <button onClick={playMainQuestion} className={`absolute -bottom-5 -right-5 rounded-full p-4 text-white shadow-xl transition-all border-4 border-white ${isPlayingAudio ? 'bg-red-500 animate-pulse scale-110' : 'bg-indigo-500 hover:bg-indigo-600 hover:scale-105'}`}>
                <Volume2 className="w-8 h-8" />
              </button>
              <div className={`absolute -top-4 -right-4 rounded-full w-14 h-14 flex flex-col items-center justify-center font-black text-xl shadow-lg border-4 border-white transition-colors duration-300 ${isTimerRunning ? (timeLeft <= 5 ? 'bg-red-500 text-white animate-pulse' : 'bg-yellow-400 text-yellow-900') : 'bg-gray-200 text-gray-500'}`}>
                {timeLeft} <span className="text-[10px] -mt-1 opacity-80">sec</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-6">
            {currentQ.options.map((option, index) => {
              const isCorrect = option.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();
              const isSelected = selectedOption === option;
              let btnClass = "w-full text-left p-4 rounded-2xl text-lg font-bold border-2 transition-all flex items-center justify-between ";
              if (feedback && isCorrect) btnClass += "bg-green-50 border-green-500 text-green-700 shadow-md"; 
              else if (feedback && isSelected && !isCorrect) btnClass += "bg-red-50 border-red-500 text-red-700 shadow-md"; 
              else btnClass += "bg-white border-gray-200 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow"; 

              return (
                <button key={index} onClick={() => handleAnswer(option)} disabled={feedback !== null} className={btnClass}>
                  <div className="flex items-center gap-4">
                    <span className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-black ${feedback && isCorrect ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                  </div>
                  <div className={`p-2 rounded-full transition-colors ${feedback ? 'hidden' : 'text-indigo-300 hover:text-indigo-600 hover:bg-indigo-100'}`} onClick={(e) => { e.stopPropagation(); speakText(currentQ.playOptionTexts[index], 0.6, currentQ.id); }}>
                    <Volume2 size={20} />
                  </div>
                </button>
              );
            })}
          </div>

          {feedback && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-10 animate-in fade-in zoom-in duration-300">
              <div className="text-center transform scale-110">
                {feedback === 'correct' ? <CheckCircle2 className="w-32 h-32 text-green-500 mx-auto mb-4 drop-shadow-md" /> : <XCircle className="w-32 h-32 text-red-500 mx-auto mb-4 drop-shadow-md" />}
                <h3 className={`text-4xl font-black tracking-wider ${feedback === 'correct' ? 'text-green-600' : 'text-red-600'}`}>
                  {feedback === 'correct' ? '答對了！' : '再接再厲！'}
                </h3>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderResultScreen = () => (
    <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border-4 border-green-200 flex flex-col max-h-[95vh]">
      <div className="flex-shrink-0">
        <Trophy className="text-yellow-500 w-24 h-24 mx-auto mb-4" />
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
            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><XCircle className="w-5 h-5 text-red-500" /> 錯題回顧</h3>
            <div className="space-y-3">
              {mistakes.map((m, idx) => (
                <div key={idx} className="bg-red-50 p-3 rounded-xl border border-red-100 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{m.question.image}</span>
                    <span className="font-bold text-gray-800">{m.question.rawQuestion}</span>
                  </div>
                  <div className="text-red-600 mb-1 font-medium"><strong>你的答案：</strong> <span className="line-through">{m.userAnswer}</span></div>
                  <div className="text-green-700 font-bold"><strong>正確答案：</strong> {m.question.correctAnswer}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-3 flex-shrink-0">
        <button onClick={initGame} className="w-full bg-green-500 hover:bg-green-600 text-white text-lg font-bold py-4 px-8 rounded-2xl flex items-center justify-center gap-2">
          <RefreshCw /> 繼續下一回合
        </button>
        <div className="flex gap-3">
          <button onClick={() => setGameState('start')} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-2xl flex justify-center items-center gap-2"><Home className="w-5 h-5"/> 主畫面</button>
          <button onClick={() => setGameState('leaderboard')} className="flex-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-bold py-3 px-4 rounded-2xl flex justify-center items-center gap-2"><List className="w-5 h-5"/> 排行榜</button>
        </div>
      </div>
    </div>
  );

  const renderLeaderboardScreen = () => {
    const ranks = JSON.parse(localStorage.getItem('cept_leaderboard')) || [];
    return (
      <div className="bg-white rounded-3xl shadow-xl p-6 max-w-md w-full border-4 border-yellow-300">
        <div className="flex items-center justify-center gap-3 mb-6 bg-yellow-100 py-3 rounded-2xl text-yellow-800">
          <Trophy className="w-8 h-8" /> <h2 className="text-2xl font-black">英雄排行榜</h2>
        </div>
        <div className="space-y-3 mb-8 max-h-80 overflow-y-auto">
          {ranks.length === 0 ? <p className="text-center text-gray-400 py-8">目前無人挑戰</p> : ranks.map((record, idx) => (
            <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-white ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-300' : idx === 2 ? 'bg-orange-300' : 'bg-indigo-200'}`}>{idx + 1}</span>
                <div><div className="font-bold text-gray-700">{record.name}</div><div className="text-xs text-gray-400">{record.date}</div></div>
              </div>
              <div className="font-black text-xl text-indigo-600">{record.score} 分</div>
            </div>
          ))}
        </div>
        <button onClick={() => setGameState('start')} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white text-lg font-bold py-3 px-8 rounded-2xl flex justify-center items-center gap-2"><Home className="w-5 h-5" /> 回到主畫面</button>
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen p-4 font-sans ${gameState === 'result' ? 'bg-green-50' : gameState === 'leaderboard' ? 'bg-yellow-50' : 'bg-indigo-50'}`}>
      {gameState === 'start' && renderStartScreen()}
      {gameState === 'playing' && renderGameScreen()}
      {gameState === 'result' && renderResultScreen()}
      {gameState === 'leaderboard' && renderLeaderboardScreen()}
    </div>
  );
}
