import { useRef, useState, useCallback, useEffect } from "react";

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

export default function TypingTest({ user }) {
  const [duration, setDuration] = useState(30);
  const [gameState, setGameState] = useState("idle"); // idle | running | finished
  const [timeLeft, setTimeLeft] = useState(30);
  const [words, setWords] = useState([]);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [currentCharIdx, setCurrentCharIdx] = useState(0);
  const [charStatuses, setCharStatuses] = useState({});
  const [extraChars, setExtraChars] = useState({});
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [correctWords, setCorrectWords] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  const areaRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const statsRef = useRef({ correct: 0, incorrect: 0, correctWordCount: 0 });

  const generateWords = useCallback(() => {
    let allWords = [];
    while (allWords.length < 200) {
      const q = getRandomQuote();
      allWords = allWords.concat(q.split(" "));
    }
    return allWords.slice(0, 200);
  }, []);

  const initGame = useCallback(() => {
    clearInterval(timerRef.current);
    const w = generateWords();
    setWords(w);
    setCurrentWordIdx(0);
    setCurrentCharIdx(0);
    setCharStatuses({});
    setExtraChars({});
    setWpm(0);
    setAccuracy(100);
    setCorrectWords(0);
    setTimeLeft(duration);
    setGameState("idle");
    statsRef.current = { correct: 0, incorrect: 0, correctWordCount: 0 };
    startTimeRef.current = null;
    setTimeout(() => areaRef.current?.focus(), 50);
  }, [duration, generateWords]);

  useEffect(() => { initGame(); }, [initGame]);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  const endGame = useCallback(() => {
    clearInterval(timerRef.current);
    setGameState("finished");
    const { correct, incorrect, correctWordCount } = statsRef.current;
    const total = correct + incorrect;
    const acc = total > 0 ? ((correct / total) * 100).toFixed(1) : 0;
    const elapsed = (Date.now() - startTimeRef.current) / 60000;
    const finalWpm = elapsed > 0 ? (correctWordCount / elapsed).toFixed(1) : 0;
    setWpm(finalWpm);
    setAccuracy(acc);
    setCorrectWords(correctWordCount);

    // Save to localStorage for results page
    const results = {
      wpm: finalWpm, accuracy: acc, duration,
      correctWords: correctWordCount,
      totalWords: currentWordIdx,
      correctChars: correct, totalChars: total,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("typingResults", JSON.stringify(results));

    // Save to backend if logged in
    if (user && localStorage.getItem("token")) {
      import("../api.js").then(({ saveSession }) => {
        saveSession(results).catch(() => {});
      });
    }
  }, [user, duration, currentWordIdx]);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setGameState("running");
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const left = duration - elapsed;
      if (left <= 0) {
        setTimeLeft(0);
        endGame();
      } else {
        setTimeLeft(left);
        // Live WPM
        const mins = elapsed / 60;
        if (mins > 0) {
          setWpm((statsRef.current.correctWordCount / mins).toFixed(1));
        }
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

    setCurrentWordIdx((prevWordIdx) => {
      setCurrentCharIdx((prevCharIdx) => {
        setCharStatuses((prevStatuses) => {
          setExtraChars((prevExtra) => {
            const word = words[prevWordIdx];
            if (!word) return prevExtra;
            const wKey = prevWordIdx;

            if (isLetter) {
              if (prevCharIdx < word.length) {
                const expected = word[prevCharIdx];
                const status = key === expected ? "correct" : "incorrect";
                if (status === "correct") statsRef.current.correct++;
                else statsRef.current.incorrect++;

                const newStatuses = { ...prevStatuses, [`${wKey}-${prevCharIdx}`]: status };
                setCharStatuses(newStatuses);
              } else {
                const extras = prevExtra[wKey] || [];
                const newExtra = { ...prevExtra, [wKey]: [...extras, key] };
                statsRef.current.incorrect++;
                setExtraChars(newExtra);
              }
              setCurrentCharIdx(prevCharIdx + 1);
              return prevExtra;
            }

            if (isSpace && prevCharIdx > 0) {
              // Mark remaining letters as incorrect
              const newStatuses = { ...prevStatuses };
              for (let i = prevCharIdx; i < word.length; i++) {
                if (!newStatuses[`${wKey}-${i}`]) {
                  newStatuses[`${wKey}-${i}`] = "incorrect";
                  statsRef.current.incorrect++;
                }
              }
              // Check if word was fully correct
              let wordCorrect = true;
              for (let i = 0; i < word.length; i++) {
                if (newStatuses[`${wKey}-${i}`] !== "correct") { wordCorrect = false; break; }
              }
              if (wordCorrect && !(prevExtra[wKey]?.length)) {
                statsRef.current.correctWordCount++;
                setCorrectWords(statsRef.current.correctWordCount);
              }
              setCharStatuses(newStatuses);
              setCurrentWordIdx(prevWordIdx + 1);
              setCurrentCharIdx(0);
              return prevExtra;
            }

            if (isBackspace) {
              const extras = prevExtra[wKey] || [];
              if (extras.length > 0) {
                const newExtra = { ...prevExtra, [wKey]: extras.slice(0, -1) };
                setExtraChars(newExtra);
                setCurrentCharIdx(prevCharIdx - 1);
              } else if (prevCharIdx > 0) {
                const newStatuses = { ...prevStatuses };
                const wasCorrect = newStatuses[`${wKey}-${prevCharIdx - 1}`] === "correct";
                if (wasCorrect) statsRef.current.correct = Math.max(0, statsRef.current.correct - 1);
                else statsRef.current.incorrect = Math.max(0, statsRef.current.incorrect - 1);
                delete newStatuses[`${wKey}-${prevCharIdx - 1}`];
                setCharStatuses(newStatuses);
                setCurrentCharIdx(prevCharIdx - 1);
              } else if (prevWordIdx > 0) {
                setCurrentWordIdx(prevWordIdx - 1);
                const prevWord = words[prevWordIdx - 1];
                const prevExtras = prevExtra[prevWordIdx - 1] || [];
                setCurrentCharIdx(prevWord.length + prevExtras.length);
              }
              return prevExtra;
            }

            return prevExtra;
          });
          return prevStatuses;
        });
        return prevCharIdx;
      });
      return prevWordIdx;
    });

    // Live accuracy
    const { correct, incorrect } = statsRef.current;
    const total = correct + incorrect;
    if (total > 0) setAccuracy(((correct / total) * 100).toFixed(1));
  }, [gameState, words, startTimer, initGame]);

  const timerClass = timeLeft <= 5 ? "danger" : timeLeft <= 10 ? "warning" : "";

  // Determine visible word range for performance
  const visibleStart = Math.max(0, currentWordIdx - 10);
  const visibleEnd = Math.min(words.length, currentWordIdx + 60);

  return (
    <div className="page">
      <div className="container">
        <div className="typing-header">
          <h1>Type. Faster.</h1>
          <p>Test your typing speed and accuracy</p>
        </div>

        <div className="duration-selector">
          {[15, 30, 60, 120].map((d) => (
            <button key={d} className={`duration-btn ${duration === d ? "active" : ""}`}
              onClick={() => { setDuration(d); }}>
              {d}s
            </button>
          ))}
        </div>

        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-value">{gameState === "idle" ? "—" : wpm}</div>
            <div className="stat-label">WPM</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{gameState === "idle" ? "—" : `${accuracy}%`}</div>
            <div className="stat-label">Accuracy</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{gameState === "idle" ? "—" : correctWords}</div>
            <div className="stat-label">Words</div>
          </div>
        </div>

        <div className={`timer-display ${timerClass}`}>{timeLeft}</div>

        <div
          ref={areaRef}
          className={`typing-area glass-card ${!isFocused && gameState !== "finished" ? "blurred" : ""}`}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          {words.slice(visibleStart, visibleEnd).map((word, wi) => {
            const actualIdx = visibleStart + wi;
            const isCurrent = actualIdx === currentWordIdx;
            return (
              <span key={actualIdx} className={`word ${isCurrent ? "current" : ""}`}>
                {word.split("").map((char, ci) => {
                  const status = charStatuses[`${actualIdx}-${ci}`] || "";
                  const isCursorHere = isCurrent && ci === currentCharIdx;
                  return (
                    <span key={ci} className={`letter ${status} ${isCursorHere ? "current" : ""}`}>
                      {char}
                    </span>
                  );
                })}
                {(extraChars[actualIdx] || []).map((ch, ei) => (
                  <span key={`e-${ei}`} className="letter incorrect extra">{ch}</span>
                ))}
                {isCurrent && currentCharIdx >= word.length && !(extraChars[actualIdx]?.length) && (
                  <span className="letter current">&nbsp;</span>
                )}
              </span>
            );
          })}
        </div>

        <div className="typing-controls">
          <button className="btn btn-secondary" onClick={initGame}>
            ↻ Restart
          </button>
          {gameState === "finished" && (
            <button className="btn btn-primary" onClick={() => window.location.href = "/results"}>
              View Results →
            </button>
          )}
        </div>

        {gameState === "idle" && (
          <p style={{ textAlign: "center", marginTop: 20, color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Start typing to begin · Press <kbd style={{ padding: "2px 8px", background: "var(--bg-glass)", borderRadius: 4, border: "1px solid var(--border-glass)" }}>Tab</kbd> to restart
          </p>
        )}
      </div>
    </div>
  );
}
