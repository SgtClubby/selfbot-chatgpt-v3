// selfbot-chatgpt-v3/openai/createImage.js

const { startTyping, stopTyping, download, extractImgID } = require("@modules/utils");
const logger = require("@modules/Logger");

/**
 * Creates images using OpenAI DALL-E API
 *
 * @param {string} prompt - Image generation prompt
 * @param {Object} message - Discord message object
 * @param {number} number - Number of images to generate (1-5)
 */
async function createImage(prompt, message, number) {
  const openai = await import("./openai.mjs").then((m) => m.default);

  logger.log(`Image creation called with prompt: ${prompt}`, "debug");

  startTyping(message);

  try {
    // Create images with DALL-E
    const response = await openai.images.generate({
      prompt: prompt,
      n: number,
      size: "1024x1024", // Updated to use newer size option
      response_format: "url",
    });

    // Process each generated image
    for (const image of response.data) {
      let filename = extractImgID(image.url);

      if (!filename) {
        filename = `dalle_${Date.now()}.png`;
      }

      try {
        // Download and send the image
        await new Promise((resolve, reject) => {
          download(image.url, filename, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        await message.channel.send({
          files: [{ attachment: `/home/ftpuser/chatgpt/${filename}` }],
        });
      } catch (downloadError) {
        logger.log(`Failed to download/send image: ${downloadError.message}`, "error");
        await message.channel.send(`Failed to process image: ${downloadError.message}`);
      }
    }
  } catch (error) {
    const errorMessage = error?.error?.message || error?.message || "Unknown error occurred";
    logger.log(`Image generation error: ${errorMessage}`, "error");
    await message.channel.send(`Error generating image: ${errorMessage}`);
  } finally {
    stopTyping();
  }
}

module.exports = createImage;
