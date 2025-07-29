const { sleep } = require("@modules/utils");
const { emotions } = require("@config/config");
const { getEyes } = require("@modules/emotions/expression");

const isBlinking = true;

async function blink(client) {
  const eyes = getEyes();
  await client.user.setActivity(eyes.eyesClosed, {
    type: emotions.activityType,
  });
  await sleep(emotions.eyesClosedDuration);
  await client.user.setActivity(eyes.eyesOpen, {
    type: emotions.activityType,
  });
}

async function cursedBlink(client) {
  const eyes = getEyes();
  // One eye closes then the other
  await client.user.setActivity(eyes.cursedEyesRight, {
    type: emotions.activityType,
  });
  await sleep(emotions.eyesClosedDuration);
  await client.user.setActivity(eyes.cursedEyesLeft, {
    type: emotions.activityType,
  });
  await sleep(emotions.eyesClosedDuration);
  await client.user.setActivity(eyes.eyesOpen, {
    type: emotions.activityType,
  });
}

async function startBlink(client) {
  const eyes = getEyes();
  try {
    // Set initial eyes
    await client.user.setActivity(eyes.eyesOpen, {
      type: emotions.activityType,
    });
    while (isBlinking) {
      if (Math.random() > 0.15) {
        await blink(client);
      } else {
        await cursedBlink(client);
      }
      await sleep(emotions.eyesOpenDuration);
    }
  } catch (error) {
    console.error("Error in blink loop:", error);
  }
}

function toggleBlink() {
  isBlinking = !isBlinking;
}

module.exports = {
  startBlink,
  toggleBlink,
};
