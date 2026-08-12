const { DEFAULT_PASSAGE } = require("./validatePassageResponse");

const STOCK_PASSAGES = [
  DEFAULT_PASSAGE,
  "Practice keeps your fingers loose and your mind focused as you move through familiar rhythms of language finding comfort in steady repetition while each keystroke builds a little more confidence for the next line ahead",
  "Morning light spills across the desk while coffee cools beside the keyboard and quiet minutes become a chance to sharpen skill one word at a time without hurry or pressure",
];

function pickDefaultPassage(seed = "") {
  if (STOCK_PASSAGES.length === 0) {
    return DEFAULT_PASSAGE;
  }

  const index =
    String(seed)
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0) % STOCK_PASSAGES.length;

  return STOCK_PASSAGES[index];
}

module.exports = {
  STOCK_PASSAGES,
  pickDefaultPassage,
};
