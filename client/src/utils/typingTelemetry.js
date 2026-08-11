const CHAR_CLASSES = ["letters", "numbers", "symbols"];

export function getCharClass(char) {
  if (!char) return "symbols";
  if (/[a-zA-Z]/.test(char)) return "letters";
  if (/[0-9]/.test(char)) return "numbers";
  return "symbols";
}

export function getPassagePosition(words, wordIdx, charIdx) {
  let position = 0;
  for (let i = 0; i < wordIdx; i++) {
    position += words[i].length + 1;
  }
  return position + charIdx;
}

export function createEmptyCharClassStats() {
  return {
    letters: { correct: 0, total: 0 },
    numbers: { correct: 0, total: 0 },
    symbols: { correct: 0, total: 0 },
  };
}

export function recordCharAttempt(stats, charClassStats, { expected, typed, words, wordIdx, charIdx }) {
  const charClass = getCharClass(expected);
  charClassStats[charClass].total += 1;

  const isCorrect = typed === expected;
  if (isCorrect) {
    charClassStats[charClass].correct += 1;
    return stats;
  }

  return [
    ...stats,
    {
      expected,
      typed: typed ?? "",
      position: getPassagePosition(words, wordIdx, charIdx),
      wordIdx,
      charIdx,
    },
  ];
}

export function buildErrorMap(mistypeEvents, passageText) {
  const errorMap = {};

  for (const event of mistypeEvents) {
    const { expected, position } = event;
    if (!expected) continue;

    errorMap[expected] = (errorMap[expected] || 0) + 1;

    const bigram = passageText.slice(position, position + 2);
    if (bigram.length === 2) {
      errorMap[bigram] = (errorMap[bigram] || 0) + 1;
    }

    const trigram = passageText.slice(position, position + 3);
    if (trigram.length === 3) {
      errorMap[trigram] = (errorMap[trigram] || 0) + 1;
    }
  }

  return errorMap;
}

export function buildAvgWpmOverTime(wpmSamples) {
  return wpmSamples.map((sample) => sample.wpm);
}

export function buildAccuracyByCharClass(charClassStats) {
  const accuracyByCharClass = {};

  for (const charClass of CHAR_CLASSES) {
    const { correct, total } = charClassStats[charClass];
    accuracyByCharClass[charClass] = {
      correct,
      total,
      accuracy: total > 0 ? Number(((correct / total) * 100).toFixed(1)) : 100,
    };
  }

  return accuracyByCharClass;
}

export function aggregateTypingTelemetry({
  mistypeEvents,
  wpmSamples,
  charClassStats,
  passageText,
}) {
  return {
    errorMap: buildErrorMap(mistypeEvents, passageText),
    avgWpmOverTime: buildAvgWpmOverTime(wpmSamples),
    accuracyByCharClass: buildAccuracyByCharClass(charClassStats),
  };
}
