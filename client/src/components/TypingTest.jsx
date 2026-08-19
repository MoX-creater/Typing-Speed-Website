import { useRef, useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  aggregateTypingTelemetry,
  createEmptyCharClassStats,
  recordCharAttempt,
} from "../utils/typingTelemetry";
import { generatePassage } from "../api";
import { getAuthToken } from "../../lib/authToken";
import { getRateLimitError } from "../utils/apiErrors";

const DURATION_OPTIONS = [15, 30, 60, 120];
const WPM_SAMPLE_INTERVAL = 5;

const QUOTES = [
  "The quick brown fox jumps over the lazy dog near the riverbank where wildflowers bloom in the golden light of a summer afternoon",
  "Programming is the art of telling another human being what one wants the computer to do in a language both can understand clearly",
  "Technology is best when it brings people together and empowers them to create things that were previously impossible to imagine",
  "Every great developer you know got there by solving problems they were unqualified to solve until they actually did it themselves",
  "The only way to learn a new programming language is by writing programs in it and making mistakes along the way forward",
  "In the middle of difficulty lies opportunity and those who embrace challenges find themselves growing stronger each day ahead",
  "Success is not final and failure is not fatal it is the courage to continue that counts in the journey of life and work",
  "The best error message is the one that never shows up because the developer anticipated every possible edge case beforehand",
  "Code is like humor when you have to explain it then it is probably not that good and needs to be rewritten from scratch",
  "Simplicity is the soul of efficiency and the mark of a truly great engineer who understands the value of clean design",
  "First solve the problem then write the code because understanding the problem is more than half the battle in software",
  "Any fool can write code that a computer can understand but good programmers write code that humans can understand easily",
  "The function of good software is to make the complex appear to be simple and the difficult appear to be effortless",
  "Experience is the name everyone gives to their mistakes but wisdom is learning from those mistakes and growing beyond them",
  "Debugging is twice as hard as writing the code in the first place so if you write the code as cleverly as possible then you are by definition not smart enough to debug it later",
];

function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

