import React from "react";
import { motion } from "framer-motion";
import { CircleCheck, Circle, Flame, CalendarClock } from "lucide-react";

const PRIORITY_COLORS = {
  p1: "text-neutral-900 dark:text-white fill-neutral-200 dark:fill-neutral-800",
  p2: "text-neutral-500 dark:text-neutral-400 fill-neutral-100 dark:fill-neutral-900",
  p3: "text-neutral-300 dark:text-neutral-600 fill-neutral-50 dark:fill-neutral-900/50",
  p4: "text-neutral-200 dark:text-neutral-800 fill-transparent",
};

export default function TaskItem({ task, isSelected, onSelect, onToggle }) {
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      layout
      variants={itemVariants}
      onClick={() => onSelect(task._id)}
      className={`group flex items-center justify-between py-3 px-3 -mx-3 rounded-xl transition-all cursor-pointer ${
        isSelected
          ? "bg-neutral-100 dark:bg-neutral-800/50 shadow-sm"
          : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
      } ${task.isCompleted ? "opacity-40 grayscale" : "opacity-100"}`}
    >
      <div className="flex items-start gap-3 flex-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(task._id);
          }}
          className="mt-[3px] shrink-0 focus:outline-none cursor-pointer transition-transform active:scale-75"
        >
          {task.isCompleted ? (
            <CircleCheck className="w-4 h-4 text-neutral-400 dark:text-neutral-600" />
          ) : (
            <Circle
              className={`w-4 h-4 transition-colors ${PRIORITY_COLORS[task.priority]} hover:fill-neutral-200 dark:hover:fill-neutral-700`}
            />
          )}
        </button>

        <div className="flex flex-col w-full">
          <span
            className={`text-sm select-none w-full transition-colors ${
              task.isCompleted
                ? "line-through text-neutral-400 dark:text-neutral-600"
                : "text-neutral-800 dark:text-neutral-200"
            }`}
          >
            {task.title}
          </span>

          <div className="flex items-center gap-3 mt-1.5">
            {task.dueDate && (
              <div className="flex items-center gap-1 text-[10px] font-medium text-neutral-400 dark:text-neutral-600">
                <CalendarClock className="w-3 h-3" /> Due date set
              </div>
            )}
            {task.project && task.project !== "Inbox" && (
              <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 bg-neutral-200/50 dark:bg-neutral-800 px-1.5 py-0.5 rounded-sm">
                {task.project}
              </span>
            )}
          </div>
        </div>
      </div>

      {task.isRecurring && (
        <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-400 dark:text-neutral-600 px-2">
          <Flame className="w-3.5 h-3.5" />
          <span>{task.currentStreak}</span>
        </div>
      )}
    </motion.div>
  );
}
