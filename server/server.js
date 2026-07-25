import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import Task from "./models/Task.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("db connected"))
  .catch((err) => console.error("db error: ", err));

// == API routes ==
app.get("/api/tasks", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/tasks", async (req, res) => {
  try {
    const newTask = new Task(req.body);
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch("/api/tasks/:id/toggle", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "task not found" });

    task.isCompleted = !task.isCompleted;

    if (task.isRecurring) {
      if (task.isCompleted) {
        task.currentStreak += 1;
      } else {
        task.currentStreak = Math.max(0, task.currentStreak - 1);
      }
    }

    await task.save();
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const { title, dueDate } = req.body;
    const task = await new Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "task not found" });

    if (!title !== undefined) task.title = title;
    if (!dueDate !== undefined) task.dueDate = dueDate;

    await task.save();
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: "task not found" });
    res.json({ message: "task deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
