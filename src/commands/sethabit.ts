import { SlashCommandBuilder } from "@discordjs/builders";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { CommandInteraction, GuildMember, Interaction, Role } from "discord.js";
import { habitModel } from "../db/habit";
import { scheduleShame } from "../shame";

export default {
  data: new SlashCommandBuilder()
    .setName("newhabit")
    .setDescription("Sets a new habit")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("The name of the habit")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("datetime")
        .setDescription(
          "The time the check-in period ends. format: HHmm DD/MM/YYYY"
        )
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("window")
        .setDescription("The time window for the check-in period in hour")
    )
    .addIntegerOption((option) =>
      option
        .setName("repeat")
        .setDescription("How often should the check-in period open in hours")
    )
    .addMentionableOption((option) =>
      option
        .setName("audience")
        .setDescription("Who should be notified if you fail to check-in")
    ),
  async execute(interaction: CommandInteraction) {
    const name = interaction.options.getString("name");
    const datetime = dayjs(
      interaction.options.getString("datetime"),
      "HHmm DD/MM/YYYY"
    );
    const window = interaction.options.getInteger("window");
    const repeat = interaction.options.getInteger("repeat");
    const audience = interaction.options.getMentionable("audience") as
      | GuildMember
      | Role;

    if (!datetime.isValid()) {
      await interaction.reply({ content: "Invalid date format" });
      return;
    }

    if (datetime.isBefore(dayjs())) {
      await interaction.reply({ content: "Date must be in the future" });
      return;
    }

    console.log(name, datetime.toISOString(), window, repeat, audience);

    const habit = new habitModel({
      name,
      datetime: datetime.toDate(),
      window,
      repeat,
      audience: audience?.id,
      guild: interaction.guild.id,
      target: (interaction.member as GuildMember).id,
    });

    try {
      await habit.validate();
      await habit.save();

      scheduleShame(habit, interaction.client);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: "Error while saving to DB" });
      return;
    }

    await interaction.reply("Successfully set a new habit!");
  },
};
