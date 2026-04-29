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
  const wordsWrapperRef = useRef(null);
  const cursorRef = useRef(null);
  const marginRef = useRef(0);
  const lastTopRef = useRef(0);

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
    marginRef.current = 0;
    lastTopRef.current = 0;
    if (wordsWrapperRef.current) wordsWrapperRef.current.style.transform = 'translateY(0px)';
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
        saveSession(results).catch(() => { });
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

    const currentWord = words[currentWordIdx] || "";
    let nextWordIdx = currentWordIdx;
    let nextCharIdx = currentCharIdx;
    let nextStatuses = { ...charStatuses };
    let nextExtras = { ...extraChars };

    if (isLetter) {
      if (currentCharIdx < currentWord.length) {
        const expected = currentWord[currentCharIdx];
        const status = key === expected ? "correct" : "incorrect";
        if (status === "correct") statsRef.current.correct++;
        else statsRef.current.incorrect++;
        nextStatuses[`${currentWordIdx}-${currentCharIdx}`] = status;
      } else {
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
      
      cursorRef.current.style.top = `${top}px`;
      cursorRef.current.style.left = `${left}px`;

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
            <div className="stat-box" style={{ textAlign: "right" }}>
              <div className="top-stat-label">WPM</div>
              <div className="top-stat-value">{gameState === "idle" ? "000" : wpm}</div>
            </div>
            <div className="stat-box" style={{ textAlign: "right" }}>
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
            <div id="cursor" ref={cursorRef}></div>
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
          <span className="key-hint">TAB</span> + <span className="key-hint">ENTER</span> TO RESTART TEST
        </div>
      </div>

      <div className="waves-bg"></div>

      <footer className="app-footer">
        <div className="footer-left">© 2024 LUMINOUS VELOCITY</div>
        <div className="footer-right">
          <a href="#">KEYBOARD SHORTCUTS</a>
          <a href="#">PRIVACY</a>
          <a href="#">CONTACT</a>
        </div>
      </footer>
    </div>
  );
}
