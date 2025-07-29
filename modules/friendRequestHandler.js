async function acceptPendingFriendRequests(client) {
  try {
    client.relationships.incomingCache.each(async (user) => {
      try {
        await client.relationships.addFriend(user.id);
        logger.log(
          `Accepted offline friend request from user ID: ${user.id}`,
          "log"
        );
      } catch (error) {
        logger.log(
          `Failed to accept offline friend request from user ID: ${user.id}: ${error}`,
          "error"
        );
      }
    });
  } catch (error) {
    logger.log("Error polling friend requests: " + error, "error");
  }
}

function friendRequestPoll(client) {
  acceptPendingFriendRequests(client);

  // Run every 30 seconds (adjust as needed)
  setInterval(() => acceptPendingFriendRequests(client), 300000);
}

module.exports = {
  friendRequestPoll,
};
