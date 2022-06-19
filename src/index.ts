import { Client, Intents } from "discord.js";
import { config } from "dotenv";
config();

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.once("ready", () => {
  console.log("Ready!");
});

const token = process.env.DISCORD_TOKEN;

if (token) {
  client.login();
}
