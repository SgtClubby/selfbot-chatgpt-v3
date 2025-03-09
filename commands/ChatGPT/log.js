const { getActiveCollectionByGuildId } = require("@mongo/mongo");
const fs = require("fs");
const path = require("path");

exports.run = async (client, message, args, level, guildId) => {
  message.channel.send("Generating file...");
  const log = await getActiveCollectionByGuildId(guildId);
  const logString = JSON.stringify(log, null, 2);

  const filename = path.join(__dirname, "log.txt"); // Save in the same directory
  fs.writeFileSync(filename, logString);

  await message.channel.send({ files: [filename] });

  // Delete the file after sending
  fs.unlinkSync(filename);
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["logs", "save"],
  permLevel: "User",
};

exports.help = {
  name: "log",
  category: "ChatGPT",
  description: "Generate a JSON log file of the current context.",
  usage: "log",
};
