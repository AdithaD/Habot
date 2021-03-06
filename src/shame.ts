import dayjs from "dayjs";
import {
  Client,
  Guild,
  GuildMember,
  MessageOptions,
  Role,
  TextChannel,
} from "discord.js";
import mongoose, { set } from "mongoose";
import { Habit, habitModel } from "./db/habit";
import { hasValidLatestCheckIn } from "./utils";

let timeouts = new Map<string, NodeJS.Timeout>();

export function removeTimeout(habitId: string) {
  if (timeouts.has(habitId)) {
    clearTimeout(timeouts.get(habitId));
    timeouts.delete(habitId);
  }
}

export function clearAll() {
  timeouts.forEach((timeout) => {
    clearTimeout(timeout);
  });
  timeouts.clear();
}

export function scheduleShame(habit: Habit, client: Client<boolean>) {
  let timeout: NodeJS.Timeout | null = null;
  if (dayjs().isAfter(habit.datetime)) {
    if (habit.repeat && habit.repeat > 0) {
      const diff =
        dayjs().diff(dayjs(habit.datetime), "seconds") % habit.repeat;

      const offset = (habit.repeat - diff) * 1000;

      console.log(
        `Scheduling ${habit.name} in ${offset}ms due to a diff of ${diff}`
      );

      timeout = setTimeout(() => nameAndShame(habit._id, client), offset);
    }
  } else {
    const offset = dayjs(habit.datetime).diff(dayjs());

    console.log(`Scheduling ${habit.name} in ${offset}ms`);
    if (!timeouts.has(habit._id.toString()))
      timeout = setTimeout(() => nameAndShame(habit._id, client), offset);
  }

  if (timeout) timeouts.set(habit._id.toString(), timeout);
}

export async function nameAndShame(
  habitId: mongoose.Types.ObjectId,
  client: Client<boolean>
) {
  const habit = await habitModel.findById(habitId);

  const hasCheckIn = (await hasValidLatestCheckIn(habit, 1)) != null;

  const guild = await client.guilds.fetch(habit.guild);
  const target = await guild.members.fetch(habit.target);
  if (guild) {
    const channel = guild.channels.cache.find(
      (c) => c.name == "shame"
    ) as TextChannel;

    if (channel) {
      const member = guild.members.cache.get(habit.audience);
      const role = guild.roles.cache.get(habit.audience);

      if (!hasCheckIn) {
        let previousStreak = habit.streak;
        console.log(previousStreak);
        // Set update streak
        habit.streak = habit.streak < 0 ? habit.streak - 1 : -1;
        await habit.save();

        channel.send({
          content: `${member ? `<@${member.id}>,` : ""} ${
            role ? `<@${role.id}>` : ""
          } ${`<@${target.id}>`} has been ${getShameWord()} for not ${
            habit.name
          }. ${
            previousStreak > 2 ? `Losing a streak of ${previousStreak}` : ""
          }`,
        });
      }
    }
  }

  scheduleShame(habit, client);
}

const shameWords = [
  "shamed",
  "disgraced",
  "humiliated",
  "made a fool of",
  "put to shame",
  "dishonoured",
  "denigrated",
  "embarrased",
];
function getShameWord() {
  return shameWords[Math.floor(Math.random() * shameWords.length)];
}
