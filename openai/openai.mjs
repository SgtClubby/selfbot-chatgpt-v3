// openai/openai.mjs
import OpenAI from "openai";

/**
 * OpenAI client instance configured with API key
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_APIKEY,
});

export default openai;