export default function TypingTest({ user, authReady = false }) {
  const [duration, setDuration] = useState(() => {
    const stored = localStorage.getItem("typingDuration");
    return stored ? Number(stored) : 15;
  });
  const [gameState, setGameState] = useState("idle"); // idle | running | finished
  const [timeLeft, setTimeLeft] = useState(duration);
  const [words, setWords] = useState([]);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [currentCharIdx, setCurrentCharIdx] = useState(0);
  const [charStatuses, setCharStatuses] = useState({});
  const [extraChars, setExtraChars] = useState({});
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [correctWords, setCorrectWords] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [aiTheme, setAiTheme] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [isGeneratingPassage, setIsGeneratingPassage] = useState(false);
  const [passageError, setPassageError] = useState("");

  const navigate = useNavigate();
  const areaRef = useRef(null);
  const samplesRef = useRef([]);
  const lastSampleSecondRef = useRef(-1);
  const mistypeEventsRef = useRef([]);
  const charClassStatsRef = useRef(createEmptyCharClassStats());
  const wpmIntervalSamplesRef = useRef([]);
  const lastWpmIntervalSampleRef = useRef(-1);
  const mode = "Classic";
  const language = "English";
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const statsRef = useRef({ correct: 0, incorrect: 0, correctWordCount: 0 });
  const wordsWrapperRef = useRef(null);
  const cursorRef = useRef(null);
  const marginRef = useRef(0);
  const lastTopRef = useRef(0);

  const buildWordList = useCallback((targetDuration, seedPassage = null) => {
    const targetCount = Math.max(200, Math.ceil(targetDuration * 2.5));
    let allWords = [];

    if (seedPassage) {
      const seedWords = seedPassage.trim().split(/\s+/).filter(Boolean);
      while (allWords.length < targetCount) {
        allWords = allWords.concat(seedWords);
      }
    } else {
      while (allWords.length < targetCount) {
        const q = getRandomQuote();
        allWords = allWords.concat(q.split(" "));
      }
    }

    return allWords.slice(0, targetCount);
  }, []);

  const resetGameWithWords = useCallback((wordList, activeDuration = duration) => {
    clearInterval(timerRef.current);
    setWords(wordList);
    setCurrentWordIdx(0);
    setCurrentCharIdx(0);
    setCharStatuses({});
    setExtraChars({});
    setWpm(0);
    setAccuracy(100);
    setCorrectWords(0);
    setTimeLeft(activeDuration);
    setGameState("idle");
    statsRef.current = { correct: 0, incorrect: 0, correctWordCount: 0 };
    startTimeRef.current = null;
    samplesRef.current = [];
    lastSampleSecondRef.current = -1;
    mistypeEventsRef.current = [];
    charClassStatsRef.current = createEmptyCharClassStats();
    wpmIntervalSamplesRef.current = [];
    lastWpmIntervalSampleRef.current = -1;
    marginRef.current = 0;
    lastTopRef.current = 0;
    if (wordsWrapperRef.current) wordsWrapperRef.current.style.transform = "translateY(0px)";
    setTimeout(() => areaRef.current?.focus(), 50);
  }, [duration]);

  const initGame = useCallback((overrideDuration = duration, seedPassage = null) => {
    const activeDuration = overrideDuration;
    resetGameWithWords(buildWordList(activeDuration, seedPassage), activeDuration);
  }, [duration, buildWordList, resetGameWithWords]);

  useEffect(() => { initGame(); }, [initGame]);

  const handleDurationSelect = useCallback((newDuration) => {
    localStorage.setItem("typingDuration", String(newDuration));
    setDuration(newDuration);
    initGame(newDuration);
  }, [initGame]);

  const handleGenerateAiPassage = useCallback(async () => {
    const currentUserId = user?.uid || user?._id || user?.id;
    if (!currentUserId || gameState === "running" || isGeneratingPassage) return;

    setIsGeneratingPassage(true);
    setPassageError("");

    try {
      const token = await getAuthToken();
      if (!token) {
        setPassageError("Session expired. Please sign in again.");
        return;
      }

      const { data } = await generatePassage({
        difficulty: aiDifficulty,
        theme: aiTheme.trim() || "everyday life",
        duration,
      });
      initGame(duration, data.text);
    } catch (err) {
      console.log("AI passage generation error :", err);
      setPassageError(
        getRateLimitError(err) ||
          err.response?.data?.error ||
          "Failed to generate passage"
      );
    } finally {
      setIsGeneratingPassage(false);
    }
  }, [user, gameState, isGeneratingPassage, aiDifficulty, aiTheme, duration, initGame]);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  const endGame = useCallback(() => {
    clearInterval(timerRef.current);
    setGameState("finished");
    const { correct, incorrect, correctWordCount } = statsRef.current;
    const total = correct + incorrect;
    const acc = total > 0 ? ((correct / total) * 100).toFixed(1) : 0;
    const elapsedMs = Math.max(Date.now() - startTimeRef.current, 0);
    const elapsedMinutes = elapsedMs / 60000;
    const finalWpm = elapsedMinutes > 0 ? (correctWordCount / elapsedMinutes).toFixed(1) : 0;
    const finalRawWpm = elapsedMinutes > 0 ? (((correct + incorrect) / 5) / elapsedMinutes).toFixed(1) : 0;
    const extraCharsCount = Object.values(extraChars).reduce((sum, extras) => sum + extras.length, 0);
    const currentWord = words[currentWordIdx] || "";
    const missedChars = Math.max(0, currentWord.length - currentCharIdx);

    setWpm(finalWpm);
    setAccuracy(acc);
    setCorrectWords(correctWordCount);

    if (Math.floor(elapsedMs / 1000) > lastSampleSecondRef.current) {
      const sampleSecond = Math.min(duration, Math.floor(elapsedMs / 1000));
      samplesRef.current.push({
        second: sampleSecond,
        wpm: Number(finalWpm),
        rawWpm: Number(finalRawWpm),
        errors: incorrect,
      });
      lastSampleSecondRef.current = sampleSecond;
    }

    if (
      Math.floor(elapsedMs / 1000) > lastWpmIntervalSampleRef.current &&
      Number(finalWpm) > 0
    ) {
      const intervalSecond = Math.min(duration, Math.floor(elapsedMs / 1000));
      wpmIntervalSamplesRef.current.push({
        second: intervalSecond,
        wpm: Number(finalWpm),
      });
      lastWpmIntervalSampleRef.current = intervalSecond;
    }

    const telemetry = aggregateTypingTelemetry({
      mistypeEvents: mistypeEventsRef.current,
      wpmSamples: wpmIntervalSamplesRef.current,
      charClassStats: charClassStatsRef.current,
      passageText: words.join(" "),
    });

    const results = {
      wpm: finalWpm,
      accuracy: acc,
      duration,
      correctWords: correctWordCount,
      totalWords: currentWordIdx,
      correctChars: correct,
      incorrectChars: Math.max(0, incorrect - extraCharsCount),
      extraChars: extraCharsCount,
      missedChars,
      rawWpm: finalRawWpm,
      testType: `${mode} • ${duration}s • ${language}`,
      mode,
      language,
      timestamp: new Date().toISOString(),
      samples: samplesRef.current,
      chars: `${correct}/${Math.max(0, incorrect - extraCharsCount)}/${extraCharsCount}/${missedChars}`,
      avgWpmOverTime: telemetry.avgWpmOverTime,
      accuracyByCharClass: telemetry.accuracyByCharClass,
      finalWpm: Number(finalWpm),
      finalAccuracy: Number(acc),
    };
    localStorage.setItem("typingResults", JSON.stringify(results));

    const currentUserId = user?.uid || user?._id || user?.id;
    if (currentUserId) {
      addDoc(collection(db, "sessions"), {
        userId: currentUserId,
        username: user?.displayName || user?.username || user?.email || "Anonymous",
        wpm: Number(finalWpm),
        accuracy: Number(acc),
        duration,
        createdAt: serverTimestamp(),
      }).catch(console.error);

      import("../api.js").then(({ saveTypingProfile }) => {
        saveTypingProfile({ userId: currentUserId, ...telemetry }).catch(console.error);
      });
    }

    navigate("/results");
  }, [user, duration, currentWordIdx, currentCharIdx, extraChars, words, navigate]);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    samplesRef.current = [];
    lastSampleSecondRef.current = -1;
    wpmIntervalSamplesRef.current = [];
    lastWpmIntervalSampleRef.current = -1;
    setGameState("running");
    timerRef.current = setInterval(() => {
      const elapsedMs = Date.now() - startTimeRef.current;
      const elapsed = Math.floor(elapsedMs / 1000);
      const left = duration - elapsed;
      const sampleSecond = Math.min(elapsed, duration);

      if (sampleSecond > lastSampleSecondRef.current) {
        const mins = elapsedMs / 60000;
        const actualWpm = mins > 0 ? Number((statsRef.current.correctWordCount / mins).toFixed(1)) : 0;
        const rawChars = statsRef.current.correct + statsRef.current.incorrect;
        const rawWpm = mins > 0 ? Number(((rawChars / 5) / mins).toFixed(1)) : 0;
        samplesRef.current.push({ second: sampleSecond, wpm: actualWpm, rawWpm, errors: statsRef.current.incorrect });
        lastSampleSecondRef.current = sampleSecond;
        if (
          (sampleSecond > 0 && sampleSecond % WPM_SAMPLE_INTERVAL === 0) ||
          left <= 0
        ) {
          if (sampleSecond > lastWpmIntervalSampleRef.current) {
            wpmIntervalSamplesRef.current.push({ second: sampleSecond, wpm: actualWpm });
            lastWpmIntervalSampleRef.current = sampleSecond;
          }
        }
        if (mins > 0) {
          setWpm(actualWpm.toFixed(1));
        }
      }

      if (left <= 0) {
        setTimeLeft(0);
        endGame();
      } else {
        setTimeLeft(left);
      }
    }, 200);
  }, [duration, endGame]);

  const handleKeyDown = useCallback((e) => {
    if (gameState === "finished") return;
    if (e.key === "Tab") { e.preventDefault(); initGame(); return; }

    const key = e.key;
    const isLetter = key.length === 1 && key !== " ";
    const isSpace = key === " ";
    const isBackspace = key === "Backspace";

    if (!isLetter && !isSpace && !isBackspace) return;
    e.preventDefault();

    if (gameState === "idle" && (isLetter || isSpace)) {
      startTimer();
    }

    const currentWord = words[currentWordIdx] || "";
    let nextWordIdx = currentWordIdx;
    let nextCharIdx = currentCharIdx;
    let nextStatuses = { ...charStatuses };
    let nextExtras = { ...extraChars };

    if (isLetter) {
      if (currentCharIdx < currentWord.length) {
        const expected = currentWord[currentCharIdx];
        const status = key === expected ? "correct" : "incorrect";
        mistypeEventsRef.current = recordCharAttempt(
          mistypeEventsRef.current,
          charClassStatsRef.current,
          {
            expected,
            typed: key,
            words,
            wordIdx: currentWordIdx,
            charIdx: currentCharIdx,
          }
        );
        if (status === "correct") statsRef.current.correct++;
        else statsRef.current.incorrect++;
        nextStatuses[`${currentWordIdx}-${currentCharIdx}`] = status;
      } else {
        mistypeEventsRef.current = recordCharAttempt(
          mistypeEventsRef.current,
          charClassStatsRef.current,
          {
            expected: " ",
            typed: key,
            words,
            wordIdx: currentWordIdx,
            charIdx: currentCharIdx,
          }
        );
        const extras = nextExtras[currentWordIdx] || [];
        nextExtras[currentWordIdx] = [...extras, key];
        statsRef.current.incorrect++;
      }
      nextCharIdx += 1;
    }

    if (isSpace) {
      if (currentCharIdx === 0 && !currentWord.length) {
        // Do not advance if there is no word to skip.
        nextWordIdx = currentWordIdx;
      } else {
        for (let i = currentCharIdx; i < currentWord.length; i++) {
          if (!nextStatuses[`${currentWordIdx}-${i}`]) {
            mistypeEventsRef.current = recordCharAttempt(
              mistypeEventsRef.current,
              charClassStatsRef.current,
              {
                expected: currentWord[i],
                typed: "",
                words,
                wordIdx: currentWordIdx,
                charIdx: i,
              }
            );
            nextStatuses[`${currentWordIdx}-${i}`] = "incorrect";
            statsRef.current.incorrect++;
          }
        }

        let wordCorrect = currentWord.length > 0;
        for (let i = 0; i < currentWord.length; i++) {
          if (nextStatuses[`${currentWordIdx}-${i}`] !== "correct") {
            wordCorrect = false;
            break;
          }
        }
        if (wordCorrect && !(nextExtras[currentWordIdx]?.length)) {
          statsRef.current.correctWordCount++;
          setCorrectWords(statsRef.current.correctWordCount);
        }

        nextWordIdx += 1;
        nextCharIdx = 0;
      }
    }

    if (isBackspace) {
      const extras = nextExtras[currentWordIdx] || [];
      if (extras.length > 0) {
        nextExtras[currentWordIdx] = extras.slice(0, -1);
        nextCharIdx -= 1;
      } else if (currentCharIdx > 0) {
        const charKey = `${currentWordIdx}-${currentCharIdx - 1}`;
        const wasCorrect = nextStatuses[charKey] === "correct";
        if (wasCorrect) statsRef.current.correct = Math.max(0, statsRef.current.correct - 1);
        else statsRef.current.incorrect = Math.max(0, statsRef.current.incorrect - 1);
        delete nextStatuses[charKey];
        nextCharIdx -= 1;
      } else if (currentWordIdx > 0) {
        nextWordIdx -= 1;
        const previousWord = words[currentWordIdx - 1] || "";
        const previousExtras = nextExtras[currentWordIdx - 1] || [];
        nextCharIdx = previousWord.length + previousExtras.length;
      }
    }

    setCharStatuses(nextStatuses);
    setExtraChars(nextExtras);
    setCurrentWordIdx(nextWordIdx);
    setCurrentCharIdx(nextCharIdx);

    const { correct, incorrect } = statsRef.current;
    const total = correct + incorrect;
    if (total > 0) setAccuracy(((correct / total) * 100).toFixed(1));
  }, [gameState, words, currentWordIdx, currentCharIdx, charStatuses, extraChars, startTimer, initGame]);

  const timerClass = timeLeft <= 5 ? "danger" : timeLeft <= 10 ? "warning" : "";

  useEffect(() => {
    if (!areaRef.current || !cursorRef.current || !wordsWrapperRef.current) return;
    const activeLetter = wordsWrapperRef.current.querySelector('.cursor-active');
    if (activeLetter) {
      const top = activeLetter.offsetTop;
      const left = activeLetter.offsetLeft;
      
      cursorRef.current.style.transform = `translate(${left}px, ${top}px)`;
      
      cursorRef.current.classList.remove('blink');
      void cursorRef.current.offsetWidth;
      cursorRef.current.classList.add('blink');

      if (top > lastTopRef.current + 20) {
        // Moved down a line
        const visualTop = top + marginRef.current;
        if (visualTop > 120) { // e.g. 3rd line
          const diff = top - lastTopRef.current;
          marginRef.current -= diff;
          wordsWrapperRef.current.style.transform = `translateY(${marginRef.current}px)`;
        }
        lastTopRef.current = top;
      } else if (top < lastTopRef.current - 20) {
        // Moved up a line (backspace)
        const visualTop = top + marginRef.current;
        if (visualTop < 0) {
          const diff = lastTopRef.current - top;
          marginRef.current += diff;
          wordsWrapperRef.current.style.transform = `translateY(${marginRef.current}px)`;
        }
        lastTopRef.current = top;
      }
    }
  }, [currentWordIdx, currentCharIdx, words]);

  return (
    <div className="page typing-page">
      <div className="typing-container">
        <div className="duration-selector">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option}
              className={`duration-btn ${duration === option ? "active" : ""}`}
              onClick={() => handleDurationSelect(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>

        {(user?.uid || user?._id || user?.id) && authReady && (
          <div className="ai-passage-controls">
            <input
              className="input-field"
              type="text"
              placeholder="Theme (e.g. ocean, coding)"
              value={aiTheme}
              onChange={(e) => setAiTheme(e.target.value)}
              disabled={isGeneratingPassage || gameState === "running"}
            />
            <select
              className="input-field"
              value={aiDifficulty}
              onChange={(e) => setAiDifficulty(e.target.value)}
              disabled={isGeneratingPassage || gameState === "running"}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={handleGenerateAiPassage}
              disabled={isGeneratingPassage || gameState === "running"}
            >
              {isGeneratingPassage ? "Generating..." : "AI Passage"}
            </button>
            {passageError && <span className="passage-error">{passageError}</span>}
          </div>
        )}

        <div className="top-stats-row">
          <div className="top-stat-group left-group">
            <div>
              <div className="top-stat-label">TIME LEFT</div>
              <div className="top-stat-value timer-val">
                {timeLeft < 10 ? `00:0${timeLeft}` : `00:${timeLeft}`}
              </div>
            </div>
          </div>
          <div className="top-stat-group right-group">
            <div className="stat-box stat-box--right">
              <div className="top-stat-label">WPM</div>
              <div className="top-stat-value">{gameState === "idle" ? "000" : wpm}</div>
            </div>
            <div className="stat-box stat-box--right">
              <div className="top-stat-label">ACCURACY</div>
              <div className="top-stat-value">{gameState === "idle" ? "100%" : `${accuracy}%`}</div>
            </div>
          </div>
        </div>

        <div
          ref={areaRef}
          className={`raw-typing-area ${!isFocused && gameState !== "finished" ? "blurred" : ""}`}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          <div className="words-wrapper" ref={wordsWrapperRef}>
            <div id="cursor" ref={cursorRef} className="blink"></div>
            {words.map((word, actualIdx) => {
              const isCurrent = actualIdx === currentWordIdx;
              const isPast = actualIdx < currentWordIdx;
              return (
                <span key={actualIdx} className={`word ${isCurrent ? "current" : ""} ${isPast ? "past" : ""}`}>
                  {word.split("").map((char, ci) => {
                    const status = charStatuses[`${actualIdx}-${ci}`] || "";
                    const isCursorHere = isCurrent && ci === currentCharIdx;
                    return (
                      <span key={ci} className={`letter ${status} ${isCursorHere ? "cursor-active" : ""}`}>
                        {char}
                      </span>
                    );
                  })}
                  {(extraChars[actualIdx] || []).map((ch, ei) => (
                    <span key={`e-${ei}`} className="letter incorrect extra">{ch}</span>
                  ))}
                  {isCurrent && currentCharIdx >= word.length + (extraChars[actualIdx]?.length || 0) && (
                    <span className="letter cursor-active">&#8203;</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>

        <div className="typing-footer-hint">
          <span className="key-hint">CTRL</span> + <span className="key-hint">R</span> TO RESTART TEST
        </div>
      </div>

      <div className="waves-bg"></div>

      <footer className="app-footer">
        <div className="footer-left">TYPE SPEED TEST</div>
        <div className="footer-right">
          <Link to="/privacy">PRIVACY</Link>
          <Link to="/about">CONTACT</Link>
        </div>
      </footer>
    </div>
  );
}
