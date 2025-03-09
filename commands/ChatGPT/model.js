const { availableModels } = require("@config/config");
const {
  getGuildSettingsByGuildId,
  setGuildSettingsByGuildId,
} = require("@mongo/mongo");

exports.run = async (client, message, args, level, guildId) => {
  const { model } = await getGuildSettingsByGuildId(guildId);
  if (!args[0]) return message.channel.send(`Current model: ${model}`);

  if (args[0] === "default") {
    await setGuildSettingsByGuildId({ model: "gpt-4o" }, guildId);
    return message.channel.send(`Updated model to: ${model}`);
  }

  if (args[0] === "list")
    return message.channel.send(
      `Available models:\n${availableModels.join(",\n")}`
    );

  if (!availableModels.includes(args[0])) {
    return message.channel.send(
      `Invalid model. Available models:\n${availableModels.join(",\n")}`
    );
  }

  await setGuildSettingsByGuildId({ model: args[0] }, guildId);
  return message.channel.send(`Updated model to: ${args[0]}`);
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: "User",
};

exports.help = {
  name: "model",
  category: "ChatGPT",
  description: "View or change the active model.",
  usage: "model [model]",
};
