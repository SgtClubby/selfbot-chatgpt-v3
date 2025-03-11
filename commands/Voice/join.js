const {
  joinVoiceChannelAndListen,
  voiceChatInteraction,
} = require("@modules/voice");

exports.run = async (client, message, args, level) => {
  if (process.env.USERTYPE != "BOT") {
    return message.reply(
      "This command is only available for real bots. Set USERTYPE to BOT in your .env file and provide a BOT token"
    );
  }

  const connection = await joinVoiceChannelAndListen(message);
  if (!connection) return;

  message.reply("Listening for your voice...");
  await voiceChatInteraction(connection, message.author.id);
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "User",
};

exports.help = {
  name: "voice",
  category: "Voice",
  description:
    "When you use this command, the bot hops into your voice channel to catch a brief bit of what you're saying, then responds vocally. It's inactive afterwards until the command is called again. Note: Due to limitations, this command is exclusively for true bot accounts, not selfbots.",
  usage: "join",
};
