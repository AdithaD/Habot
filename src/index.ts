import dayjs from "dayjs";
import {
  APIInteractionDataResolvedGuildMember,
  APIRole,
} from "discord-api-types/v9";
import {
  Client,
  Collection,
  GuildMember,
  Intents,
  Role,
  Snowflake,
  TextChannel,
  User,
} from "discord.js";
import { config } from "dotenv";

import fs from "fs";
import path from "path";
config();

import "./db/db";
import { Habit, habitModel } from "./db/habit";
import readline from "readline";
import { clearAll, scheduleShame } from "./shame";

const client = new Client({ intents: [Intents.FLAGS.GUILDS] }) as Client & {
  commands: Collection<string, any>;
};

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".ts"));

client.commands = new Collection();

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath).default;
  // Set a new item in the Collection
  // With the key as the command name and the value as the exported module
  client.commands.set(command.data.name, command);
}

initFromDB();

const token = process.env.DISCORD_TOKEN;

if (token) {
  client.login();
} else {
  throw new Error("DISCORD_TOKEN is not defined");
}

client.once("ready", () => {
  console.log("Ready!");
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      try {
        if (command.autocomplete) {
          await command.autocomplete(interaction);
        } else {
          console.log(
            `Command ${interaction.commandName} does not have autocomplete handler.`
          );
        }
      } catch (error) {
        console.log(error);
      }
    } else if (interaction.isApplicationCommand()) {
      const command = client.commands.get(interaction.commandName);

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "An error occurred while executing this command.",
          ephemeral: true,
        });
      }
    }
  } catch (error) {
    console.error(error);
  }
});

export function initFromDB() {
  habitModel.find({}, (err: Error, h: Habit[]) => {
    if (err) {
      console.error(err);
      throw new Error("Error while initializing from DB");
    } else {
      h.forEach((h) => scheduleShame(h, client));
    }
  });
}

readline
  .createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  .on("line", (line) => {
    if (line === "exit") {
      clearAll();
      process.exit();
    }
  });
