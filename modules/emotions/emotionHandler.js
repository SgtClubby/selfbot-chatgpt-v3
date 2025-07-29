const { startBlink } = require("@modules/emotions/blinks");
const { randomExpression } = require("@modules/emotions/expression");
const state = require("@modules/emotions/state");
const { emotions } = require("@config/config");

// Updates the bot's emotion
async function updateEmotion() {
  const expression = randomExpression();
  state.mouth = expression;
}

// Ties together the blink loop and the emotion updates.
function emotionHandler(client) {
  // Update the emotion immediately.
  updateEmotion();
  // Then update emotion
  setInterval(
    async () => await updateEmotion(),
    emotions.emotionUpdateInterval
  );
  // Start the continuous blink loop.
  startBlink(client);
}

module.exports = {
  emotionHandler,
};
