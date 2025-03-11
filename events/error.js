const logger = require("../modules/Logger.js");
module.exports = async (client, error) => {
  logger.log(
    `An error event was sent by Discord.js: \n${client + error}`,
    "error"
  );
};
