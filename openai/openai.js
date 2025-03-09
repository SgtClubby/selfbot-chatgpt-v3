const { Configuration, OpenAIApi } = require("openai");

// Init OpenAI API Config
const config = new Configuration({
  apiKey: process.env.OPENAI_APIKEY,
});
const openai = new OpenAIApi(config);

module.exports = openai;
