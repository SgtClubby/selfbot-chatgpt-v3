const axios = require("axios");
const { setContextByGuildId } = require("@mongo/mongo");
const logger = require("@modules/Logger");
const { isValidLog } = require("@modules/utils");

exports.run = async (client, message, args, level, guildId) => {
  const attachment = message.attachments.first();
  if (!attachment) return message.channel.send("Please attach a log file.");

  const filename = attachment.name;
  if (!filename.endsWith(".txt"))
    return message.channel.send("Please attach a .txt file.");

  try {
    // Download the file from Discord's CDN
    const response = await axios.get(attachment.url, {
      responseType: "text",
    });
    let log;
    try {
      log = JSON.parse(response.data); // Assuming JSON content inside .txt
    } catch (e) {
      return message.channel.send("Failed to parse the log file.");
    }

    if (!isValidLog(log)) {
      return message.channel.send("Invalid log file format.");
    }

    log.guildId = guildId;
    await setContextByGuildId(guildId, log);
    return message.channel.send("Success, loaded context!");
  } catch (error) {
    console.log(error);
    return message.channel.send("Failed to download the log file.");
  }
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "User",
};

exports.help = {
  name: "load",
  category: "Context Management",
  description: "Load a context from a log file.",
  usage: "load <.txt>",
};
