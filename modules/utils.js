// selfbot-chatgpt-v3/modules/utils.js

const fs = require("fs");
const request = require("request");

let typingInterval;

/**
 * Starts typing indicator in a Discord channel
 *
 * @param {Object} message - Discord message object
 */
function startTyping(message) {
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }

  if (!message.channel) return;

  message.channel.sendTyping();
  typingInterval = setInterval(() => {
    message.channel.sendTyping();
  }, 1000);
}

/**
 * Stops typing indicator
 */
function stopTyping() {
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
}

let channelTypingInterval;

/**
 * Starts typing indicator in a specific channel
 *
 * @param {Object} channel - Discord channel object
 */
function startTypingChannel(channel) {
  if (channelTypingInterval) {
    clearInterval(channelTypingInterval);
    channelTypingInterval = null;
  }

  channel.sendTyping();
  channelTypingInterval = setInterval(() => {
    channel.sendTyping();
  }, 1000);
}

/**
 * Stops channel typing indicator
 */
function stopTypingChannel() {
  if (channelTypingInterval) {
    clearInterval(channelTypingInterval);
    channelTypingInterval = null;
  }
}

/**
 * Filters model list based on exclude terms and date patterns
 *
 * @param {Array} models - Array of model names
 * @param {Array} excludeTerms - Terms to exclude from models
 * @returns {Array} Filtered model array
 */
const filterModels = (models, excludeTerms = []) => {
  const datePattern = /\d{4}-\d{2}-\d{2}/;
  const gpt3datePattern = /\d{4}/;

  return models.filter(
    (model) =>
      !excludeTerms.some((term) => model.includes(term)) &&
      !datePattern.test(model) &&
      !gpt3datePattern.test(model)
  );
};

/**
 * Fetches available OpenAI models
 *
 * @returns {Promise<Array>} Array of available model names
 */
async function getAvailableModels() {
  try {
    const openai = await import("../openai/openai.mjs").then((m) => m.default);
    const response = await openai.models.list();

    const modelNames = response.data.map((model) => model.id);

    const excludeTerms = [
      "instruct",
      "preview",
      "whisper",
      "text-embedding",
      "omni",
      "tts",
      "gpt-image",
      "babbage",
      "codex",
      "dall-e",
      "davinci",
      "transcribe",
      "deep-research",
    ];

    const filteredModels = filterModels(modelNames, excludeTerms);
    filteredModels.sort((a, b) => a.localeCompare(b));

    // Add default model at the top
    filteredModels.unshift("gpt-4o");

    return filteredModels;
  } catch (error) {
    console.error("Error fetching available models:", error);
    return ["gpt-4o"]; // Fallback to default model
  }
}

/**
 * Determines which token to use based on environment
 *
 * @returns {string} Selected token
 */
function determineToken() {
  const tokenMap = {
    METRIX: process.env.TOKEN_METRIX,
    PSILOCIN: process.env.TOKEN_PSILOCIN,
    BOTTN: process.env.TOKEN_BOTTN,
  };

  return tokenMap[process.env.TOKEN];
}

/**
 * Determines bot mode based on current token
 *
 * @returns {string} Bot mode identifier
 */
function determineMode() {
  const tokenMap = {
    METRIX: process.env.TOKEN_METRIX,
    PSILOCIN: process.env.TOKEN_PSILOCIN,
    BOTTN: process.env.TOKEN_BOTTN,
  };

  return Object.keys(tokenMap).find((key) => tokenMap[key] === process.env.TOKEN);
}

/**
 * Determines which Discord.js library to use
 *
 * @returns {Object} Discord.js library
 */
function determineLibrary() {
  const userLibraries = {
    [process.env.TOKEN_PSILOCIN]: "discord.js-selfbot-v13",
    [process.env.TOKEN_BOTTN]: "discord.js-selfbot-v13",
    [process.env.TOKEN_METRIX]: "discord.js",
  };

  const libraryName = userLibraries[determineToken()];
  return require(libraryName);
}

/**
 * Validates log file structure
 *
 * @param {Object} log - Log object to validate
 * @returns {boolean} Whether log is valid
 */
