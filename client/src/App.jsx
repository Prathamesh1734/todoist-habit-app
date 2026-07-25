import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  Flame,
  Calendar,
  Plus,
  Layers,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = "http://localhost:5000/api/tasks";

const PRIORITY_COLORS = {
  p1: "text-red-500 fill-red-500/10",
  p2: "text-orange-500 fill-orange-500/10",
  p3: "text-blue-500 fill-blue-500/10",
  p4: "text-gray-400 fill-transparent",
};

function App() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("p4");
  const [isRecurring, setIsRecurring] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("network error");
      return res.json();
    },
  });

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

  const toggleMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API_URL}/${id}/toggle`, { method: "PATCH" });
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previousTask = queryClient.getQueryData(["tasks"]);

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
      return { previousTask };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(["tasks"], context.previousTask); // rollback on error
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] }); //sync w server
    },
  });

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTaskMutation.mutate({ title, priority, isRecurring });
  };

  const pendingTasks = tasks.filter((t) => !t.isCompleted).length;
  const recurringTasks = tasks.filter((t) => t.isRecurring).length;

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans antialised selection:bg-red-500/30">
      {/* sidebar */}
      <aside className="w-64 border-r border-zinc-800 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8 px-2 text-red-500 font-bold text-xl tracking-tight">
          <CheckCircle2 className="w-6 h-6" />
          <span>TaskTrack</span>
        </div>
        <nav className="space-y-1">
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900 text-zinc-100 font-medium text-sm transition-colors">
            <span className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-red-400" /> Today
            </span>
            <span className="text-xs text-zinc-500">{pendingTasks}</span>
          </button>
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-colors text-sm">
            <span className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-blue-400" /> Habits
            </span>
            <span className="text-xs text-zinc-500">{recurringTasks}</span>
          </button>
        </nav>
      </aside>
      {/* main content */}
      <main className="flex-1 overflow-y-auto max-w-3xl mx-auto px-8 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Today</h1>
          <p className="text-zinc-500 text-sm mt-1">what are u working on?</p>
        </header>

        {/* task creation form */}
        <form
          onSubmit={handleAddTask}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-8 focus-within:border-zinc-700 transition-colors shadow-sm"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none mb-3"
            disabled={addTaskMutation.isPending}
          />
          <div></div>
        </form>
      </main>
    </div>
  );
}

export default App;
