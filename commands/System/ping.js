exports.run = async (client, message, args, level) => { // eslint-disable-line no-unused-vars
    message.channel.send("Pong!")
  };
  
  exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: [],
    permLevel: "User",
  };
  
  exports.help = {
    name: "ping",
    category: "System",
    description: "Pings the bot",
    usage: "ping"
  };
  