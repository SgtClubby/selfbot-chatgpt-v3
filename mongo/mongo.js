const { Context } = require("./schema.js");
const { encode } = require("gpt-3-encoder");
const { generateContextId } = require("@modules/utils.js");
const logger = require("@modules/Logger");

function stripIds(document) {
  const doc = document.toObject(); // Convert to plain object
  delete doc._id; // Remove the main document _id
  if (doc.messages) {
    doc.messages.forEach((message) => {
      delete message._id; // Remove each message's _id
      if (message.content) {
        message.content.forEach((item) => {
          delete item._id; // Remove each content item's _id
        });
      }
    });
  }
  return doc;
}

class MongoDB {
  static async getContextByGuildId(guildId) {
    const contextDoc = await Context.findOne({ guildId, active: true });
    if (!contextDoc) {
      await MongoDB.newContext(guildId);
      return { context: [], guildId };
    }
    const stripped = stripIds(contextDoc);
    return { context: stripped.messages, guildId };
  }

  static async getGuildSettingsByGuildId(guildId) {
    const guildSettings = await Context.findOne(
      { guildId, active: true },
      { model: 1, usesSystemMessage: 1 }
    );
    return guildSettings;
  }

  static async getActiveCollectionByGuildId(guildId) {
    const collection = await Context.findOne({ guildId, active: true });
    return collection;
  }

  static async setGuildSettingsByGuildId(setting, guildId) {
    const guildSettings = await Context.findOne(
      { guildId, active: true },
      {
        model: 1,
        usesSystemMessage: 1,
      }
    );
    if (!guildSettings) {
      return null;
    }
    if (setting.model) {
      guildSettings.model = setting.model;
    }
    if (setting.usesSystemMessage) {
      guildSettings.usesSystemMessage = setting.usesSystemMessage;
    }
    await guildSettings.save();
    return guildSettings;
  }

  static async getContextIdsByGuildId(guildId) {
    const contextDoc = await Context.find({ guildId });
    if (!contextDoc) {
      return null;
    }

    const contexts = contextDoc.map((doc) => {
      return {
        contextId: doc.contextId,
        active: doc.active,
      };
    });

    return contexts;
  }

  static async setActiveContextIDByGuildID(guildId, contextId) {
    const contextDoc = await Context.find({ guildId });
    if (!contextDoc) {
      return null;
    }

    let updated = await Context.updateOne(
      { guildId, contextId },
      { $set: { active: true } }
    );

    return updated;
  }

  static async setContextByGuildId(guildId, log) {
    // check if the context already exists
    const existing = await Context.findOne({ guildId, active: true });
    if (existing) {
      logger.log(
        `Guild ${guildId} already has context, creating new...`,
        "debug"
      );
      await MongoDB.clearContextByGuildId(guildId);
    }

    const newContext = new Context({
      _id: generateContextId(),
      guildId,
      messages: log.context,
      contextId: generateContextId(),
      active: true,
      model: log.model,
      usesSystemMessage: true,
    });

    logger.log(`Loaded context for guild: ${guildId}`, "debug");
    return await newContext.save();
  }

  static async addToContext(guildId, newContext) {
    const { context } = await MongoDB.getContextByGuildId(guildId);
    context.push(newContext);
    const updatedContext = await Context.updateOne(
      { guildId, active: true },
      { $set: { messages: context } }
    );
    logger.log(`Updated context for guild: ${guildId}`, "debug");
    return updatedContext;
  }

  static async newContext(guildId) {
    const context = new Context({
      _id: generateContextId(),
      guildId,
      messages: [],
      contextId: generateContextId(),
      active: true,
      model: "gpt-4o",
      usesSystemMessage: true,
    });
    logger.log(`Created new context for guild: ${guildId}`, "debug");
    return await context.save();
  }

  static async clearContextByGuildId(guildId) {
    logger.log(`Clearing context for guild: ${guildId}`, "debug");
    return Context.updateOne(
      { guildId },
      {
        $set: {
          active: false,
        },
      }
    );
  }

  static async clearAllContext() {
    logger.log(`Clearing all context`, "debug");
    return await Context.deleteMany({});
  }

  static async trimContextByGuildId(guildId, currentContextLength) {
    const { context } = await MongoDB.getContextByGuildId(guildId);
    const trimmedContext = context.slice(Math.max(context.length - 5, 0));
    const updatedContext = await Context.updateOne(
      { guildId },
      { $set: { messages: trimmedContext } }
    );
    logger.log(
      `Trimmed context for guild: ${guildId} from ${currentContextLength} to ${trimmedContext.length}`,
      "debug"
    );
    return updatedContext;
  }

  static getTotalTokensFromContext(context) {
    let total = 0;
    context.forEach(({ content }) => {
      if (content.type === "text" && typeof content.text === "string") {
        total += encode(content.text).length;
      }
    });
    return total;
  }
}

module.exports = MongoDB;
