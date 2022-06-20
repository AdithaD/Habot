import { SlashCommandBuilder } from "@discordjs/builders";
import {
  AutocompleteInteraction,
  CommandInteraction,
  GuildMember,
} from "discord.js";
import { habitModel } from "../db/habit";

export default {
  data: new SlashCommandBuilder()
    .setName("removehabit")
    .setDescription("Removes a habit")
    .addStringOption((option) =>
      option
        .setName("habit")
        .setDescription("The name of the habit to remove")
        .setRequired(true)
        .setAutocomplete(true)
    ),
  async execute(interaction: CommandInteraction) {
    const habitName = interaction.options.getString("habit");

    const habit = await habitModel.findOneAndDelete({
      name: habitName,
      guild: interaction.guild.id,
    });

    if (!habit) {
      await interaction.reply({ content: "Habit not found" });
      return;
    } else {
      if (habit.target == (interaction.member as GuildMember).id) {
        await interaction.reply({ content: `${habit.name} removed` });
      }
    }
  },
  async autocomplete(interaction: AutocompleteInteraction) {
    const query = interaction.options.getString("habit");
    const pipeline = [];
    if (query.length > 0) {
      pipeline.push({
        $search: {
          autocomplete: { query, path: "name" },
        },
      });
    }

    console.log(
      `${interaction.guild.id} ${(interaction.member as GuildMember).id}`
    );

    pipeline.push({
      $match: {
        guild: interaction.guild.id,
        target: (interaction.member as GuildMember).id,
      },
    });

    const habits = await habitModel.aggregate(pipeline);

    const results = habits.map((habit) => ({
      name: habit.name,
      value: habit.name,
    }));
    console.log(results);
    await interaction.respond(results);
  },
};
