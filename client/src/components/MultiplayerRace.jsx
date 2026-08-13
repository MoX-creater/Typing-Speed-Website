import { useRef, useState, useEffect, useCallback } from 'react';
import {
  buildAccuracyByCharClass,
  buildAvgWpmOverTime,
  createEmptyCharClassStats,
  recordCharAttempt,
} from '../utils/typingTelemetry';

const WPM_SAMPLE_INTERVAL = 5;

/**
 * MultiplayerRace
 * ---------------
 * The typing component used during an active race.
 * Receives the server-chosen passage and reports progress/finish back
 * via the sendProgress / finishRace callbacks from useRoom.
 *
 * Props:
 *   passage        {string}   - the text everyone is typing
 *   socketId       {string}   - current player's socket id
 *   playerProgress {Array}    - live progress of all players
 *   sendProgress   {Function} - (progress, wpm) → void
 *   finishRace     {Function} - (wpm, accuracy) → void
 */
export default function MultiplayerRace({
  passage,
  socketId,
  playerProgress,
  sendProgress,
  finishRace,
}) {
  const words = passage.split(' ');
  const totalWords = words.length;

  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [currentCharIdx, setCurrentCharIdx] = useState(0);
  const [charStatuses, setCharStatuses]     = useState({});
  const [extraChars, setExtraChars]         = useState({});
  const [isFocused, setIsFocused]           = useState(false);
  const [done, setDone]                     = useState(false);
  const [liveWpm, setLiveWpm]               = useState(0);

  const areaRef       = useRef(null);
  const wordsRef      = useRef(null);
  const cursorRef     = useRef(null);
  const startTimeRef  = useRef(null);
  const statsRef      = useRef({ correct: 0, incorrect: 0 });
  const lastProgressRef = useRef(0);
  const charClassStatsRef = useRef(createEmptyCharClassStats());
  const wpmIntervalSamplesRef = useRef([]);
  const lastWpmIntervalSampleRef = useRef(-1);
  const marginRef     = useRef(0);
  const lastTopRef    = useRef(0);

  // Focus the typing area immediately when the race starts
  useEffect(() => {
    setTimeout(() => areaRef.current?.focus(), 100);
  }, []);

  // ── Cursor positioning (mirrors TypingTest logic) ─────────────────────────
  useEffect(() => {
    if (!areaRef.current || !cursorRef.current || !wordsRef.current) return;
    const activeLetter = wordsRef.current.querySelector('.cursor-active');
    if (!activeLetter) return;

    const top  = activeLetter.offsetTop;
    const left = activeLetter.offsetLeft;
    cursorRef.current.style.transform = `translate(${left}px, ${top}px)`;

    cursorRef.current.classList.remove('blink');
    void cursorRef.current.offsetWidth;
    cursorRef.current.classList.add('blink');

    if (top > lastTopRef.current + 20) {
      const visualTop = top + marginRef.current;
      if (visualTop > 120) {
        marginRef.current -= top - lastTopRef.current;
        wordsRef.current.style.transform = `translateY(${marginRef.current}px)`;
      }
      lastTopRef.current = top;
    } else if (top < lastTopRef.current - 20) {
      const visualTop = top + marginRef.current;
      if (visualTop < 0) {
        marginRef.current += lastTopRef.current - top;
        wordsRef.current.style.transform = `translateY(${marginRef.current}px)`;
      }
      lastTopRef.current = top;
    }
  }, [currentWordIdx, currentCharIdx]);

  // ── WPM / progress emitter (every 500 ms while typing) ───────────────────
  useEffect(() => {
    if (done) return;
    const interval = setInterval(() => {
      if (!startTimeRef.current) return;
      const mins = (Date.now() - startTimeRef.current) / 60000;
      const wpm  = mins > 0 ? Math.round(statsRef.current.correct / 5 / mins) : 0;
      setLiveWpm(wpm);

      const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (
        elapsedSec > 0 &&
        elapsedSec % WPM_SAMPLE_INTERVAL === 0 &&
        elapsedSec > lastWpmIntervalSampleRef.current
      ) {
        wpmIntervalSamplesRef.current.push({ second: elapsedSec, wpm });
        lastWpmIntervalSampleRef.current = elapsedSec;
      }

      // Progress = words fully passed / totalWords  (0–100)
      const progress = Math.round((currentWordIdx / totalWords) * 100);
      if (progress !== lastProgressRef.current) {
        lastProgressRef.current = progress;
        sendProgress(progress, wpm);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [done, currentWordIdx, totalWords, sendProgress]);

  // ── Keystroke handler ─────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (done) return;

    const key        = e.key;
    const isLetter   = key.length === 1 && key !== ' ';
    const isSpace    = key === ' ';
    const isBackspace = key === 'Backspace';

    if (!isLetter && !isSpace && !isBackspace) return;
    e.preventDefault();

    if (!startTimeRef.current && (isLetter || isSpace)) {
      startTimeRef.current = Date.now();
    }

    const currentWord = words[currentWordIdx] || '';
    let nextWordIdx  = currentWordIdx;
    let nextCharIdx  = currentCharIdx;
    let nextStatuses = { ...charStatuses };
    let nextExtras   = { ...extraChars };

    if (isLetter) {
      if (currentCharIdx < currentWord.length) {
        const expected = currentWord[currentCharIdx];
        const status   = key === expected ? 'correct' : 'incorrect';
        recordCharAttempt([], charClassStatsRef.current, {
          expected,
          typed: key,
          words,
          wordIdx: currentWordIdx,
          charIdx: currentCharIdx,
        });
        if (status === 'correct') statsRef.current.correct++;
        else statsRef.current.incorrect++;
        nextStatuses[`${currentWordIdx}-${currentCharIdx}`] = status;
      } else {
        recordCharAttempt([], charClassStatsRef.current, {
          expected: ' ',
          typed: key,
          words,
          wordIdx: currentWordIdx,
          charIdx: currentCharIdx,
        });
        const extras = nextExtras[currentWordIdx] || [];
        nextExtras[currentWordIdx] = [...extras, key];
        statsRef.current.incorrect++;
      }
      nextCharIdx += 1;
    }

    if (isSpace) {
      if (currentCharIdx === 0 && !currentWord.length) {
        // nothing to skip
      } else {
        // mark any untyped chars as incorrect
        for (let i = currentCharIdx; i < currentWord.length; i++) {
          if (!nextStatuses[`${currentWordIdx}-${i}`]) {
            recordCharAttempt([], charClassStatsRef.current, {
              expected: currentWord[i],
              typed: '',
              words,
              wordIdx: currentWordIdx,
              charIdx: i,
            });
            nextStatuses[`${currentWordIdx}-${i}`] = 'incorrect';
            statsRef.current.incorrect++;
          }
        }
        nextWordIdx += 1;
        nextCharIdx  = 0;

        // ── FINISH check ──────────────────────────────────────────────────
        if (nextWordIdx >= totalWords) {
          const elapsed   = (Date.now() - startTimeRef.current) / 60000;
          const total     = statsRef.current.correct + statsRef.current.incorrect;
          const finalWpm  = elapsed > 0 ? Math.round(statsRef.current.correct / 5 / elapsed) : 0;
          const finalAcc  = total > 0 ? Number(((statsRef.current.correct / total) * 100).toFixed(1)) : 100;

          if (finalWpm > 0) {
            wpmIntervalSamplesRef.current.push({
              second: Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000)),
              wpm: finalWpm,
            });
          }

          const racePerformance = {
            avgWpmOverTime: buildAvgWpmOverTime(wpmIntervalSamplesRef.current),
            accuracyByCharClass: buildAccuracyByCharClass(charClassStatsRef.current),
            finalWpm,
            finalAccuracy: finalAcc,
          };

          setDone(true);
          setCharStatuses(nextStatuses);
          setExtraChars(nextExtras);
          setCurrentWordIdx(nextWordIdx);
          setCurrentCharIdx(nextCharIdx);
          sendProgress(100, finalWpm);
          finishRace(finalWpm, finalAcc, racePerformance);
          return;
        }
      }
    }

    if (isBackspace) {
      const extras = nextExtras[currentWordIdx] || [];
      if (extras.length > 0) {
        nextExtras[currentWordIdx] = extras.slice(0, -1);
        nextCharIdx -= 1;
      } else if (currentCharIdx > 0) {
        const charKey    = `${currentWordIdx}-${currentCharIdx - 1}`;
        const wasCorrect = nextStatuses[charKey] === 'correct';
        if (wasCorrect) statsRef.current.correct = Math.max(0, statsRef.current.correct - 1);
        else statsRef.current.incorrect = Math.max(0, statsRef.current.incorrect - 1);
        delete nextStatuses[charKey];
        nextCharIdx -= 1;
      } else if (currentWordIdx > 0) {
        nextWordIdx -= 1;
        const prevWord   = words[nextWordIdx] || '';
        const prevExtras = nextExtras[nextWordIdx] || [];
        nextCharIdx = prevWord.length + prevExtras.length;
      }
    }

    setCharStatuses(nextStatuses);
    setExtraChars(nextExtras);
    setCurrentWordIdx(nextWordIdx);
    setCurrentCharIdx(nextCharIdx);
  }, [done, words, currentWordIdx, currentCharIdx, charStatuses, extraChars, totalWords, sendProgress, finishRace]);

  // ── Progress bars for all players ────────────────────────────────────────
  const myProgress = Math.round((currentWordIdx / totalWords) * 100);

  return (
    <div className="mp-race-layout">
      {/* Live WPM */}
      <div className="mp-race-stats">
        <span className="mp-race-stat-label">WPM</span>
        <span className="mp-race-stat-value">{done ? liveWpm : liveWpm || '—'}</span>
      </div>

      {/* Progress bars */}
      <div className="mp-progress-panel">
        {playerProgress.map((p) => (
          <div key={p.socketId} className="mp-progress-row">
            <span className={`mp-progress-name ${p.socketId === socketId ? 'mp-progress-name--me' : ''}`}>
              {p.username}
              {p.finished && <span className="mp-badge mp-badge--ready" style={{ marginLeft: 6 }}>✓</span>}
            </span>
            <div className="mp-progress-track">
              <div
                className={`mp-progress-fill ${p.finished ? 'mp-progress-fill--done' : ''}`}
                style={{ width: `${p.progress}%` }}
              />
              <span className="mp-progress-car">🏎</span>
            </div>
            <span className="mp-progress-wpm">{p.wpm} wpm</span>
          </div>
        ))}

        {/* Show yourself if not yet in playerProgress (first update hasn't fired) */}
        {!playerProgress.find((p) => p.socketId === socketId) && (
          <div className="mp-progress-row">
            <span className="mp-progress-name mp-progress-name--me">You</span>
            <div className="mp-progress-track">
              <div className="mp-progress-fill" style={{ width: `${myProgress}%` }} />
              <span className="mp-progress-car">🏎</span>
            </div>
            <span className="mp-progress-wpm">{liveWpm} wpm</span>
          </div>
        )}
      </div>

      {/* Typing area */}
      <div
        ref={areaRef}
        className={`raw-typing-area mp-typing-area ${!isFocused && !done ? 'blurred' : ''}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <div className="words-wrapper" ref={wordsRef}>
          <div id="cursor" ref={cursorRef} className="blink" />
          {words.map((word, wi) => {
            const isCurrent = wi === currentWordIdx;
            const isPast    = wi < currentWordIdx;
            return (
              <span key={wi} className={`word ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`}>
                {word.split('').map((char, ci) => {
                  const status       = charStatuses[`${wi}-${ci}`] || '';
                  const isCursorHere = isCurrent && ci === currentCharIdx;
                  return (
                    <span key={ci} className={`letter ${status} ${isCursorHere ? 'cursor-active' : ''}`}>
                      {char}
                    </span>
                  );
                })}
                {(extraChars[wi] || []).map((ch, ei) => (
                  <span key={`e-${ei}`} className="letter incorrect extra">{ch}</span>
                ))}
                {isCurrent && currentCharIdx >= word.length + (extraChars[wi]?.length || 0) && (
                  <span className="letter cursor-active">&#8203;</span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {done && !playerProgress.find(p => p.socketId === socketId && p.finished) && (
        <p className="mp-hint">Waiting for the other players to finish…</p>
      )}
    </div>
  );
}
