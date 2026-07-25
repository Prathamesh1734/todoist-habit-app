import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    priority: { type: String, enum: ["p1", "p2", "p3", "p4"], default: "p4" },
    isRecurring: { type: Boolean, default: false },
    currentStreak: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("Task", taskSchema);
