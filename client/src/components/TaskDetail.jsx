import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, CalendarClock, Flag, Hash, Trash2, AlignLeft } from "lucide-react";

export default function TaskDetail({ task, onClose, onUpdate, onDelete }) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || "");

  // Keep state synced if you click a different task while the panel is open
  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes || "");
  }, [task]);

  const handleTitleBlur = () => {
    if (title.trim() !== task.title && title.trim() !== "") {
      onUpdate(task._id, { title: title.trim() });
    }
  };

  const handleNotesBlur = () => {
    if (notes !== (task.notes || "")) {
      onUpdate(task._id, { notes });
    }
  };

  return (
    <motion.aside
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="w-80 lg:w-[400px] border-l border-neutral-200 dark:border-neutral-800/50 bg-neutral-50/30 dark:bg-neutral-900/10 flex flex-col h-full shrink-0 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800/50">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Task Details
        </span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="w-full bg-transparent text-lg font-medium text-neutral-900 dark:text-white resize-none outline-none placeholder-neutral-400 leading-snug"
          rows={3}
          placeholder="Task title..."
        />

        {/* Properties Grid */}
        <div className="grid grid-cols-[100px_1fr] items-center gap-y-4 text-sm">
          <div className="flex items-center gap-2 text-neutral-500">
            <Hash className="w-4 h-4" /> Project
          </div>
          <div className="text-neutral-900 dark:text-neutral-200 font-medium">
            {task.project || "Inbox"}
          </div>

          <div className="flex items-center gap-2 text-neutral-500">
            <Flag className="w-4 h-4" /> Priority
          </div>
          <select
            value={task.priority}
            onChange={(e) => onUpdate(task._id, { priority: e.target.value })}
            className="bg-transparent text-neutral-900 dark:text-neutral-200 font-medium outline-none cursor-pointer -ml-1"
          >
            <option value="p1">High (P1)</option>
            <option value="p2">Medium (P2)</option>
            <option value="p3">Low (P3)</option>
            <option value="p4">None (P4)</option>
          </select>

          <div className="flex items-center gap-2 text-neutral-500">
            <CalendarClock className="w-4 h-4" /> Due
          </div>
          <div className="text-neutral-900 dark:text-neutral-200 font-medium">
            {task.dueDate
              ? new Date(task.dueDate).toLocaleDateString()
              : "No date"}
          </div>
        </div>

        {/* Notes Section */}
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800/50">
          <div className="flex items-center gap-2 text-sm text-neutral-500 mb-3 font-medium">
            <AlignLeft className="w-4 h-4" /> Notes
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            className="w-full bg-transparent text-sm text-neutral-800 dark:text-neutral-300 resize-y outline-none placeholder-neutral-400 dark:placeholder-neutral-600 min-h-[160px] leading-relaxed"
            placeholder="Add links, context, or sub-tasks here..."
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800/50 flex justify-end">
        <button
          onClick={() => onDelete(task._id)}
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-red-500 transition-colors cursor-pointer px-3 py-2 rounded-md hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4" /> Delete Task
        </button>
      </div>
    </motion.aside>
  );
}
