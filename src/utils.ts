import dayjs, { Dayjs } from "dayjs";
import { CheckIn, checkInModel } from "./db/checkin";
import { Habit } from "./db/habit";

export function getEndTime(habit: Habit, offset?: number): dayjs.Dayjs {
  const compareDate =
    offset && habit.repeat
      ? dayjs().subtract(habit.repeat * offset, "second")
      : dayjs();
  if (compareDate.isAfter(habit.datetime) && habit.repeat && habit.repeat > 0) {
    const quotient = Math.floor(
      compareDate.diff(dayjs(habit.datetime), "seconds") / habit.repeat
    );

    return dayjs(habit.datetime).add((quotient + 1) * habit.repeat, "seconds");
  } else {
    return dayjs(habit.datetime);
  }
}

export function inWindow(
  date: dayjs.Dayjs,
  window: number,
  unit: dayjs.ManipulateType,
  endTime: dayjs.Dayjs
): boolean {
  console.log(`${date.toISOString()} ${endTime.toISOString()}`);
  return date.isAfter(endTime.subtract(window, unit)) && date.isBefore(endTime);
}

export async function hasValidLatestCheckin(
  habit: Habit
): Promise<CheckIn | null> {
  const lastCheckIn = await checkInModel
    .findOne({ habit: habit._id })
    .sort({ timeOfCheckIn: -1 })
    .limit(1);

  const nextEndTime = getEndTime(habit, 1);
  console.log(`${nextEndTime.toISOString()} ${lastCheckIn}`);
  if (!lastCheckIn) {
    return null;
  } else {
    const timeOfCheckIn = dayjs(lastCheckIn.timeOfCheckIn);
    if (habit.repeat) {
      if (habit.window) {
        return inWindow(timeOfCheckIn, habit.window, "hours", nextEndTime)
          ? lastCheckIn
          : null;
      } else {
        return inWindow(timeOfCheckIn, habit.repeat, "seconds", nextEndTime)
          ? lastCheckIn
          : null;
      }
    } else {
      return timeOfCheckIn.isBefore(nextEndTime) ? lastCheckIn : null;
    }
  }
}
