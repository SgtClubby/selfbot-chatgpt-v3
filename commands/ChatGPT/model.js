// selfbot-chatgpt-v3/commands/ChatGPT/model.js

const { availableModels } = require("@config/config");
const { getGuildSettingsByGuildId, setGuildSettingsByGuildId } = require("@mongo/mongo");
const { codeBlock } = require("@discordjs/formatters");

function formatModelList(models) {
  const formattedModels = {
    normal: [],
    reasoning: [],
  };

  models.forEach((model) => {
    if (model.startsWith("gpt-") || model.startsWith("chatgpt-")) {
      formattedModels.normal.push(model);
    } else if (/^o\d+/.test(model)) {
      formattedModels.reasoning.push(model);
    }
  });

  // use codeBlock to format the output, using asciidoc for better readability
  formattedModels.normal = formattedModels.normal.sort().map((model) => `* ${model}`);
  formattedModels.reasoning = formattedModels.reasoning.sort().map((model) => `* ${model}`);

  return codeBlock(
    "asciidoc",
    ["== Normal", ...formattedModels.normal, "", "== Reasoning", ...formattedModels.reasoning].join(
      "\n"
    )
  );
}

exports.run = async (client, message, args, level, guildId) => {
  const { model } = await getGuildSettingsByGuildId(guildId);
  if (!args[0]) return message.channel.send(`Current model: ${model}`);

  const validModels = await availableModels();

  if (args[0] === "default") {
    await setGuildSettingsByGuildId({ model: "gpt-4o" }, guildId);
    return message.channel.send(`Updated model to: ${model}`);
  }

  if (args[0] === "list") {
    return message.channel.send(formatModelList(validModels));
  }

  if (!validModels.includes(args[0])) {
    return message.channel.reply(
      `Invalid model!\n\n Available models:\n${formatModelList(validModels)}`
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
