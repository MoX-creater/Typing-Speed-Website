const { GoogleGenerativeAI } = require("@google/generative-ai");

const MODEL_NAME = "gemini-3.1-flash-lite";

if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set — passage generation will be unavailable.");
}

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const model = genAI ? genAI.getGenerativeModel({ model: MODEL_NAME }) : null;

async function generateText(prompt) {
  if (!model) {
    throw new Error("Gemini API is not configured: GEMINI_API_KEY is missing");
  }

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    const wrapped = new Error(`Gemini API error: ${error.message}`);
    wrapped.cause = error;
    throw wrapped;
  }
}

async function generatePassage(prompt) {
  return generateText(prompt);
}

async function generateSummary(prompt) {
  return generateText(prompt);
}

module.exports = {
  generateText,
  generatePassage,
  generateSummary,
  MODEL_NAME,
};
