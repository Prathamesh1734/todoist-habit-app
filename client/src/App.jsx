import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { format, isPast, isToday, startOfDay } from "date-fns";

import Sidebar from "./components/Sidebar";
import TaskForm from "./components/TaskForm";
import TaskItem from "./components/TaskItem";
import ActivityHeatmap from "./components/ActivityHeatmap";
import TaskDetail from "./components/TaskDetail";

const API_URL = "http://localhost:5000/api/tasks";

export default function App() {
  const queryClient = useQueryClient();

  // App State
  const [currentView, setCurrentView] = useState("today");
  const [theme, setTheme] = useState("dark");
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Apply Dark Mode to HTML root
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  // --- API QUERIES & MUTATIONS ---
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => (await fetch(API_URL)).json(),
  });

  const addTask = useMutation({
    mutationFn: async (task) =>
      (
        await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(task),
        })
      ).json(),
    onSuccess: () => queryClient.invalidateQueries(["tasks"]),
  });

  const toggleTask = useMutation({
    mutationFn: async (id) =>
      (await fetch(`${API_URL}/${id}/toggle`, { method: "PATCH" })).json(),
    onMutate: async (id) => {
      await queryClient.cancelQueries(["tasks"]);
      const prev = queryClient.getQueryData(["tasks"]);
      queryClient.setQueryData(["tasks"], (old) =>
        old.map((t) => {
          if (t._id === id) {
            const isComp = !t.isCompleted;
            const today = format(new Date(), "yyyy-MM-dd");
            let hist = [...(t.history || [])];
            if (isComp && !hist.includes(today)) hist.push(today);
            else if (!isComp) hist = hist.filter((d) => d !== today);
            return {
              ...t,
              isCompleted: isComp,
              history: hist,
              currentStreak: t.isRecurring
                ? isComp
                  ? t.currentStreak + 1
                  : Math.max(0, t.currentStreak - 1)
                : t.currentStreak,
            };
          }
          return t;
        }),
      );
      return { prev };
    },
    onError: (err, id, ctx) => queryClient.setQueryData(["tasks"], ctx.prev),
    onSettled: () => queryClient.invalidateQueries(["tasks"]),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, updates }) =>
      (
        await fetch(`${API_URL}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })
      ).json(),
    onSuccess: () => queryClient.invalidateQueries(["tasks"]),
  });

  const deleteTask = useMutation({
    mutationFn: async (id) =>
      (await fetch(`${API_URL}/${id}`, { method: "DELETE" })).json(),
    onSuccess: () => queryClient.invalidateQueries(["tasks"]),
  });

  // --- DATA PROCESSING ---
  // Dynamic Projects
  const projects = [
    ...new Set(tasks.map((t) => t.project).filter((p) => p && p !== "Inbox")),
  ].sort();

  // Sidebar Counts
  const counts = {
    today: tasks.filter((t) => !t.isCompleted).length,
    habits: tasks.filter((t) => t.isRecurring && !t.isCompleted).length,
    inbox: tasks.filter(
      (t) => (!t.project || t.project === "Inbox") && !t.isCompleted,
    ).length,
  };

  // Filter List based on Sidebar selection
  const viewTasks = tasks.filter((t) => {
    if (currentView === "today") return true;
    if (currentView === "habits") return t.isRecurring;
    if (currentView === "Inbox") return !t.project || t.project === "Inbox";
    return t.project === currentView;
  });

  const activeTasks = viewTasks
    .filter((t) => !t.isCompleted)
    .sort((a, b) => {
      const aLate =
        a.dueDate &&
        isPast(startOfDay(new Date(a.dueDate))) &&
        !isToday(new Date(a.dueDate));
      const bLate =
        b.dueDate &&
        isPast(startOfDay(new Date(b.dueDate))) &&
        !isToday(new Date(b.dueDate));
      if (aLate && !bLate) return -1;
      if (!aLate && bLate) return 1;
      if (a.priority !== b.priority)
        return a.priority.localeCompare(b.priority);
      return 0;
    });

  const completedTasks = viewTasks.filter((t) => t.isCompleted);
  const selectedTask = tasks.find((t) => t._id === selectedTaskId);

  return (
    <div className="flex h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans antialiased transition-colors duration-500 overflow-hidden">
      {/* 1. Left Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        theme={theme}
        toggleTheme={toggleTheme}
        projects={projects}
        counts={counts}
      />

      {/* 2. Center Main List */}
      <main className="flex-1 overflow-y-auto px-8 lg:px-12 py-16 relative">
        <div className="max-w-3xl mx-auto">
          <header className="mb-12">
            <motion.h1 layout className="text-3xl font-bold tracking-tight">
              {currentView === "today"
                ? "Today"
                : currentView === "habits"
                  ? "Habits"
                  : currentView}
            </motion.h1>
          </header>

          {currentView === "habits" && <ActivityHeatmap tasks={tasks} />}

          <TaskForm
            onAdd={addTask.mutate}
            isPending={addTask.isPending}
            currentView={currentView}
          />

          <div className="space-y-12 pb-20">
            <motion.div
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } },
              }}
              initial="hidden"
              animate="show"
            >
              <AnimatePresence mode="popLayout">
                {activeTasks.map((task) => (
                  <TaskItem
                    key={task._id}
                    task={task}
                    isSelected={selectedTaskId === task._id}
                    onSelect={setSelectedTaskId}
                    onToggle={toggleTask.mutate}
                  />
                ))}
              </AnimatePresence>
              {activeTasks.length === 0 && (
                <p className="text-sm text-neutral-400 dark:text-neutral-600 py-6">
                  All clear. Enjoy your day.
                </p>
              )}
            </motion.div>

            {completedTasks.length > 0 && (
              <div className="w-full">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-600 mb-4 px-3">
                  Completed
                </h2>
                <AnimatePresence mode="popLayout">
                  {completedTasks.map((task) => (
                    <TaskItem
                      key={task._id}
                      task={task}
                      isSelected={selectedTaskId === task._id}
                      onSelect={setSelectedTaskId}
                      onToggle={toggleTask.mutate}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 3. Right Detail Panel (Inspector) */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            onClose={() => setSelectedTaskId(null)}
            onUpdate={(id, updates) => updateTask.mutate({ id, updates })}
            onDelete={(id) => {
              deleteTask.mutate(id);
              setSelectedTaskId(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
