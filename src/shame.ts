import dayjs from "dayjs";
import {
  Client,
  Guild,
  GuildMember,
  MessageOptions,
  Role,
  TextChannel,
} from "discord.js";
import { set } from "mongoose";
import { Habit, habitModel } from "./db/habit";
import { hasValidLatestCheckin } from "./utils";

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

      timeout = setTimeout(() => nameAndShame(habit, client), offset);
    }
  } else {
    const offset = dayjs(habit.datetime).diff(dayjs());

    console.log(`Scheduling ${habit.name} in ${offset}ms`);
    if (!timeouts.has(habit._id.toString()))
      timeout = setTimeout(() => nameAndShame(habit, client), offset);
  }

  if (timeout) timeouts.set(habit._id.toString(), timeout);
}

export async function nameAndShame(habit: Habit, client: Client<boolean>) {
  const hasCheckIn = (await hasValidLatestCheckin(habit)) != null;
  console.log(`Should shame?? ${hasCheckIn == false}`);

  const guild = await client.guilds.fetch(habit.guild);
  const target = await guild.members.fetch(habit.target);
  if (guild) {
    const channel = guild.channels.cache.find(
      (c) => c.name == "shame"
    ) as TextChannel;

    if (channel) {
      const member = guild.members.cache.get(habit.audience);
      const role = guild.roles.cache.get(habit.audience);

      habit = await habitModel.findByIdAndUpdate(
        habit._id,
        hasCheckIn
          ? habit.streak > 1
            ? { $inc: { streak: 1 } }
            : { $set: { streak: 1 } }
          : habit.streak < -1
          ? { $inc: { streak: -1 } }
          : { $set: { streak: -1 } },
        { new: true }
      );

      let message = getMessage(habit, target, member, role);

      if (message) channel.send(message);
    }
  }

  scheduleShame(habit, client);
}

function getMessage(
  habit: Habit,
  target: GuildMember,
  member: GuildMember,
  role: Role
): MessageOptions | null {
  console.log(`habit.streak: ${habit.streak}`);
  if (habit.streak > 0) {
    if (streakGoals.includes(habit.streak)) {
      let next = streakGoals.findIndex((n) => n == habit.streak) + 1;
      return {
        content: `${member ? `<@${member.id}>,` : ""} ${
          role ? `<@${role.id}>` : ""
        } ${`<@${target.id}>`} has completed ${habit.name} ${
          habit.streak
        } amount of times in a row! ${
          streakGoals.length > next
            ? ` Your next goal is ${streakGoals[next]}`
            : ""
        }`,
      };
    }
  } else {
    return {
      content: `${member ? `<@${member.id}>,` : ""} ${
        role ? `<@${role.id}>` : ""
      } ${`<@${target.id}>`} has been shamed for not ${habit.name}`,
    };
  }
}

const streakGoals = [3, 5, 10, 20, 35, 50, 75, 100];
