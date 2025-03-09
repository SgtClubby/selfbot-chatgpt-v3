const mongoose = require("mongoose");
const { Schema } = mongoose;
const logger = require("@modules/Logger");
mongoose.set("strictQuery", false);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => logger.log("MongoDB connected successfully.", "debug"))
  .catch((e) => console.log(e));

const contentSchema = new Schema({
  type: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: false,
  },
  image_url: {
    url: {
      type: String,
      required: false,
    },
    detail: {
      type: String,
      required: false,
    },
  },
});

const messageSchema = new Schema({
  role: {
    type: String,
    required: true,
  },
  content: [contentSchema],
});

const contextSchema = new Schema({
  _id: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  messages: [messageSchema],
  contextId: {
    type: String,
    required: false,
  },
  active: {
    type: Boolean,
    required: false,
  },
  model: {
    type: String,
    required: false,
  },
  usesSystemMessage: {
    type: Boolean,
    required: false,
  },
});

const usageSchema = new Schema({
  _id: String,
  userId: String,
  username: String,
  tokens: {
    prompt_tokens: { type: Number, default: 0 },
    completion_tokens: { type: Number, default: 0 },
  },
  usage: Number,
});

const Tokens = new Schema({
  _id: String,
  prompt_tokens: Number,
  completion_tokens: Number,
});

const Context = mongoose.model("context", contextSchema);
const Usage = mongoose.model("usage", usageSchema);
const Token = mongoose.model("token", Tokens);

module.exports = { Context, Usage, Token };
