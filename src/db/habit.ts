import mongoose from "mongoose";

export type Habit = {
  _id: mongoose.Types.ObjectId;
  name: string;
  datetime: Date;
  streak: number;
  window?: number;
  repeat?: number;
  audience?: string;
  guild: string;
  target: string;
};

const habitSchema = new mongoose.Schema<Habit>({
  name: { type: String, required: true, index: true },
  guild: { type: String, required: true },
  target: { type: String, required: true },
  streak: { type: Number, required: true, default: 0 },
  datetime: { type: mongoose.Schema.Types.Date, required: true },
  window: { type: Number },
  repeat: { type: Number },
  audience: { type: String },
});

export const habitModel = mongoose.model<Habit>("Habit", habitSchema);
