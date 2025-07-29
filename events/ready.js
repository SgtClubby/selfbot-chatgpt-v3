const logger = require("../modules/Logger.js");
const { friendRequestPoll } = require("@modules/friendRequestHandler");
const { emotionHandler } = require("@modules/emotions/emotionHandler");

module.exports = async (client) => {
  logger.log(`Logged in as ${client.user.tag}!`, "ready");
  // emotionHandler(client);
  process.env.TOKEN == "METRIX" ? null : friendRequestPoll(client);
};
