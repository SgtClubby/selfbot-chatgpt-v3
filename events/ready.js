const logger = require("../modules/Logger.js");

module.exports = async (client) => {
  // Log that the bot is online.
  logger.log(`Logged in as ${client.user.tag}!`, "ready");

  // Make the bot "play the game" which is the help command with default prefix.
  client.user.setActivity(`Cold and calculating robot, at your service!`, {
    type: "WATCHING",
  });
};
