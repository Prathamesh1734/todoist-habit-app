import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGODB_URI;
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ DB Error:", err));

// --- SCHEMA ---
const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    priority: { type: String, enum: ["p1", "p2", "p3", "p4"], default: "p4" },
    isRecurring: { type: Boolean, default: false },
    currentStreak: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    dueDate: { type: Date, default: null },
    history: { type: [String], default: [] },
    project: { type: String, default: "Inbox", trim: true },
    notes: { type: String, default: "" }, // Notes field added here
  },
  { timestamps: true },
);

const Task = mongoose.model("Task", taskSchema);

// --- ROUTES ---

// 1. Get all tasks
app.get("/api/tasks", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Create a new task
app.post("/api/tasks", async (req, res) => {
  try {
    const newTask = new Task(req.body);
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 3. Toggle task completion & update streaks
app.patch("/api/tasks/:id/toggle", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    task.isCompleted = !task.isCompleted;

    // Handle Streak History for the Heatmap
    if (task.isRecurring) {
      if (!task.history) task.history = [];
      const today = new Date().toISOString().split("T")[0]; // yyyy-MM-dd

      if (task.isCompleted) {
        task.currentStreak += 1;
        if (!task.history.includes(today)) {
          task.history.push(today);
        }
      } else {
        task.currentStreak = Math.max(0, task.currentStreak - 1);
        task.history = task.history.filter((date) => date !== today);
      }
    }

    await task.save();
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 4. Update task details (title, notes, priority, etc.)
app.patch("/api/tasks/:id", async (req, res) => {
  try {
    // findByIdAndUpdate safely applies any fields sent in req.body
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 5. Delete a task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`),
);
