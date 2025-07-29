const { randomNumber } = require("@modules/utils");
const { emotions } = require("@config/config");
const state = require("@modules/emotions/state");

function randomExpression() {
  // Pick a random expression and feeling.
  const expression =
    emotions.mouth_expressions[
      randomNumber(0, emotions.mouth_expressions.length - 1)
    ];
  return expression;
}

function getEyes() {
  return {
    eyesOpen: `(${emotions.eyeOpen}${state.mouth}${emotions.eyeOpen})`,
    eyesClosed: `(${emotions.eyeClose}${state.mouth}${emotions.eyeClose})`,
    cursedEyesRight: `(${emotions.eyeClose}${state.mouth}${emotions.eyeOpen})`,
    cursedEyesLeft: `(${emotions.eyeOpen}${state.mouth}${emotions.eyeClose})`,
  };
}

module.exports = {
  randomExpression,
  getEyes,
};
