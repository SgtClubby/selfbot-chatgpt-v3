const {
  addToContext,
  getContextByGuildId,
  getGuildSettingsByGuildId,
} = require("@mongo/mongo");
const { createChatCompletion } = require("@openai/createChatCompletion");
const { urlToBase64 } = require("@modules/utils");
const logger = require("@modules/Logger");

exports.run = async (client, message, args, level, guildId) => {
  const { context } = await getContextByGuildId(guildId);
  const { model, usesSystemMessage } = await getGuildSettingsByGuildId(guildId);

  let rawPrompt = args.join(" ");

  // **🔍 Detect Image URLs in the Prompt**
  const imageUrlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png)(\?[^\s]*)?)/gi;
  let imageUrls = rawPrompt.match(imageUrlRegex) || [];

  // **🛠 Remove Image URLs from Text Prompt**
  rawPrompt = rawPrompt.replace(imageUrlRegex, "").trim();

  // **🖼️ Detect Images Uploaded as Attachments**
  if (message.attachments.size > 0) {
    message.attachments.forEach((attachment) => {
      if (attachment.contentType?.startsWith("image/")) {
        imageUrls.push(attachment.url);
      }
    });
  }

  // **📌 Adjust Prompt for GPT-4 with System Message**
  let userPrompt =
    (model.startsWith("gpt-4") || model.startsWith("chatgpt-4")) &&
    usesSystemMessage
      ? `Requester: <@${message.author.id}> (@${message.author.username})\n\n${rawPrompt}`
      : rawPrompt;

  if (
    (model.startsWith("gpt-4") || model.startsWith("chatgpt-4")) &&
    usesSystemMessage
  ) {
    logger.log("Using extended system prompt for GPT-4", "debug");
    context.unshift({
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
    });
  }

  // **📝 Construct Message Object**
  let messageObject = {
    role: "user",
    content: [{ text: userPrompt, type: "text" }],
  };

  // **🖼️ Convert Images to Base64 and Add to Context**
  if (imageUrls.length > 0) {
    const imagePromises = imageUrls.map(async (url) => {
      try {
        const base64 = await urlToBase64(url); // Already formatted correctly
        return {
          type: "image_url",
          image_url: { url: base64, detail: "low" }, // ✅ Now correctly formatted, no double MIME type
        };
      } catch (err) {
        logger.log(`Failed to encode image: ${url}`, "error");
        return null;
      }
    });

    // **Wait for all images to be processed**
    const images = (await Promise.all(imagePromises)).filter(Boolean);
    messageObject.content.push(...images);
  }

  // **🔄 Update Context & Save to MongoDB**
  context.push(messageObject);
  await addToContext(guildId, messageObject);

  // **🚀 Send to OpenAI**
  createChatCompletion(message, context, model, guildId);
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["c"],
  permLevel: "User",
};

exports.help = {
  name: "chat",
  category: "ChatGPT",
  description: "Chat with the bot. The bot will respond to your prompt.",
  usage: "chat <prompt>",
};
