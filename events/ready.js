const logger = require("../modules/Logger.js");

// Global variables to hold the current mouth and the emotion text.
let currentMouth = "_"; // default mouth
let currentEmotionText = "I am feeling neutral."; // default emotion text
let eyesClosedDuration = 1000;
let eyesOpenDuration = 30_000;
let emotionUpdateInterval = 1_800_000;

// Returns a random integer between min and max (inclusive).
function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Mapping each feeling to a creative Unicode mouth character and a suffix.
const feelingAttributes = {
  happy: { mouth: "◡", suffix: "!" },
  sad: { mouth: "︵", suffix: "." },
  angry: { mouth: "ʖ̯", suffix: "!!" },
  excited: { mouth: "O", suffix: "!!!" },
  nervous: { mouth: "ʘ", suffix: "?" },
  relaxed: { mouth: "‿", suffix: "." },
  bored: { mouth: "—", suffix: "..." },
  anxious: { mouth: "Ø", suffix: "?" },
  frustrated: { mouth: "┐", suffix: "!" },
  confident: { mouth: "⌣", suffix: "!" },
  tired: { mouth: "_", suffix: "..." },
  curious: { mouth: "ʖ", suffix: "?" },
  hopeful: { mouth: "⊙", suffix: "!" },
  lonely: { mouth: "•", suffix: "..." },
  grateful: { mouth: "◕", suffix: "!" },
};

// Returns a random emotion sentence, e.g., "I am feeling happy!"
function randomFeeling() {
  const expressions = [
    "I'm feeling",
    "I am",
    "I feel",
    "I am feeling",
    "I'm",
    "Feeling",
  ];
  // Use the keys of our mapping as the possible feelings.
  const feelings = Object.keys(feelingAttributes);
  const expression = expressions[randomNumber(0, expressions.length - 1)];
  const feeling = feelings[randomNumber(0, feelings.length - 1)];
  const suffix = feelingAttributes[feeling].suffix;
  return { text: `${expression} ${feeling}${suffix}`, feeling };
}

// Updates the bot's emotion (both the mouth and the appended text) every 2 minutes.
async function updateEmotion(client) {
  const emotionData = randomFeeling();
  currentMouth = feelingAttributes[emotionData.feeling].mouth || "_";
  currentEmotionText = emotionData.text;
}

// Handles the continuous blink routine.
// It displays the face with the appended emotion text. The eyes alternate between open and closed.
async function blink(client) {
  // Blink: eyes closed.
  await client.user.setActivity(
    `( ͡- ${currentMouth} ͡-) ${currentEmotionText}`,
    { type: "CUSTOM" }
  );
  await sleep(eyesClosedDuration);
  await client.user.setActivity(
    `( ͡👁️${currentMouth} ͡👁️) ${currentEmotionText}`,
    { type: "CUSTOM" }
  );
}

// Cursed blink, unsynced blink, so one eye closes and then the other, and then the other open and then the other.
async function cursedBlink(client) {
  // Blink: one eye closes.
  await client.user.setActivity(
    `( ͡- ${currentMouth} ͡👁️) ${currentEmotionText}`,
    { type: "CUSTOM" }
  );
  await sleep(eyesClosedDuration);
  // Blink: the other eye closes.
  await client.user.setActivity(
    `( ͡👁️${currentMouth} ͡-) ${currentEmotionText}`,
    { type: "CUSTOM" }
  );
  await sleep(eyesClosedDuration);
  // Eyes open version.
  await client.user.setActivity(
    `( ͡👁️${currentMouth} ͡👁️) ${currentEmotionText}`,
    { type: "CUSTOM" }
  );
}

async function randomBlink(client) {
  while (true) {
    const rng = Math.random();
    if (rng > 0.15) {
      blink(client);
    } else {
      cursedBlink(client);
    }
    await sleep(eyesOpenDuration);
  }
}

// Ties together the blink loop and the emotion updates.
function emotionHandler(client) {
  // Update the emotion immediately.
  updateEmotion(client);
  // Then update emotion every 2 minutes (120000 ms).
  setInterval(() => updateEmotion(client), emotionUpdateInterval);
  // Start the continuous blink loop.
  randomBlink(client);
}

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

module.exports = async (client) => {
  logger.log(`Logged in as ${client.user.tag}!`, "ready");
  emotionHandler(client);
  process.env.TOKEN == "METRIX" ? null : friendRequestPoll(client);
};
