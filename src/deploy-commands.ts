import { REST } from "@discordjs/rest";
import {
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
} from "discord-api-types/v9";
import { config } from "dotenv";

import fs from "fs";
import path from "path";

config();
const { CLIENT_ID, GUILD_ID, DISCORD_TOKEN } = process.env;

async function initCommands() {
  const commands = [] as RESTPostAPIApplicationCommandsJSONBody[];

  const commandsFiles = fs
    .readdirSync(path.join(__dirname, "commands"))
    .filter((file) => file.endsWith(".ts"));

  for (const file of commandsFiles) {
    const command = (await import(path.join(__dirname, "commands", file)))
      .default;
    commands.push(command.data.toJSON());
  }

  if (DISCORD_TOKEN && CLIENT_ID && GUILD_ID) {
    const rest = new REST({ version: "9" }).setToken(DISCORD_TOKEN);

    rest
      .put(Routes.applicationCommands(CLIENT_ID), {
        body: commands,
      })
      .then(() => console.log("Successfully registered application commands."))
      .catch(console.error);
  }
}

initCommands();
