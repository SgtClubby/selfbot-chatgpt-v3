const logger = require("@modules/Logger");
module.exports = async (client, userId) => {
  try {
    logger.log(`Received friend request from user ID: ${userId}`, "log");

    // Accept the friend request
    await client.relationships.addFriend(userId);
    logger.log(`Accepted friend request from user ID: ${userId}`, "log");
  } catch (error) {
    logger.log(
      `Failed to accept friend request from user ID: ${userId}: ${error}`,
      "error"
    );
  }
};
