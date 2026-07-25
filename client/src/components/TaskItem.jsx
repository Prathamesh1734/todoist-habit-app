import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CircleCheck,
  Circle,
  Flame,
  Trash2,
  CalendarClock,
} from "lucide-react";
import * as chrono from "chrono-node";
import { format, isToday, isTomorrow, isPast, startOfDay } from "date-fns";

const PRIORITY_COLORS = {
  p1: "text-neutral-900 dark:text-white fill-neutral-200 dark:fill-neutral-800",
  p2: "text-neutral-500 dark:text-neutral-400 fill-neutral-100 dark:fill-neutral-900",
  p3: "text-neutral-300 dark:text-neutral-600 fill-neutral-50 dark:fill-neutral-900/50",
  p4: "text-neutral-200 dark:text-neutral-800 fill-transparent",
};

const formatDueDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "MMM d");
};

export default function TaskItem({ task, onToggle, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const isOverdue =
    task.dueDate &&
    isPast(startOfDay(new Date(task.dueDate))) &&
    !isToday(new Date(task.dueDate));

  const submitEdit = () => {
    if (!editTitle.trim()) {
      setIsEditing(false);
      return;
    }

    let finalTitle = editTitle;
    let dueDate = task.dueDate;
    const parsed = chrono.parse(editTitle);

    if (parsed.length > 0) {
      dueDate = parsed[0].start.date();
      finalTitle = editTitle.replace(parsed[0].text, "").trim();
    }

    if (finalTitle !== task.title || dueDate !== task.dueDate) {
      onUpdate(task._id, { title: finalTitle || editTitle, dueDate });
    }
    setIsEditing(false);
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      layout
      variants={itemVariants}
      whileHover={{ x: 4 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
      className={`group flex items-center justify-between py-2.5 transition-opacity ${
        task.isCompleted ? "opacity-30 grayscale" : "opacity-100"
      }`}
    >
      <div className="flex items-start gap-3 flex-1 px-2">
        <button
          onClick={() => onToggle(task._id)}
          className="mt-0.75 shrink-0 focus:outline-none cursor-pointer transition-transform active:scale-75"
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
          {isEditing ? (
            <input
              autoFocus
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={submitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitEdit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              className="bg-transparent border-b border-neutral-300 dark:border-neutral-700 px-1 py-0.5 text-sm text-neutral-900 dark:text-white outline-none w-full"
            />
          ) : (
            <span
              onDoubleClick={() => !task.isCompleted && setIsEditing(true)}
              className={`text-sm select-none cursor-text w-full transition-colors ${
                task.isCompleted
                  ? "line-through text-neutral-400 dark:text-neutral-600"
                  : "text-neutral-800 dark:text-neutral-200"
              }`}
            >
              {task.title}
            </span>
          )}

          {task.dueDate && !isEditing && (
            <div
              className={`flex items-center gap-1 mt-1 text-[10px] font-medium ${
                task.isCompleted
                  ? "text-neutral-400 dark:text-neutral-700"
                  : isOverdue
                    ? "text-neutral-600 dark:text-neutral-400"
                    : "text-neutral-400 dark:text-neutral-600"
              }`}
            >
              <CalendarClock className="w-3 h-3" />
              {formatDueDate(task.dueDate)}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0 px-2">
        {task.isRecurring && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-400 dark:text-neutral-600">
            <Flame className="w-3.5 h-3.5" />
            <span>{task.currentStreak}</span>
          </div>
        )}
        <button
          onClick={() => onDelete(task._id)}
          className="text-neutral-300 dark:text-neutral-700 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer focus:outline-none"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
