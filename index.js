require("dotenv").config();
require("module-alias/register");

// Load up the discord.js library
const { determineLibrary, determineToken } = require("@modules/utils");
const { Client, Collection, version } = determineLibrary();

const fs = require("fs");
const path = require("path");
const { partials, permLevels, intents } = require("@config/config");
const logger = require("@modules/Logger");
const { hasValidProps } = require("@modules/utils");
const client = new Client({ intents, partials });

//discord.js version

// Aliases, commands and slash commands
const commands = new Collection();
const aliases = new Collection();

const levelCache = {};
for (let i = 0; i < permLevels.length; i++) {
  const thisLevel = permLevels[i];
  levelCache[thisLevel.name] = thisLevel.level;
}

//Container for commands
client.container = {
  commands,
  aliases,
  levelCache,
};

var walk = function (dir, done) {
  var results = [];
  fs.readdir(dir, function (err, list) {
    if (err) return done(err);
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) return done(null, results);
      file = path.resolve(dir, file);
      fs.stat(file, function (err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function (err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
};

(async function init() {
  const eventFiles = fs
    .readdirSync("./events/")
    .filter((file) => file.endsWith(".js"));
  logger.log(`Loading Events...`, "log");
  for (const file of eventFiles) {
    const eventName = file.split(".")[0];
    logger.log(`Loading Event: ${eventName}`, "log");
    const event = require(`./events/${file}`);
    client.on(eventName, event.bind(null, client));
  }

  logger.log(`Loading Commands...`, "log");
  walk("./commands/", function (err, folderContents) {
    if (err) throw err;
    for (const file of folderContents) {
      const props = require(`${file}`);
      hasValidProps(props, file);

      logger.log(`Loading Command: ${props.help.name}`, "log");
      client.container.commands.set(props.help.name, props);
      props.conf.aliases.forEach((alias) => {
        client.container.aliases.set(alias, props.help.name);
      });
    }
  });

  client.on("threadCreate", (thread) => thread.join());

  logger.log(`Using USER: ${process.env.TOKEN}`, "debug");

  client.login(determineToken());
})();

module.exports = { version };
