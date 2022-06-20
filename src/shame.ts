import dayjs from "dayjs";
import { Client, TextChannel } from "discord.js";
import { Habit } from "./db/habit";

export function scheduleShame(habit: Habit, client: Client<boolean>) {
  if (dayjs().isAfter(habit.datetime)) {
    if (habit.repeat) {
      const diff =
        dayjs().diff(dayjs(habit.datetime), "seconds") % habit.repeat;

      const offset = (habit.repeat - diff) * 1000;

      console.log(
        `Scheduling ${habit.name} in ${offset}ms due to a diff of ${diff}`
      );

      setTimeout(() => nameAndShame(habit, client), offset);
    }
  } else {
    const offset = dayjs(habit.datetime).diff(dayjs());

    console.log(`Scheduling ${habit.name} in ${offset}ms`);
    setTimeout(() => nameAndShame(habit, client), offset);
  }
}

export async function nameAndShame(habit: Habit, client: Client<boolean>) {
  console.log(`${habit}`);
  const shouldShame = true;
  if (shouldShame) {
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

    scheduleShame(habit, client);
  }
}
