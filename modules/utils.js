const fs = require("fs");
const request = require("request");

let interval;
function startTyping(message) {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  if (!message.channel) return;
  message.channel.sendTyping();
  interval = setInterval(() => {
    message.channel.sendTyping();
  }, 1000);
}

function isValidLog(log) {
  // Ensure log is an object
  if (typeof log !== "object" || log === null) return false;

  // Required top-level properties
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

  // Ensure messages is an array with at least one item
  if (!Array.isArray(log.messages) || log.messages.length === 0) return false;

  // Validate each message in the messages array
  for (const message of log.messages) {
    if (
      typeof message !== "object" ||
      !message.role ||
      !Array.isArray(message.content) ||
      !message._id
    ) {
      return false;
    }

    // Validate content inside each message
    for (const content of message.content) {
      if (
        typeof content !== "object" ||
        content.type !== "text" ||
        !content.text ||
        !content._id
      ) {
        return false;
      }
    }
  }

  return true;
}

let chaInterval;
function startTypingChannel(channel) {
  if (chaInterval) {
    clearInterval(chaInterval);
    chaInterval = null;
  }
  channel.sendTyping();
  chaInterval = setInterval(() => {
    channel.sendTyping();
  }, 1000);
}

// Stop typing indicator
function stopTypingChannel() {
  clearInterval(chaInterval);
}

function stopTyping() {
  clearInterval(interval);
}

function download(uri, filename, callback) {
  request.head(uri, function (err, res, body) {
    request(uri)
      .pipe(fs.createWriteStream(`/home/ftpuser/chatgpt/${filename}`))
      .on("close", callback);
  });
}

// Extract image ID from URL
function extractImgID(string) {
  const regex = /\/([\w-]+\.png)\?/;
  const found = string.match(regex);

  if (found) {
    return found[1];
  }

  return null;
}

function splitMessage(message) {
  const words = message.split(/ +/);
  const messageArray = [];
  let messagePart = "";

  for (const word of words) {
    if (messagePart.length + word.length < 1900) {
      messagePart += word + " ";
    } else {
      messageArray.push(messagePart.trim());
      messagePart = word + " "; // Start new part with the current word
    }
  }

  if (messagePart) {
    messageArray.push(messagePart.trim());
  }

  return messageArray;
}

function generateContextId(length = 12) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function hasValidProps(props, fileName) {
  if (!props.help || typeof props.help !== "object") {
    throw new Error(`Command "${fileName}" is missing a valid 'help' object.`);
  }
  if (!props.conf || typeof props.conf !== "object") {
    throw new Error(`Command "${fileName}" is missing a valid 'conf' object.`);
  }

  // Validate `help` properties
  const requiredHelpProps = ["name", "category", "description", "usage"];
  for (const prop of requiredHelpProps) {
    if (typeof props.help[prop] !== "string" || !props.help[prop].trim()) {
      throw new Error(
        `Command "${fileName}" has an invalid or missing 'help.${prop}' property.`
      );
    }
  }

  // Validate `conf` properties
  if (typeof props.conf.enabled !== "boolean") {
    throw new Error(
      `Command "${fileName}" has an invalid 'conf.enabled' (must be boolean).`
    );
  }
  if (typeof props.conf.guildOnly !== "boolean") {
    throw new Error(
      `Command "${fileName}" has an invalid 'conf.guildOnly' (must be boolean).`
    );
  }
  if (!Array.isArray(props.conf.aliases)) {
    throw new Error(
      `Command "${fileName}" has an invalid 'conf.aliases' (must be an array).`
    );
  }
  if (
    typeof props.conf.permLevel !== "string" ||
    !props.conf.permLevel.trim()
  ) {
    throw new Error(
      `Command "${fileName}" has an invalid or missing 'conf.permLevel' property.`
    );
  }
}

async function urlToBase64(url) {
  try {
    // Fetch the image from the URL
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch the image. Status: ${response.status}`);
    }

    // Get the correct MIME type from headers
    const mimeType = response.headers.get("content-type");
    if (!mimeType || !mimeType.startsWith("image/")) {
      throw new Error(`Invalid MIME type: ${mimeType}`);
    }

    // Read response as array buffer and convert to Node.js buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert buffer to Base64
    const base64String = buffer.toString("base64");

    // Construct the correct Base64 format with MIME type
    return `data:${mimeType};base64,${base64String}`;
  } catch (error) {
    console.error("Error fetching or encoding the URL:", error);
    throw error;
  }
}

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
};
