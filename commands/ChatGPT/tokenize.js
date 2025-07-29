const {
  getContextByGuildId,
  getGuildSettingsByGuildId,
} = require("@mongo/mongo");
const logger = require("@modules/Logger");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");


exports.run = async (client, message, args, level, guildId) => {
  const { context } = await getContextByGuildId(guildId);
  const { model, usesSystemMessage } = await getGuildSettingsByGuildId(guildId);

  // prepend the system message to the context if it exists
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
    context.unshift(systemMessage);
  }

  console.log(model)

  if (model != "gpt-4o") {
    logger.log("Cannot tokenize for other models, only GPT4 adjacent", "debug");
    return message.channel.send(
      "This command only works for GPT-4 and ChatGPT-4 models."
    );
  }

 try {
    const tokenCount = await countTokens(context);
    message.channel.send(
      `The current context is ${tokenCount} tokens.`
    );

  } catch (error) {
    logger.log(`Error counting tokens: ${error}`, "error");
    throw new Error(`Error counting tokens: ${error.message}`);
  }
};

const countTokens = async (context) => {
  return new Promise((resolve, reject) => {
    const tmpPath = path.join(os.tmpdir(), `context-${Date.now()}.json`);
    fs.writeFileSync(tmpPath, JSON.stringify(context), "utf-8");

    const pythonProcess = spawn("python3", ["/home/developement/selfbot-chatgpt-v3/modules/token/token.py", tmpPath]);

    let output = "";
    let error = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    pythonProcess.on("close", (code) => {
      fs.unlink(tmpPath, () => {}); // delete file afterward
      if (code === 0) {
        resolve(parseInt(output.trim()));
      } else {
        reject(new Error(`Python error: ${error || "Unknown error"}`));
      }
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
