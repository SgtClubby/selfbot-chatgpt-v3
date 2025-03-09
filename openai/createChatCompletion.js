const { startTyping, stopTyping } = require("@modules/utils");
const { addToContext } = require("@mongo/mongo");
const openai = require("@openai/openai");
const logger = require("@modules/Logger");


async function createChatCompletion(message, context, model, guildId) {
  const mappedContext = context.map(({ content, role }) => ({ content, role }));

  startTyping(message);
  let lineTest = ""; // For debugging purposes
  try {
    const response = await openai.createChatCompletion(
      {
        model: model,
        messages: mappedContext,
        stream: true,
      },
      { responseType: "stream" }
    );

    // New variable to accumulate the entire response
    let completeResponse = "";

    // Variables for handling Discord message updates
    let responseContent = ""; // Content for the current Discord message
    let accumulatedContent = ""; // Buffer for new text before updating the message
    const discordCharacterLimit = 2000;
    const safetyBuffer = 100;
    let lastUpdateTime = Date.now();
    const updateInterval = 1000; // in milliseconds
    let jsonBuffer = ""; // For incomplete JSON chunks
    let insideCodeBlock = false;
    let insideBoldBlock = false;
    let insideItalicBlock = false;
    // Initial reply to indicate processing
    let reply = await message.channel.send("Processing...");

    // Process each streamed chunk
    for await (const chunk of response.data) {
      const lines = chunk
        .toString()
        .split("\n")
        .filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (line.trim() === "data: [DONE]") {
          logger.log(`Completed chat completion: ${guildId}`, "debug");
          // Process any leftover accumulated content before finishing
          if (accumulatedContent.length > 0) {
            if (
              responseContent.length + accumulatedContent.length >
              discordCharacterLimit - safetyBuffer
            ) {
              await reply.edit(responseContent);
              await message.channel.send(accumulatedContent);
            } else {
              responseContent += accumulatedContent;
              await reply.edit(responseContent);
            }
            accumulatedContent = "";
          }

          const messageObject = {
            role: "assistant",
            content: [{ text: completeResponse, type: "text" }],
          };
          addToContext(guildId, messageObject);
          stopTyping();
          return; // Exit the function after completion
        }

        lineTest = line;
        jsonBuffer += line.replace(/^data: /, "");

        try {
          const jsonResponse = JSON.parse(jsonBuffer);

          if (jsonResponse.choices[0].delta?.content) {
            const text = jsonResponse.choices[0].delta.content;

            // Append the new text to the complete response
            completeResponse += text;
            // Also update the accumulated content for Discord message editing
            accumulatedContent += text;

            // Handle code block boundaries
            const codeBlockBoundary = text.match(/```/g);
            if (codeBlockBoundary) {
              insideCodeBlock =
                codeBlockBoundary.length % 2 !== 0
                  ? !insideCodeBlock
                  : insideCodeBlock;
            }
            // Fixed: Use boldBlockBoundary instead of codeBlockBoundary
            const boldBlockBoundary = text.match(/\/\*\*\//g);
            if (boldBlockBoundary) {
              insideBoldBlock =
                boldBlockBoundary.length % 2 !== 0
                  ? !insideBoldBlock
                  : insideBoldBlock;
            }

            const italicBlockBoundary = text.match(/\/\*\*\//g);
            if (italicBlockBoundary) {
              insideItalicBlock =
                italicBlockBoundary.length % 2 !== 0
                  ? !insideItalicBlock
                  : insideItalicBlock;
            }

            const currentTime = Date.now();
            if (
              !insideCodeBlock &&
              !insideBoldBlock &&
              !insideItalicBlock &&
              (accumulatedContent.length >=
                discordCharacterLimit - safetyBuffer ||
                currentTime - lastUpdateTime >= updateInterval)
            ) {
              if (
                responseContent.length + accumulatedContent.length >
                discordCharacterLimit - safetyBuffer
              ) {
                // Send the current message and start a new one if limit is exceeded
                await reply.edit(responseContent);
                reply = await message.channel.send(accumulatedContent);
                responseContent = accumulatedContent;
              } else {
                responseContent += accumulatedContent;
                await reply.edit(responseContent);
              }
              accumulatedContent = ""; // Reset buffer
              lastUpdateTime = currentTime;
            }
          }
          jsonBuffer = ""; // Clear the buffer after successful parsing
        } catch (e) {
          // Likely an incomplete JSON chunk, so continue accumulating in jsonBuffer
        }
      }
    }

    // Final update for any remaining accumulated content (if the stream ends without [DONE])
    if (accumulatedContent.length > 0) {
      if (
        responseContent.length + accumulatedContent.length >
        discordCharacterLimit - safetyBuffer
      ) {
        await reply.edit(responseContent);
        await message.channel.send(accumulatedContent);
      } else {
        responseContent += accumulatedContent;
        await reply.edit(responseContent);
      }
    }

    // Save the complete response to the DB
    const messageObject = {
      role: "assistant",
      content: [{ text: completeResponse, type: "text" }],
    };
    addToContext(guildId, messageObject);
  } catch (error) {
    stopTyping();
    logger.log(error?.response?.data?.error?.message || error.message, "error");
    logger.log(lineTest, "error");
    message.channel.send("An error occurred: " + error.message);
  } finally {
    stopTyping();
  }
}

module.exports = { createChatCompletion };
