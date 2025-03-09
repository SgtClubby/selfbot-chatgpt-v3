const { clearContextByGuildId } = require("@mongo/mongo");

exports.run = async (client, message, args, level, guildId) => {
  clearContextByGuildId(guildId);
  return message.channel.send("Cleared context!");
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "User",
};

exports.help = {
  name: "clear",
  category: "Context Management",
  description: "Clear the chat context.",
  usage: "clear",
};
