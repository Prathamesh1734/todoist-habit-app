import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["p1", "p2", "p3", "p4"],
      default: "p4",
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }, // to automatically add createdAt and updatedAt
);

export default mongoose.model("Task", taskSchema);
