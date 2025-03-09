const createImage = require("@openai/createImage");

exports.run = async (client, message, args, level, guildId) => {
  const number = isNaN(parseInt(args[0])) ? 1 : parseInt(args[0]);

  const prompt = isNaN(parseInt(args[0]))
    ? args.join(" ")
    : args.slice(1).join(" ");

  if (!prompt) {
    return message.channel.send("Please provide a prompt.");
  }
  if (number > 5) {
    return message.channel.send("You can only generate 5 images.");
  }
  return createImage(prompt, message, number);
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["imagine", "img", "i", "dalle"],
  permLevel: "User",
};

exports.help = {
  name: "image",
  category: "DALL-E",
  description: "Generate an image from a prompt.",
  usage: "image [num images] <prompt>",
};
