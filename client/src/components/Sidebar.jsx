import React from "react";
import { CircleCheck, Calendar, Layers, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Sidebar({
  currentView,
  setCurrentView,
  counts,
  theme,
  toggleTheme,
}) {
  const navItems = [
    { id: "today", label: "Today", icon: Calendar, count: counts.today },
    { id: "habits", label: "Habits", icon: Layers, count: counts.habits },
  ];

  return (
    <aside className="w-64 border-r border-neutral-200 dark:border-neutral-800/50 bg-neutral-50/50 dark:bg-neutral-900/20 p-6 flex flex-col shrink-0 h-full transition-colors duration-500">
      <div className="flex items-center gap-2 mb-10 px-2 font-bold text-lg tracking-tight">
        <CircleCheck className="w-5 h-5 text-neutral-900 dark:text-white" />
        <span>TaskTrack</span>
      </div>

      <nav className="space-y-1.5 flex-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                isActive
                  ? "bg-white dark:bg-neutral-800 shadow-sm border border-neutral-200/60 dark:border-neutral-700/50 text-neutral-900 dark:text-white"
                  : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${isActive ? "text-neutral-700 dark:text-neutral-200" : "text-neutral-400 dark:text-neutral-500"}`}
                />
                {item.label}
              </span>
              <span className="text-xs opacity-60">{item.count}</span>
            </button>
          );
        })}
      </nav>

      {/* Dark Mode Toggle */}
      <button
        onClick={toggleTheme}
        className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors group cursor-pointer"
      >
        <div className="relative w-4 h-4 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={theme}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </button>
    </aside>
  );
}
