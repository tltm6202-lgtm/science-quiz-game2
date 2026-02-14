import { useState, useEffect, useCallback } from "react";
import { gradesData, type Question, type GradeData } from "./data/questions";
import { registerPlayer, addGameRecord, type PlayerRecord } from "./store/gameStore";
import { AdminLogin } from "./components/AdminLogin";
import { AdminDashboard } from "./components/AdminDashboard";

type Screen = "register" | "gradeSelect" | "quiz" | "winner" | "gameover" | "adminLogin" | "adminDashboard";

interface PlayerForm {
  name: string;
  phone: string;
  grade: string;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function Confetti() {
  const colors = ["#ff0", "#f0f", "#0ff", "#f00", "#0f0", "#00f", "#ff6600", "#ff69b4"];
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 8,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.left}%`,
            top: "-20px",
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "0",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export function App() {
  const [screen, setScreen] = useState<Screen>("register");
  const [playerForm, setPlayerForm] = useState<PlayerForm>({ name: "", phone: "", grade: "" });
  const [currentPlayer, setCurrentPlayer] = useState<PlayerRecord | null>(null);
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; grade?: string }>({});
  const [selectedGrade, setSelectedGrade] = useState<GradeData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const WINNING_SCORE = 30;

  // Timer
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timerActive, timeLeft]);

  const handleTimeout = useCallback(() => {
    if (showResult) return;
    setShowResult(true);
    setIsCorrect(false);
    setStreak(0);
    setAnsweredQuestions((prev) => prev + 1);
  }, [showResult]);

  const validateForm = (): boolean => {
    const errors: { name?: string; phone?: string; grade?: string } = {};
    if (!playerForm.name.trim()) errors.name = "يرجى إدخال الاسم";
    if (!playerForm.phone.trim()) errors.phone = "يرجى إدخال رقم التليفون";
    else if (!/^[0-9]{11}$/.test(playerForm.phone.trim())) errors.phone = "رقم التليفون يجب أن يكون 11 رقم";
    if (!playerForm.grade) errors.grade = "يرجى اختيار الصف الدراسي";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = () => {
    if (validateForm()) {
      const gradeLabel = gradesData.find(g => g.grade === playerForm.grade)?.label || playerForm.grade;
      const player = registerPlayer(playerForm.name.trim(), playerForm.phone.trim(), playerForm.grade, gradeLabel);
      setCurrentPlayer(player);
      setScreen("gradeSelect");
    }
  };

  const startQuiz = (grade: GradeData) => {
    setSelectedGrade(grade);
    const shuffled = shuffleArray(grade.questions);
    setQuestions(shuffled);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setAnsweredQuestions(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(30);
    setTimerActive(true);
    setScreen("quiz");
  };

  const saveGameResult = (finalScore: number, totalQ: number, bestSt: number, won: boolean) => {
    if (currentPlayer && selectedGrade) {
      addGameRecord(currentPlayer.id, {
        grade: selectedGrade.grade,
        gradeLabel: selectedGrade.label,
        score: finalScore,
        totalQuestions: totalQ,
        bestStreak: bestSt,
        won,
        playedAt: new Date().toISOString(),
        percentage: totalQ > 0 ? Math.round((finalScore / totalQ) * 100) : 0,
      });
    }
  };

  const handleAnswer = (answerIndex: number) => {
    if (showResult) return;
    setTimerActive(false);
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    const correct = answerIndex === questions[currentQuestion].correctAnswer;
    setIsCorrect(correct);
    setAnsweredQuestions((prev) => prev + 1);

    if (correct) {
      const newScore = score + 1;
      setScore(newScore);
      const newStreak = streak + 1;
      setStreak(newStreak);
      const newBest = Math.max(newStreak, bestStreak);
      setBestStreak(newBest);
      if (newScore >= WINNING_SCORE) {
        saveGameResult(newScore, answeredQuestions + 1, newBest, true);
        setTimeout(() => setScreen("winner"), 1500);
        return;
      }
    } else {
      setStreak(0);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion + 1 >= questions.length) {
      const won = score >= WINNING_SCORE;
      saveGameResult(score, answeredQuestions, bestStreak, won);
      setScreen(won ? "winner" : "gameover");
      return;
    }
    setCurrentQuestion((prev) => prev + 1);
    setSelectedAnswer(null);
    setShowResult(false);
    setIsCorrect(false);
    setTimeLeft(30);
    setTimerActive(true);
  };

  const restartGame = () => {
    if (selectedGrade) {
      startQuiz(selectedGrade);
    }
  };

  const goToGradeSelect = () => {
    setScreen("gradeSelect");
  };

  const getTimerColor = () => {
    if (timeLeft > 20) return "text-green-400";
    if (timeLeft > 10) return "text-yellow-400";
    return "text-red-400 animate-pulse";
  };

  const getTimerBg = () => {
    if (timeLeft > 20) return "bg-green-500";
    if (timeLeft > 10) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Admin Screens
  if (screen === "adminLogin") {
    return (
      <AdminLogin
        onLogin={() => setScreen("adminDashboard")}
        onBack={() => setScreen("register")}
      />
    );
  }

  if (screen === "adminDashboard") {
    return (
      <AdminDashboard
        onLogout={() => setScreen("register")}
      />
    );
  }

  // Register Screen
  if (screen === "register") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4" dir="rtl">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: "2s" }} />
        </div>

        <div className="relative w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-4 shadow-lg shadow-orange-500/30">
                <span className="text-4xl">🎮</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">لعبة العلوم</h1>
              <p className="text-purple-200 text-lg">كوّن شخصيتك وابدأ التحدي!</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">👤 الاسم الكامل</label>
                <input
                  type="text"
                  value={playerForm.name}
                  onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                  placeholder="أدخل اسمك هنا..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                />
                {formErrors.name && <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">📱 رقم التليفون</label>
                <input
                  type="tel"
                  value={playerForm.phone}
                  onChange={(e) => setPlayerForm({ ...playerForm, phone: e.target.value })}
                  placeholder="01xxxxxxxxx"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  dir="ltr"
                />
                {formErrors.phone && <p className="text-red-400 text-xs mt-1">{formErrors.phone}</p>}
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">🎓 الصف الدراسي</label>
                <select
                  value={playerForm.grade}
                  onChange={(e) => setPlayerForm({ ...playerForm, grade: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all appearance-none cursor-pointer"
                >
                  <option value="" className="bg-slate-800">اختر الصف...</option>
                  <option value="first" className="bg-slate-800">الصف الأول الإعدادي</option>
                  <option value="second" className="bg-slate-800">الصف الثاني الإعدادي</option>
                  <option value="third" className="bg-slate-800">الصف الثالث الإعدادي</option>
                </select>
                {formErrors.grade && <p className="text-red-400 text-xs mt-1">{formErrors.grade}</p>}
              </div>

              <button
                onClick={handleRegister}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-purple-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                🚀 ابدأ المغامرة
              </button>
            </div>

            <div className="flex items-center justify-between mt-6">
              <p className="text-purple-300/50 text-xs">المنهج المصري - الترم الأول</p>
              <button
                onClick={() => setScreen("adminLogin")}
                className="text-purple-400/50 hover:text-purple-300 transition-colors text-xs flex items-center gap-1"
              >
                🔐 لوحة التحكم
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grade Select Screen
  if (screen === "gradeSelect") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4" dir="rtl">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <div className="relative w-full max-w-lg">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              أهلاً بك يا <span className="text-yellow-400">{currentPlayer?.name}</span>! 👋
            </h2>
            <p className="text-purple-200">اختر الصف الدراسي لبدء التحدي</p>
            <p className="text-purple-300/60 text-sm mt-1">اجمع {WINNING_SCORE} نقطة لتفوز! 🏆</p>
          </div>

          <div className="space-y-4">
            {gradesData.map((grade) => (
              <button
                key={grade.grade}
                onClick={() => startQuiz(grade)}
                className="w-full group"
              >
                <div className={`bg-gradient-to-r ${grade.color} p-[2px] rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98]`}>
                  <div className="bg-slate-900/80 backdrop-blur rounded-2xl p-6 flex items-center gap-4">
                    <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-3xl">
                      {grade.icon}
                    </div>
                    <div className="text-right flex-1">
                      <h3 className="text-xl font-bold text-white group-hover:text-yellow-300 transition-colors">
                        {grade.label}
                      </h3>
                      <p className="text-purple-300 text-sm">علوم - الترم الأول • {grade.questions.length} سؤال</p>
                    </div>
                    <div className="text-white/50 group-hover:text-white transition-colors text-2xl">
                      ←
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setScreen("register")}
            className="mt-6 mx-auto block text-purple-400 hover:text-purple-300 transition-colors text-sm"
          >
            ← تغيير البيانات
          </button>
        </div>
      </div>
    );
  }

  // Quiz Screen
  if (screen === "quiz" && questions.length > 0) {
    const question = questions[currentQuestion];
    const progress = (score / WINNING_SCORE) * 100;
    const questionProgress = ((currentQuestion + 1) / questions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4" dir="rtl">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-sm font-bold text-slate-900">
                {currentPlayer?.name.charAt(0) || "?"}
              </div>
              <div>
                <p className="text-white font-medium text-sm">{currentPlayer?.name}</p>
                <p className="text-indigo-300 text-xs">{selectedGrade?.label}</p>
              </div>
            </div>
            <button
              onClick={goToGradeSelect}
              className="text-indigo-400 hover:text-white transition-colors text-sm px-3 py-1 rounded-lg border border-indigo-500/30 hover:border-indigo-400/50"
            >
              خروج ✕
            </button>
          </div>

          {/* Score & Stats Bar */}
          <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-yellow-400 text-2xl font-bold">{score}</p>
                  <p className="text-indigo-300 text-xs">النقاط</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-purple-400 text-2xl font-bold">{streak}🔥</p>
                  <p className="text-indigo-300 text-xs">متتالية</p>
                </div>
              </div>
              <div className={`text-center ${getTimerColor()}`}>
                <p className="text-2xl font-bold font-mono">{timeLeft}</p>
                <p className="text-indigo-300 text-xs">ثانية</p>
              </div>
            </div>

            {/* Progress to win */}
            <div className="relative">
              <div className="flex justify-between text-xs text-indigo-300 mb-1">
                <span>التقدم نحو الفوز</span>
                <span>{score}/{WINNING_SCORE} 🏆</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Timer Bar */}
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-6">
            <div
              className={`h-full ${getTimerBg()} rounded-full transition-all duration-1000 ease-linear`}
              style={{ width: `${(timeLeft / 30) * 100}%` }}
            />
          </div>

          {/* Question Card */}
          <div className="bg-white/5 backdrop-blur rounded-3xl border border-white/10 p-6 mb-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full">
                السؤال {currentQuestion + 1} من {questions.length}
              </span>
              <div className="h-1 flex-1 mx-4 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${questionProgress}%` }}
                />
              </div>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white leading-relaxed mb-8">
              {question.question}
            </h2>

            <div className="space-y-3">
              {question.options.map((option, index) => {
                let btnClass = "w-full p-4 rounded-xl border-2 text-right transition-all duration-300 flex items-center gap-3 ";

                if (showResult) {
                  if (index === question.correctAnswer) {
                    btnClass += "border-green-400 bg-green-500/20 text-green-300 shadow-lg shadow-green-500/10";
                  } else if (index === selectedAnswer && !isCorrect) {
                    btnClass += "border-red-400 bg-red-500/20 text-red-300 shadow-lg shadow-red-500/10";
                  } else {
                    btnClass += "border-white/5 bg-white/5 text-slate-500";
                  }
                } else {
                  btnClass += "border-white/10 bg-white/5 text-white hover:border-indigo-400 hover:bg-indigo-500/10 cursor-pointer transform hover:scale-[1.01] active:scale-[0.99]";
                }

                const letters = ["أ", "ب", "ج", "د"];

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    disabled={showResult}
                    className={btnClass}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      showResult && index === question.correctAnswer
                        ? "bg-green-500 text-white"
                        : showResult && index === selectedAnswer && !isCorrect
                        ? "bg-red-500 text-white"
                        : "bg-white/10 text-white/70"
                    }`}>
                      {letters[index]}
                    </span>
                    <span className="font-medium text-base">{option}</span>
                    {showResult && index === question.correctAnswer && (
                      <span className="mr-auto text-green-400 text-xl">✓</span>
                    )}
                    {showResult && index === selectedAnswer && !isCorrect && (
                      <span className="mr-auto text-red-400 text-xl">✗</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Result Feedback */}
          {showResult && (
            <div className={`rounded-2xl p-4 mb-6 text-center ${
              isCorrect
                ? "bg-green-500/10 border border-green-500/20"
                : "bg-red-500/10 border border-red-500/20"
            }`}>
              <p className={`text-xl font-bold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                {isCorrect ? "🎉 إجابة صحيحة! +1 نقطة" : timeLeft === 0 ? "⏰ انتهى الوقت!" : "❌ إجابة خاطئة!"}
              </p>
              {!isCorrect && (
                <p className="text-indigo-300 text-sm mt-1">
                  الإجابة الصحيحة: {question.options[question.correctAnswer]}
                </p>
              )}
              {isCorrect && streak > 1 && (
                <p className="text-yellow-400 text-sm mt-1">
                  🔥 {streak} إجابات متتالية صحيحة!
                </p>
              )}
            </div>
          )}

          {/* Next Button */}
          {showResult && score < WINNING_SCORE && (
            <button
              onClick={nextQuestion}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold text-lg rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {currentQuestion + 1 >= questions.length ? "عرض النتيجة" : "السؤال التالي ←"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Winner Screen
  if (screen === "winner") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4" dir="rtl">
        <Confetti />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <div className="relative text-center max-w-md">
          <div className="mb-6">
            <div className="text-8xl mb-4 animate-bounce">🏆</div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 mb-4">
              مبروك يا بطل!
            </h1>
            <div className="bg-white/10 backdrop-blur rounded-2xl border border-yellow-400/30 p-6 mb-6">
              <p className="text-yellow-300 text-xl font-bold mb-2">{currentPlayer?.name}</p>
              <p className="text-white text-lg mb-4">لقد حققت {WINNING_SCORE} نقطة وفزت! 🎉</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-yellow-400 text-2xl font-bold">{score}</p>
                  <p className="text-indigo-300 text-xs">النقاط</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-green-400 text-2xl font-bold">{answeredQuestions}</p>
                  <p className="text-indigo-300 text-xs">الأسئلة</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-orange-400 text-2xl font-bold">{bestStreak}🔥</p>
                  <p className="text-indigo-300 text-xs">أفضل متتالية</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={restartGame}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-slate-900 font-bold text-lg rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              🔄 العب مرة أخرى
            </button>
            <button
              onClick={goToGradeSelect}
              className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-lg rounded-xl border border-white/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              📚 اختر صف آخر
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game Over Screen
  if (screen === "gameover") {
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
        <div className="relative text-center max-w-md">
          <div className="mb-6">
            <div className="text-7xl mb-4">
              {percentage >= 70 ? "🌟" : percentage >= 50 ? "💪" : "📖"}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {percentage >= 70 ? "أداء رائع!" : percentage >= 50 ? "أداء جيد!" : "حاول مرة أخرى!"}
            </h1>
            <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/10 p-6 mb-6">
              <p className="text-indigo-300 text-lg mb-4">{currentPlayer?.name}</p>
              <p className="text-white text-lg mb-1">
                حصلت على <span className="text-yellow-400 font-bold text-2xl">{score}</span> من {questions.length}
              </p>
              <p className="text-indigo-400 text-sm mb-4">تحتاج {WINNING_SCORE} نقطة للفوز</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-yellow-400 text-2xl font-bold">{score}</p>
                  <p className="text-indigo-300 text-xs">النقاط</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-green-400 text-2xl font-bold">{percentage}%</p>
                  <p className="text-indigo-300 text-xs">النسبة</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-orange-400 text-2xl font-bold">{bestStreak}🔥</p>
                  <p className="text-indigo-300 text-xs">أفضل متتالية</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={restartGame}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold text-lg rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              🔄 حاول مرة أخرى
            </button>
            <button
              onClick={goToGradeSelect}
              className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-lg rounded-xl border border-white/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              📚 اختر صف آخر
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
