import { SlashCommandBuilder } from "@discordjs/builders";
import dayjs from "dayjs";
import {
  AutocompleteInteraction,
  Client,
  CommandInteraction,
  GuildMember,
  MessageOptions,
} from "discord.js";
import { checkInModel } from "../db/checkin";
import { Habit, habitModel } from "../db/habit";
import { getEndTime, hasValidLatestCheckIn, inWindow } from "../utils";

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

            // Updates streak
            habit.streak = habit.streak < 1 ? 1 : habit.streak + 1;
            await habit.save();

            let message = await getMessage(habit, interaction.client);

            await interaction.reply(
              message ??
                `Successfully checked in ${habit.streak} times in a row`
            );
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
    await interaction.respond(results);
  },
};

async function canCheckIn(
  habit: Habit
): Promise<{ canCheckIn: boolean; error?: string }> {
  const nextEndTime = getEndTime(habit);

  const _hasValidLatestCheckin = await hasValidLatestCheckIn(habit);

  if (habit.window) {
    let isNowInWindow = inWindow(dayjs(), habit.window, "seconds", nextEndTime);
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

async function getMessage(
  habit: Habit,
  client: Client<boolean>
): Promise<string | null> {
  const guild = await client.guilds.fetch(habit.guild);
  const target = await guild.members.fetch(habit.target);
  const member = guild.members.cache.get(habit.audience);
  const role = guild.roles.cache.get(habit.audience);
  console.log(`habit.streak: ${habit.streak}`);
  if (streakGoals.includes(habit.streak)) {
    let next = streakGoals.findIndex((n) => n == habit.streak) + 1;
    return `${member ? `<@${member.id}>,` : ""} ${
      role ? `<@${role.id}>` : ""
    } ${`<@${target.id}>`} has completed ${habit.name} ${
      habit.streak
    } amount of times in a row! ${
      streakGoals.length > next ? ` Your next goal is ${streakGoals[next]}` : ""
    }`;
  }
}

const streakGoals = [3, 5, 10, 20, 35, 50, 75, 100];
