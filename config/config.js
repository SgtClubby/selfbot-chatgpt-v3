// selfbot-chatgpt-v3/config/config.js

const { determineLibrary, determineMode, getAvailableModels } = require("@modules/utils");

const { Intents } = determineLibrary();

// unused as its a selfbot
const myIntents = new Intents();
myIntents.add(
  Intents.FLAGS.DIRECT_MESSAGE_TYPING,
  Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
  Intents.FLAGS.GUILDS,
  Intents.FLAGS.GUILD_MEMBERS,
  Intents.FLAGS.GUILD_MESSAGES,
  Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  Intents.FLAGS.GUILD_PRESENCES,
  1 << 7,
  1 << 15
);

const mode = determineMode();
const intents = mode === "METRIX" ? myIntents : null;

const config = {
  // Bot admins
  admins: [],

  //Bot Support
  support: [
    // "459860217509838868",
    // "914187499713200170"
  ],

  // Unused as its a selfbot
  intents,

  availableModels: async () => {
    try {
      return await getAvailableModels();
    } catch (error) {
      console.error("Error fetching available models:", error);
      return [];
    }
  },

  partials: ["CHANNEL", "MESSAGE", "REACTION"],

  emotions: {
    eyeOpen: " ͡👁️",
    eyeClose: " ͡—",
    eyesClosedDuration: 600,
    eyesOpenDuration: 15000,
    activityType: "WATCHING",
    emotionUpdateInterval: 15000,
    mouth_expressions: ["◡", "︵", "ʖ̯", "O", "‿", "—", "⌣", "_", "ʖ", "O", "•"],
  },

  defaultSettings: {
    prefix: "?",
    modLogChannel: "mod-log",
    modRole: "Moderator",
    adminRole: "Administrator",
    systemNotice: "true",
    commandReply: "true",
    welcomeChannel: "welcome",
    welcomeMessage: "Say hello to {{user}}, everyone!",
    welcomeEnabled: "false",
  },

  permLevels: [
    {
      level: 0,
      name: "User",
      check: () => true,
    },
    {
      level: 9,
      name: "Moderator",
      check: (message) => {
        try {
          const modRole = message.guild.roles.cache.find(
            (r) => r.name.toLowerCase() === message.settings.modRole.toLowerCase()
          );
          if (modRole && message.member.roles.cache.some((role) => role.id === modRole.id))
            return true;
        } catch (e) {
          return false;
        }
      },
    },
    {
      level: 10,
      name: "Administrator",
      check: (message) => {
        try {
          const adminRole = message.guild.roles.cache.find(
            (r) => r.name.toLowerCase() === message.settings.adminRole.toLowerCase()
          );
          if (adminRole && message.member.roles.cache.some((role) => role.id === adminRole.id))
            return true;
        } catch (e) {
          return false;
        }
      },
    },
    {
      level: 12,
      name: "Server Owner",
      check: (message) => {
        const serverOwner = message.author ?? message.user;
        return message.guild?.ownerId === serverOwner.id;
      },
    },
    {
      level: 13,
      name: "Bot Support",
      check: (message) => {
        const botSupport = message.author ?? message.user;
        return config.support.includes(botSupport.id);
      },
    },
    {
      level: 14,
      name: "Bot Admin",
      check: (message) => {
        const botAdmin = message.author ?? message.user;
        return config.admins.includes(botAdmin.id);
      },
    },
    {
      level: 15,
      name: "Bot Owner",
      check: (message) => {
        const owner = message.author.id;
        return owner === process.env.OWNER;
      },
    },
  ],
};

module.exports = config;
