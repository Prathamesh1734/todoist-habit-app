import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  CircleCheck,
  Circle,
  Flame,
  Calendar,
  Plus,
  Layers,
  Loader2,
  Trash2,
} from "lucide-react";

const API_URL = "http://localhost:5000/api/tasks";

const PRIORITY_COLORS = {
  p1: "text-red-500 fill-red-500/10",
  p2: "text-orange-500 fill-orange-500/10",
  p3: "text-blue-500 fill-blue-500/10",
  p4: "text-gray-400 fill-transparent",
};

export default function App() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("p4");
  const [isRecurring, setIsRecurring] = useState(false);

  // 1. Fetch Tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    },
  });

  // 2. Add Task Mutation
  const addTaskMutation = useMutation({
    mutationFn: async (newTask) => {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setTitle("");
      setPriority("p4");
      setIsRecurring(false);
    },
  });

  // 3. Toggle Task Mutation
  const toggleMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API_URL}/${id}/toggle`, { method: "PATCH" });
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previousTasks = queryClient.getQueryData(["tasks"]);

      queryClient.setQueryData(["tasks"], (old) =>
        old.map((task) => {
          if (task._id === id) {
            const isNowCompleted = !task.isCompleted;
            let newStreak = task.currentStreak;
            if (task.isRecurring) {
              newStreak = isNowCompleted
                ? newStreak + 1
                : Math.max(0, newStreak - 1);
            }
            return {
              ...task,
              isCompleted: isNowCompleted,
              currentStreak: newStreak,
            };
          }
          return task;
        }),
      );
      return { previousTasks };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(["tasks"], context.previousTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // 4. Delete Task Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previousTasks = queryClient.getQueryData(["tasks"]);

      queryClient.setQueryData(["tasks"], (old) =>
        old.filter((task) => task._id !== id),
      );

      return { previousTasks };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(["tasks"], context.previousTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTaskMutation.mutate({ title, priority, isRecurring });
  };

  // Split tasks into Active and Completed arrays
  const activeTasks = tasks.filter((t) => !t.isCompleted);
  const completedTasks = tasks.filter((t) => t.isCompleted);

  // Helper function to render a task so we don't duplicate code
  const renderTask = (task) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      key={task._id}
      className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all ${
        task.isCompleted
          ? "bg-zinc-950/50 border-zinc-900/50 opacity-50"
          : "bg-zinc-900/80 border-zinc-700/50 hover:border-zinc-600 shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={() => toggleMutation.mutate(task._id)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none cursor-pointer"
        >
          {task.isCompleted ? (
            <CircleCheck className="w-5 h-5 text-zinc-500 fill-zinc-800" />
          ) : (
            <Circle className={`w-5 h-5 ${PRIORITY_COLORS[task.priority]}`} />
          )}
        </button>
        <span
          className={`text-sm select-none ${task.isCompleted ? "line-through text-zinc-500" : "text-zinc-200"}`}
        >
          {task.title}
        </span>
      </div>

      <div className="flex items-center gap-3 ml-4">
        {task.isRecurring && (
          <div className="flex items-center gap-1 text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <Flame className="w-3.5 h-3.5 fill-amber-500" />
            <span>{task.currentStreak} day streak</span>
          </div>
        )}

        <button
          onClick={() => deleteMutation.mutate(task._id)}
          className="text-zinc-600 hover:text-red-400 p-1.5 rounded-md hover:bg-red-400/10 transition-colors focus:outline-none opacity-0 group-hover:opacity-100 cursor-pointer"
          title="Delete Task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-red-500/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8 px-2 text-red-500 font-bold text-xl tracking-tight">
          <CircleCheck className="w-6 h-6" />
          <span>TaskTrack</span>
        </div>
        <nav className="space-y-1">
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900 text-zinc-100 font-medium text-sm transition-colors">
            <span className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-red-400" /> Today
            </span>
            <span className="text-xs text-zinc-500">{activeTasks.length}</span>
          </button>
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-colors text-sm">
            <span className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-blue-400" /> Habits
            </span>
            <span className="text-xs text-zinc-500">
              {tasks.filter((t) => t.isRecurring).length}
            </span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto max-w-3xl mx-auto px-8 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Today</h1>
          <p className="text-zinc-500 text-sm mt-1">What are you working on?</p>
        </header>

        {/* Task Creation Form */}
        <form
          onSubmit={handleAddTask}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-8 focus-within:border-zinc-700 transition-colors shadow-sm"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Meditate for 10 minutes"
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none mb-3"
            disabled={addTaskMutation.isPending}
          />
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
            <div className="flex items-center gap-2">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="bg-zinc-800 text-xs text-zinc-300 rounded-md px-2 py-1.5 border border-zinc-700 focus:outline-none cursor-pointer hover:bg-zinc-700 transition-colors"
              >
                <option value="p1">P1 (High)</option>
                <option value="p2">P2 (Medium)</option>
                <option value="p3">P3 (Low)</option>
                <option value="p4">P4 (None)</option>
              </select>
              <button
                type="button"
                onClick={() => setIsRecurring(!isRecurring)}
                className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-md border transition-colors ${
                  isRecurring
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                <Flame className="w-3.5 h-3.5" /> Habit
              </button>
            </div>
            <button
              type="submit"
              disabled={addTaskMutation.isPending || !title.trim()}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-md flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              {addTaskMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Add
            </button>
          </div>
        </form>

        {/* Task Lists Wrapper */}
        {isLoading ? (
          <div className="text-center text-zinc-500 text-sm py-10 flex justify-center items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading tasks...
          </div>
        ) : (
          <motion.div layout className="space-y-8">
            {/* Active Tasks Section */}
            <motion.div layout className="space-y-2">
              <AnimatePresence>{activeTasks.map(renderTask)}</AnimatePresence>
              {activeTasks.length === 0 && (
                <motion.p
                  layout
                  className="text-sm text-zinc-500 text-center py-6"
                >
                  You're all caught up for today!
                </motion.p>
              )}
            </motion.div>

            {/* Completed Tasks Section */}
            {completedTasks.length > 0 && (
              <motion.div layout className="space-y-2">
                <motion.div layout className="flex items-center gap-3 mb-4">
                  <div className="h-px bg-zinc-800 flex-1"></div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Completed
                  </h2>
                  <div className="h-px bg-zinc-800 flex-1"></div>
                </motion.div>

                <AnimatePresence>
                  {completedTasks.map(renderTask)}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
