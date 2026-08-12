require("dotenv").config();
const { buildPassagePrompt } = require("./utils/buildPassagePrompt");
const { generatePassage } = require("./utils/geminiService");

async function testGemini() {
  const { prompt, targetWordCount } = buildPassagePrompt(
    { errorMap: { th: 3, ing: 2 } },
    "easy",
    "space exploration",
    15
  );

  console.log(`Target words: ${targetWordCount}`);
  console.log("Prompt preview:\n", prompt.slice(0, 200), "...\n");

  const text = await generatePassage(prompt);
  console.log(text);
}

testGemini().catch(console.error);
