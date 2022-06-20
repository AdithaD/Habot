import mongoose from "mongoose";

export type Habit = {
  name: string;
  datetime: Date;
  window: number;
  repeat: number;
  audience: string;
  guild: string;
  target: string;
};

const habitSchema = new mongoose.Schema<Habit>({
  name: { type: String, required: true },
  datetime: { type: mongoose.Schema.Types.Date, required: true },
  window: { type: Number, required: true },
  repeat: { type: Number, required: true },
  audience: { type: String, required: true },
  guild: { type: String, required: true },
  target: { type: String, required: true },
});

export const habitModel = mongoose.model<Habit>("Habit", habitSchema);