function isValidLog(log) {
  if (typeof log !== "object" || log === null) return false;

  const requiredProps = [
    "_id",
    "guildId",
    "messages",
    "contextId",
    "active",
    "model",
    "usesSystemMessage",
  ];

  if (!requiredProps.every((prop) => prop in log)) return false;
  if (!Array.isArray(log.messages) || log.messages.length === 0) return false;

  // Validate each message structure
  for (const message of log.messages) {
    if (
      typeof message !== "object" ||
      !message.role ||
      !Array.isArray(message.content) ||
      !message._id
    ) {
      return false;
    }

    // Validate content structure
    for (const content of message.content) {
      if (typeof content !== "object" || content.type !== "text" || !content.text || !content._id) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Downloads file from URL to local path
 *
 * @param {string} uri - URL to download from
 * @param {string} filename - Local filename to save to
 * @param {Function} callback - Callback function
 */
function download(uri, filename, callback) {
  request.head(uri, (err, res, body) => {
    if (err) return callback(err);

    request(uri)
      .pipe(fs.createWriteStream(`/home/ftpuser/chatgpt/${filename}`))
      .on("close", callback)
      .on("error", callback);
  });
}

/**
 * Extracts image ID from Discord CDN URL
 *
 * @param {string} url - Image URL
 * @returns {string|null} Extracted image ID
 */
function extractImgID(url) {
  const regex = /\/([\w-]+\.png)\?/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Splits long messages into Discord-compatible chunks
 *
 * @param {string} message - Message to split
 * @returns {Array} Array of message chunks
 */
function splitMessage(message) {
  const words = message.split(/ +/);
  const messageArray = [];
  let messagePart = "";

  for (const word of words) {
    if (messagePart.length + word.length < 1900) {
      messagePart += word + " ";
    } else {
      messageArray.push(messagePart.trim());
      messagePart = word + " ";
    }
  }

  if (messagePart) {
    messageArray.push(messagePart.trim());
  }

  return messageArray;
}

/**
 * Generates random context ID
 *
 * @param {number} length - Length of ID to generate
 * @returns {string} Generated context ID
 */
function generateContextId(length = 12) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
}

/**
 * Validates command properties
 *
 * @param {Object} props - Command properties to validate
 * @param {string} fileName - Command file name for error reporting
 */
function hasValidProps(props, fileName) {
  if (!props.help || typeof props.help !== "object") {
    throw new Error(`Command "${fileName}" is missing a valid 'help' object.`);
  }

  if (!props.conf || typeof props.conf !== "object") {
    throw new Error(`Command "${fileName}" is missing a valid 'conf' object.`);
  }

  // Validate help properties
  const requiredHelpProps = ["name", "category", "description", "usage"];
  for (const prop of requiredHelpProps) {
    if (typeof props.help[prop] !== "string" || !props.help[prop].trim()) {
      throw new Error(`Command "${fileName}" has an invalid or missing 'help.${prop}' property.`);
    }
  }

  // Validate conf properties
  if (typeof props.conf.enabled !== "boolean") {
    throw new Error(`Command "${fileName}" has an invalid 'conf.enabled' (must be boolean).`);
  }

  if (typeof props.conf.guildOnly !== "boolean") {
    throw new Error(`Command "${fileName}" has an invalid 'conf.guildOnly' (must be boolean).`);
  }

  if (!Array.isArray(props.conf.aliases)) {
    throw new Error(`Command "${fileName}" has an invalid 'conf.aliases' (must be an array).`);
  }

  if (typeof props.conf.permLevel !== "string" || !props.conf.permLevel.trim()) {
    throw new Error(`Command "${fileName}" has an invalid or missing 'conf.permLevel' property.`);
  }
}

/**
 * Converts URL to base64 data URI
 *
 * @param {string} url - URL to convert
 * @returns {Promise<string>} Base64 data URI
 */
async function urlToBase64(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch image. Status: ${response.status}`);
    }

    const mimeType = response.headers.get("content-type");
    if (!mimeType || !mimeType.startsWith("image/")) {
      throw new Error(`Invalid MIME type: ${mimeType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64String = buffer.toString("base64");

    return `data:${mimeType};base64,${base64String}`;
  } catch (error) {
    console.error("Error converting URL to base64:", error);
    throw error;
  }
}

/**
 * Generates random number between min and max (inclusive)
 *
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number
 */
function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep utility function
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  startTyping,
  stopTyping,
  startTypingChannel,
  stopTypingChannel,
  download,
  extractImgID,
  splitMessage,
  generateContextId,
  isValidLog,
  hasValidProps,
  urlToBase64,
  determineToken,
  determineLibrary,
  randomNumber,
  sleep,
  determineMode,
  getAvailableModels,
};
