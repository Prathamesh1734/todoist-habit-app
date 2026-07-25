import React, { useState } from "react";
import { Plus, Flame, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as chrono from "chrono-node";

export default function TaskForm({ onAdd, isPending, currentView }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("p4");
  const [isRecurring, setIsRecurring] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    let finalTitle = title;
    let dueDate = null;
    const parsedResults = chrono.parse(title);

    if (parsedResults.length > 0) {
      dueDate = parsedResults[0].start.date();
      finalTitle = title.replace(parsedResults[0].text, "").trim();
    }

    onAdd({ title: finalTitle || title, priority, isRecurring, dueDate });
    setTitle("");
    setPriority("p4");
    setIsRecurring(currentView === "habits");
    setIsFocused(false);
  };

  // Only show the clutter if the user is typing or clicked inside
  const showControls = isFocused || title.length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-10 transition-colors"
    >
      <div className="flex items-center gap-3 px-2">
        <Plus
          className={`w-5 h-5 transition-colors duration-300 ${isFocused ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-300 dark:text-neutral-700"}`}
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            // Delay blur slightly to allow clicking the buttons
            if (!e.relatedTarget) setTimeout(() => setIsFocused(false), 150);
          }}
          placeholder={
            currentView === "habits"
              ? "Build a new habit..."
              : "What needs to be done?"
          }
          className="w-full bg-transparent text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none py-2"
          disabled={isPending}
        />
      </div>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: 12 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="flex items-center justify-between px-2 overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="bg-transparent text-xs text-neutral-500 dark:text-neutral-400 rounded-md px-2 py-1 border border-neutral-200 dark:border-neutral-800 focus:outline-none cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
              >
                <option value="p1">P1 (High)</option>
                <option value="p2">P2 (Medium)</option>
                <option value="p3">P3 (Low)</option>
                <option value="p4">P4 (None)</option>
              </select>

              <button
                type="button"
                onClick={() => setIsRecurring(!isRecurring)}
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                  isRecurring
                    ? "bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-neutral-900"
                    : "bg-transparent border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                }`}
              >
                <Flame className="w-3 h-3" /> Habit
              </button>
            </div>

            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-30 text-white dark:text-neutral-900 text-xs font-medium px-4 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Add"
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
