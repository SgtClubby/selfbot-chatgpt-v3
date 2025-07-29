// selfbot-chatgpt-v3/openai/createChatCompletion.js

const { startTyping, stopTyping } = require("@modules/utils");
const { addToContext } = require("@mongo/mongo");
const logger = require("@modules/Logger");

/**
 * Creates a chat completion using OpenAI API with streaming support
 *
 * @param {Object} message - Discord message object
 * @param {Array} context - Conversation context array
 * @param {string} model - OpenAI model to use
 * @param {string} guildId - Discord guild ID
 */
async function createChatCompletion(message, context, model, guildId) {
  const openai = await import("./openai.mjs").then((m) => m.default);

  // Map context to proper format for OpenAI API
  const messages = context.map(({ content, role }) => ({ content, role }));

  startTyping(message);

  try {
    // Create chat completion with streaming
    const stream = await openai.chat.completions.create({
      model: model,
      messages: messages,
      stream: true,
    });

    let completeResponse = "";
    let currentMessage = await message.channel.send("Processing...");
    let currentContent = "";
    let accumulatedContent = "";

    const DISCORD_CHAR_LIMIT = 2000;
    const SAFETY_BUFFER = 100;
    const UPDATE_INTERVAL = 1000;

    let lastUpdateTime = Date.now();
    let insideCodeBlock = false;
    let insideBoldBlock = false;
    let insideItalicBlock = false;

    // Process each chunk from the stream
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;

      if (!content) continue;

      // Accumulate the complete response
      completeResponse += content;
      accumulatedContent += content;

      // Track formatting boundaries to avoid breaking Discord formatting
      const codeBlockMatches = content.match(/```/g);
      if (codeBlockMatches) {
        insideCodeBlock = codeBlockMatches.length % 2 !== 0 ? !insideCodeBlock : insideCodeBlock;
      }

      const boldMatches = content.match(/\*\*/g);
      if (boldMatches) {
        insideBoldBlock = boldMatches.length % 2 !== 0 ? !insideBoldBlock : insideBoldBlock;
      }

      const italicMatches = content.match(/\*/g);
      if (italicMatches) {
        insideItalicBlock = italicMatches.length % 2 !== 0 ? !insideItalicBlock : insideItalicBlock;
      }

      const currentTime = Date.now();
      const shouldUpdate =
        !insideCodeBlock &&
        !insideBoldBlock &&
        !insideItalicBlock &&
        (accumulatedContent.length >= DISCORD_CHAR_LIMIT - SAFETY_BUFFER ||
          currentTime - lastUpdateTime >= UPDATE_INTERVAL);

      if (shouldUpdate) {
        const newContentLength = currentContent.length + accumulatedContent.length;

        if (newContentLength > DISCORD_CHAR_LIMIT - SAFETY_BUFFER) {
          // Send current message and start a new one
          await currentMessage.edit(currentContent);
          currentMessage = await message.channel.send(accumulatedContent);
          currentContent = accumulatedContent;
        } else {
          currentContent += accumulatedContent;
          await currentMessage.edit(currentContent);
        }

        accumulatedContent = "";
        lastUpdateTime = currentTime;
      }
    }

    // Handle any remaining content
    if (accumulatedContent.length > 0) {
      const newContentLength = currentContent.length + accumulatedContent.length;

      if (newContentLength > DISCORD_CHAR_LIMIT - SAFETY_BUFFER) {
        await currentMessage.edit(currentContent);
        await message.channel.send(accumulatedContent);
      } else {
        currentContent += accumulatedContent;
        await currentMessage.edit(currentContent);
      }
    }

    // Save the complete response to context
    const messageObject = {
      role: "assistant",
      content: [{ text: completeResponse, type: "text" }],
    };

    await addToContext(guildId, messageObject);
    logger.log(`Completed chat completion for guild: ${guildId}`, "debug");
  } catch (error) {
    logger.log(error?.message || "Unknown error occurred", "error");
    await message.channel.send(`An error occurred: ${error?.message || "Unknown error"}`);
  } finally {
    stopTyping();
  }
}

module.exports = { createChatCompletion };
