import { SlashCommandBuilder } from "@discordjs/builders";
import dayjs from "dayjs";
import {
  AutocompleteInteraction,
  CommandInteraction,
  GuildMember,
} from "discord.js";
import { checkInModel } from "../db/checkin";
import { Habit, habitModel } from "../db/habit";
import { getEndTime, hasValidLatestCheckin, inWindow } from "../utils";

export default {
  data: new SlashCommandBuilder()
    .setName("checkin")
    .setDescription("Check in for a habit")
    .addStringOption((option) =>
      option
        .setName("habit")
        .setDescription("The name of the habit")
        .setRequired(true)
        .setAutocomplete(true)
    ),
  async execute(interaction: CommandInteraction) {
    const habitName = interaction.options.getString("habit");

    const habit = await habitModel.findOne({
      name: habitName,
      guild: interaction.guild.id,
    });

    if (!habit) {
      await interaction.reply({ content: "Habit not found" });
      return;
    } else {
      if (habit.target == (interaction.member as GuildMember).id) {
        const _canCheckIn = await canCheckIn(habit);
        if (_canCheckIn.canCheckIn) {
          const checkIn = new checkInModel({
            habit: habit._id,
            target: habit.target,
            guild: habit.guild,
            timeOfCheckIn: dayjs().toISOString(),
          });
          try {
            await checkIn.validate();
            await checkIn.save();
            console.log(checkIn.toJSON());
            await interaction.reply({ content: `${habit.name} checked in` });
          } catch (error) {
            console.log(error);
            await interaction.reply({ content: "Error while saving to DB" });
          }
        } else {
          await interaction.reply({
            content: _canCheckIn.error,
          });
        }
      } else {
        await interaction.reply({ content: `${habit.name} is not yours` });
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

async function canCheckIn(
  habit: Habit
): Promise<{ canCheckIn: boolean; error?: string }> {
  const nextEndTime = getEndTime(habit);

  const _hasValidLatestCheckin = await hasValidLatestCheckin(habit);
  if (habit.window) {
    let isNowInWindow = inWindow(dayjs(), habit.window, "h", nextEndTime);
    let canCheckIn = !_hasValidLatestCheckin && isNowInWindow;

    if (!canCheckIn) {
      let error = " ";
      if (_hasValidLatestCheckin) {
        error = `You have already checked in for the repetition`;
      } else if (!isNowInWindow) {
        error = `You are not currently in the check-in window`;
      }
      return {
        canCheckIn,
        error,
      };
    } else {
      return {
        canCheckIn,
      };
    }
  } else {
    let beforeDateTime = dayjs().isBefore(dayjs(nextEndTime));
    console.log(beforeDateTime);
    let canCheckIn = !_hasValidLatestCheckin && beforeDateTime;
    if (!canCheckIn) {
      let error = " ";
      if (_hasValidLatestCheckin) {
        error = `You have already checked in for the repetition`;
      } else if (!beforeDateTime) {
        error = `It's too late to check-in now...`;
      }
      return {
        canCheckIn,
        error,
      };
    } else {
      return {
        canCheckIn,
      };
    }
  }
}
