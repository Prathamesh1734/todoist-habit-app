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
  CalendarClock,
} from "lucide-react";
import * as chrono from "chrono-node";
import {
  format,
  isToday,
  isTomorrow,
  isPast,
  startOfDay,
  subDays,
} from "date-fns";

const API_URL = "http://localhost:5000/api/tasks";

const PRIORITY_COLORS = {
  p1: "text-red-500 fill-red-500/10",
  p2: "text-orange-500 fill-orange-500/10",
  p3: "text-blue-500 fill-blue-500/10",
  p4: "text-gray-400 fill-transparent",
};

const formatDueDate = (dateString) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "MMM d");
};

const isTaskOverdue = (dateString) => {
  if (!dateString) return false;
  const d = new Date(dateString);
  return isPast(startOfDay(d)) && !isToday(d);
};

// --- NEW COMPONENT: Activity Heatmap ---
const ActivityHeatmap = ({ tasks }) => {
  // Generate the last 84 days (12 weeks)
  const days = Array.from({ length: 84 }).map((_, i) => {
    const d = subDays(new Date(), 83 - i);
    return format(d, "yyyy-MM-dd");
  });

  // Count completions per day across all tasks
  const activityMap = {};
  tasks.forEach((task) => {
    if (task.history) {
      task.history.forEach((date) => {
        activityMap[date] = (activityMap[date] || 0) + 1;
      });
    }
  });

  // Determine color intensity based on completion count
  const getColor = (count) => {
    if (count === 0)
      return "bg-zinc-800/50 outline outline-1 outline-zinc-800/80";
    if (count === 1)
      return "bg-emerald-900 outline outline-1 outline-emerald-900/50";
    if (count === 2)
      return "bg-emerald-700 outline outline-1 outline-emerald-700/50";
    return "bg-emerald-500 outline outline-1 outline-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.4)]";
  };

  return (
    <div className="mb-10 p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30">
      <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
        <Flame className="w-4 h-4 text-emerald-500" />
        Activity History
      </h3>

      <div className="overflow-x-auto pb-2">
        <div className="grid grid-rows-7 grid-flow-col gap-1.5 w-max">
          {days.map((date) => {
            const count = activityMap[date] || 0;
            return (
              <div
                key={date}
                title={`${date}: ${count} tasks completed`}
                className={`w-3 h-3 rounded-[2px] transition-colors duration-300 ${getColor(count)} cursor-default`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("p4");
  const [isRecurring, setIsRecurring] = useState(false);
  const [currentView, setCurrentView] = useState("today");

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

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
      setIsRecurring(currentView === "habits");
    },
  });

  // 3. Toggle Task Completion (with Heatmap Optimistic Update)
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
            let newHistory = [...(task.history || [])];

            // Get local date in YYYY-MM-DD
            const today = format(new Date(), "yyyy-MM-dd");

            // Handle Streak
            if (task.isRecurring) {
              newStreak = isNowCompleted
                ? newStreak + 1
                : Math.max(0, newStreak - 1);
            }

            // Handle Heatmap History
            if (isNowCompleted) {
              if (!newHistory.includes(today)) newHistory.push(today);
            } else {
              newHistory = newHistory.filter((date) => date !== today);
            }

            return {
              ...task,
              isCompleted: isNowCompleted,
              currentStreak: newStreak,
              history: newHistory,
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

  // 4. Update Task Content
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update task");
      }
      return res.json();
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previousTasks = queryClient.getQueryData(["tasks"]);

      queryClient.setQueryData(["tasks"], (old) =>
        old.map((task) => (task._id === id ? { ...task, ...updates } : task)),
      );
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      console.error("Mutation failed:", err.message);
      alert(`Update failed: ${err.message}`);
      queryClient.setQueryData(["tasks"], context.previousTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // 5. Delete Task Mutation
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

    let finalTitle = title;
    let dueDate = null;
    const parsedResults = chrono.parse(title);

    if (parsedResults.length > 0) {
      dueDate = parsedResults[0].start.date();
      finalTitle = title.replace(parsedResults[0].text, "").trim();
    }

    addTaskMutation.mutate({
      title: finalTitle || title,
      priority,
      isRecurring,
      dueDate,
    });
  };

  const handleDoubleClick = (task) => {
    if (task.isCompleted) return;
    setEditingTaskId(task._id);
    setEditTitle(task.title);
  };

  const submitEdit = (task) => {
    if (!editTitle.trim()) {
      setEditingTaskId(null);
      return;
    }

    let finalTitle = editTitle;
    let dueDate = task.dueDate;

    const parsedResults = chrono.parse(editTitle);
    if (parsedResults.length > 0) {
      dueDate = parsedResults[0].start.date();
      finalTitle = editTitle.replace(parsedResults[0].text, "").trim();
    }

    if (finalTitle !== task.title || dueDate !== task.dueDate) {
      updateTaskMutation.mutate({
        id: task._id,
        updates: { title: finalTitle || editTitle, dueDate },
      });
    }

    setEditingTaskId(null);
  };

  const viewFilteredTasks = tasks.filter((task) => {
    if (currentView === "habits") return task.isRecurring;
    return true;
  });

  const activeTasks = viewFilteredTasks
    .filter((t) => !t.isCompleted)
    .sort((a, b) => {
      const aOverdue = isTaskOverdue(a.dueDate);
      const bOverdue = isTaskOverdue(b.dueDate);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (a.priority !== b.priority)
        return a.priority.localeCompare(b.priority);
      if (a.dueDate && b.dueDate)
        return new Date(a.dueDate) - new Date(b.dueDate);
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return 0;
    });

  const completedTasks = viewFilteredTasks.filter((t) => t.isCompleted);

  const renderTask = (task) => {
    const isOverdue = isTaskOverdue(task.dueDate);
    const isEditing = editingTaskId === task._id;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        key={task._id}
        className={`w-full group flex items-center justify-between p-3.5 rounded-xl border transition-all ${
          task.isCompleted
            ? "bg-zinc-950/50 border-zinc-900/50 opacity-50"
            : "bg-zinc-900/80 border-zinc-700/50 hover:border-zinc-600 shadow-sm"
        } ${isEditing ? "border-blue-500/50 ring-1 ring-blue-500/20" : ""}`}
      >
        <div className="flex items-start gap-3 flex-1">
          <button
            onClick={() => toggleMutation.mutate(task._id)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none cursor-pointer mt-0.5 shrink-0"
          >
            {task.isCompleted ? (
              <CircleCheck className="w-5 h-5 text-zinc-500 fill-zinc-800" />
            ) : (
              <Circle className={`w-5 h-5 ${PRIORITY_COLORS[task.priority]}`} />
            )}
          </button>

          <div className="flex flex-col w-full">
            {isEditing ? (
              <input
                autoFocus
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => submitEdit(task)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitEdit(task);
                  if (e.key === "Escape") setEditingTaskId(null);
                }}
                className="bg-zinc-950/80 border border-zinc-700 rounded-md px-2 py-0.5 text-sm text-zinc-100 outline-none w-full mr-4 focus:border-blue-500/50"
              />
            ) : (
              <span
                onDoubleClick={() => handleDoubleClick(task)}
                title="Double-click to edit"
                className={`text-sm select-none cursor-text w-full ${task.isCompleted ? "line-through text-zinc-500" : "text-zinc-200"}`}
              >
                {task.title}
              </span>
            )}

            {task.dueDate && !isEditing && (
              <div
                className={`flex items-center gap-1 mt-1 text-[11px] font-medium ${
                  task.isCompleted
                    ? "text-zinc-600"
                    : isOverdue
                      ? "text-red-400"
                      : "text-blue-400"
                }`}
              >
                <CalendarClock className="w-3 h-3" />
                {formatDueDate(task.dueDate)}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 ml-4 shrink-0">
          {task.isRecurring && (
            <div className="flex items-center gap-1 text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <Flame className="w-3.5 h-3.5 fill-amber-500" />
              <span>{task.currentStreak}</span>
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
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-red-500/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 p-4 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-8 px-2 text-red-500 font-bold text-xl tracking-tight">
          <CircleCheck className="w-6 h-6" />
          <span>TaskTrack</span>
        </div>
        <nav className="space-y-1">
          <button
            onClick={() => {
              setCurrentView("today");
              setIsRecurring(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer ${
              currentView === "today"
                ? "bg-zinc-900 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Calendar
                className={`w-4 h-4 ${currentView === "today" ? "text-red-400" : "text-zinc-500"}`}
              />
              Today
            </span>
            <span className="text-xs text-zinc-500">
              {tasks.filter((t) => !t.isCompleted).length}
            </span>
          </button>

          <button
            onClick={() => {
              setCurrentView("habits");
              setIsRecurring(true);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer ${
              currentView === "habits"
                ? "bg-zinc-900 text-zinc-100"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Layers
                className={`w-4 h-4 ${currentView === "habits" ? "text-blue-400" : "text-zinc-500"}`}
              />
              Habits
            </span>
            <span className="text-xs text-zinc-500">
              {tasks.filter((t) => t.isRecurring && !t.isCompleted).length}
            </span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-3xl mx-auto px-8 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            {currentView === "today" ? "Today" : "Habits"}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {currentView === "today"
              ? "What are you working on?"
              : "Your recurring routines and streaks"}
          </p>
        </header>

        {/* Heatmap (Only visible in Habits view) */}
        {currentView === "habits" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ActivityHeatmap tasks={tasks} />
          </motion.div>
        )}

        {/* Task Form */}
        <form
          onSubmit={handleAddTask}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-8 focus-within:border-zinc-700 transition-colors shadow-sm"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              currentView === "habits"
                ? "e.g., Read 20 pages every day..."
                : "e.g., Pay electricity bill p1 tomorrow..."
            }
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
                className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-md border transition-colors cursor-pointer ${
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

        {/* Task Lists */}
        {isLoading ? (
          <div className="text-center text-zinc-500 text-sm py-10 flex justify-center items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading tasks...
          </div>
        ) : (
          <motion.div layout className="space-y-8">
            <motion.div layout className="space-y-2 relative w-full">
              <AnimatePresence mode="popLayout">
                {activeTasks.map(renderTask)}
              </AnimatePresence>
              {activeTasks.length === 0 && (
                <motion.p
                  layout
                  className="text-sm text-zinc-500 text-center py-6"
                >
                  {currentView === "today"
                    ? "You're all caught up for today!"
                    : "No habits created yet. Add one above!"}
                </motion.p>
              )}
            </motion.div>

            {completedTasks.length > 0 && (
              <motion.div layout className="space-y-2 relative w-full">
                <motion.div layout className="flex items-center gap-3 mb-4">
                  <div className="h-px bg-zinc-800 flex-1"></div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Completed
                  </h2>
                  <div className="h-px bg-zinc-800 flex-1"></div>
                </motion.div>

                <AnimatePresence mode="popLayout">
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
