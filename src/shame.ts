import dayjs from "dayjs";
import { Client, TextChannel } from "discord.js";
import { Habit } from "./db/habit";
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
  const checkIn = await hasValidLatestCheckin(habit);
  console.log(checkIn);
  if (checkIn == null) {
    const guild = await client.guilds.fetch(habit.guild);
    const target = await guild.members.fetch(habit.target);
    if (guild) {
      const channel = guild.channels.cache.find(
        (c) => c.name == "shame"
      ) as TextChannel;

      if (channel) {
        const member = guild.members.cache.get(habit.audience);
        const role = guild.roles.cache.get(habit.audience);

        channel.send({
          content: `${member ? `<@${member.id}>` : null} ${
            role ? `<@${role.id}>` : ""
          }, ${`<@${target.id}>`} has been shamed for not ${habit.name}`,
        });
      }
    }
  } else {
    console.log(`${habit.name} no shame`);
  }

  scheduleShame(habit, client);
}
