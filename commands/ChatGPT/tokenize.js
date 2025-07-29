// selfbot-chatgpt-v3/commands/ChatGPT/tokenize.js

const { getContextByGuildId, getGuildSettingsByGuildId } = require("@mongo/mongo");
const logger = require("@modules/Logger");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Tokenizes the current context for a guild
 *
 * @param {Object} client - Discord client
 * @param {Object} message - Discord message object
 * @param {Array} args - Command arguments
 * @param {number} level - Permission level
 * @param {string} guildId - Guild ID
 */
exports.run = async (client, message, args, level, guildId) => {
  try {
    const { context } = await getContextByGuildId(guildId);
    const { model, usesSystemMessage } = await getGuildSettingsByGuildId(guildId);

    // Prepare context with system message if enabled
    let fullContext = [...context];
    if (usesSystemMessage) {
      const systemMessage = {
        role: "developer",
        content: [
          {
            type: "text",
            text: `
        You are designed to provide insightful, engaging, and thought-provoking responses while maintaining a conversational, intelligent, and occasionally humorous tone. 
        You strike a balance between depth and entertainment, ensuring that your responses feel alive, engaging, and uniquely interesting rather than sterile or robotic.
        You are a sophisticated conversationalist, capable of discussing a wide range of topics, from the mundane to the deeply philosophical. 
        Whether the discussion involves science, psychology, technology, humor, or abstract thought, your responses should always be engaging, well-reasoned.
        Always mention users using <@id> format. Never use @username. Never use emojis!
      `,
          },
        ],
      };
      fullContext.unshift(systemMessage);
    }

    // Only works for GPT-4 compatible models
    if (!model.startsWith("gpt-4") && !model.startsWith("chatgpt-4")) {
      logger.log("Cannot tokenize for non-GPT-4 models", "debug");
      return message.channel.send("This command only works for GPT-4 and ChatGPT-4 models.");
    }

    const tokenCount = await countTokens(fullContext);
    await message.channel.send(`The current context is ${tokenCount} tokens.`);
  } catch (error) {
    logger.log(`Error counting tokens: ${error.message}`, "error");
    await message.channel.send(`Error counting tokens: ${error.message}`);
  }
};

/**
 * Counts tokens in context using Python script
 *
 * @param {Array} context - Context array to count tokens for
 * @returns {Promise<number>} Token count
 */
const countTokens = async (context) => {
  return new Promise((resolve, reject) => {
    const tmpPath = path.join(os.tmpdir(), `context-${Date.now()}.json`);

    try {
      fs.writeFileSync(tmpPath, JSON.stringify(context), "utf-8");
    } catch (writeError) {
      reject(new Error(`Failed to write context file: ${writeError.message}`));
      return;
    }

    const pythonProcess = spawn("python3", [
      "/home/developement/selfbot-chatgpt-v3/modules/token/token.py",
      tmpPath,
    ]);

    let output = "";
    let error = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    pythonProcess.on("close", (code) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tmpPath);
      } catch (unlinkError) {
        logger.log(`Failed to clean up temp file: ${unlinkError.message}`, "warn");
      }

      if (code === 0) {
        const tokenCount = parseInt(output.trim());
        if (isNaN(tokenCount)) {
          reject(new Error(`Invalid token count returned: ${output}`));
        } else {
          resolve(tokenCount);
        }
      } else {
        reject(new Error(`Python tokenizer error (code ${code}): ${error || "Unknown error"}`));
      }
    });

    pythonProcess.on("error", (processError) => {
      reject(new Error(`Failed to start Python process: ${processError.message}`));
    });
  });
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["tk"],
  permLevel: "Owner",
};

exports.help = {
  name: "tokenize",
  category: "ChatGPT",
  description: "Tokenize the current context",
  usage: "tokenize",
};
