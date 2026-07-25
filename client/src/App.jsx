import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { format, isPast, isToday, startOfDay } from "date-fns";

import Sidebar from "./components/Sidebar";
import TaskForm from "./components/TaskForm";
import TaskItem from "./components/TaskItem";
import ActivityHeatmap from "./components/ActivityHeatmap";

const API_URL = "http://localhost:5000/api/tasks";

export default function App() {
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState("today");

  // Theme State (Defaults to dark)
  const [theme, setTheme] = useState("dark");
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

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

  const viewTasks = tasks.filter((t) =>
    currentView === "habits" ? t.isRecurring : true,
  );

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

  // Framer Motion container variants for staggered list loading
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  return (
    <div className={`${theme}`}>
      {/* App Wrapper */}
      <div className="flex h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans antialiased transition-colors duration-500">
        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          theme={theme}
          toggleTheme={toggleTheme}
          counts={{
            today: tasks.filter((t) => !t.isCompleted).length,
            habits: tasks.filter((t) => t.isRecurring && !t.isCompleted).length,
          }}
        />

        <main className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto px-10 py-16">
          <header className="mb-12">
            <motion.h1 layout className="text-3xl font-bold tracking-tight">
              {currentView === "today" ? "Today" : "Habits"}
            </motion.h1>
            <motion.p
              layout
              className="text-neutral-500 dark:text-neutral-400 text-sm mt-1"
            >
              {currentView === "today"
                ? "What are you working on?"
                : "Your recurring routines"}
            </motion.p>
          </header>

          {currentView === "habits" && <ActivityHeatmap tasks={tasks} />}

          <TaskForm
            onAdd={addTask.mutate}
            isPending={addTask.isPending}
            currentView={currentView}
          />

          <div className="space-y-12">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="w-full"
            >
              <AnimatePresence mode="popLayout">
                {activeTasks.map((task) => (
                  <TaskItem
                    key={task._id}
                    task={task}
                    onToggle={toggleTask.mutate}
                    onUpdate={(id, updates) =>
                      updateTask.mutate({ id, updates })
                    }
                    onDelete={deleteTask.mutate}
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
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-600 mb-4 px-2">
                  Completed
                </h2>
                <AnimatePresence mode="popLayout">
                  {completedTasks.map((task) => (
                    <TaskItem
                      key={task._id}
                      task={task}
                      onToggle={toggleTask.mutate}
                      onUpdate={(id, updates) =>
                        updateTask.mutate({ id, updates })
                      }
                      onDelete={deleteTask.mutate}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
