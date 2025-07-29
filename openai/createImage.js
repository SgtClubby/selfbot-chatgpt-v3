// selfbot-chatgpt-v3/openai/createImage.js

const { startTyping, stopTyping, download, extractImgID } = require("@modules/utils.js");
const logger = require("@modules/Logger");
async function createImage(prompt, message, number) {
  const openai = await import(".openai.mjs").then((m) => m.default);
  logger.log(`Image creation called with prompt: ${prompt}`, "debug");

  const imagePrompt = {
    prompt,
    n: number,
    size: "512x512",
    response_format: "url",
  };

  startTyping(message);
  try {
    const res = await openai.createImage(imagePrompt);

    for (const image of res.data.data) {
      let filename = extractImgID(image.url);
      if (!filename) {
        filename = `${new Date().getTime()}.png`;
      }

      // Wrap the download function in a promise so we can await it.
      await new Promise((resolve, reject) => {
        download(image.url, filename, (err) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });

      await message.channel.send({
        files: [{ attachment: `/home/ftpuser/chatgpt/${filename}` }],
      });
    }
  } catch (e) {
    console.error(e.response?.data?.error?.message || e.message);
    message.channel.send(`Error: ${e.response?.data?.error?.message || e.message}`);
  } finally {
    stopTyping();
  }
}

module.exports = createImage;
