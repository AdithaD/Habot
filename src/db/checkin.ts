import mongoose from "mongoose";

export type CheckIn = {
  habit: mongoose.Types.ObjectId;
  timeOfCheckIn: Date;
  target: string;
  guild: string;
};

const checkInSchema = new mongoose.Schema({
  habit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Habit",
    required: true,
  },
  timeOfCheckIn: {
    type: mongoose.Schema.Types.Date,
    required: true,
  },
  target: {
    type: String,
    required: true,
  },
  guild: {
    type: String,
    required: true,
  },
});

export const checkInModel = mongoose.model<CheckIn>("CheckIn", checkInSchema);
