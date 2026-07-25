import React from "react";
import { Flame } from "lucide-react";
import { format, subDays } from "date-fns";
import { motion } from "framer-motion";

export default function ActivityHeatmap({ tasks }) {
  const days = Array.from({ length: 84 }).map((_, i) =>
    format(subDays(new Date(), 83 - i), "yyyy-MM-dd"),
  );

  const activityMap = {};
  tasks.forEach((task) => {
    if (task.history) {
      task.history.forEach((date) => {
        activityMap[date] = (activityMap[date] || 0) + 1;
      });
    }
  });

  const getColor = (count) => {
    if (count === 0) return "bg-neutral-100 dark:bg-neutral-900";
    if (count === 1) return "bg-neutral-300 dark:bg-neutral-800";
    if (count === 2) return "bg-neutral-500 dark:bg-neutral-600";
    return "bg-neutral-800 dark:bg-neutral-300";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-12"
    >
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-600 mb-4 flex items-center gap-2">
        <Flame className="w-3.5 h-3.5" />
        Activity History
      </h3>

      <div className="overflow-x-auto pb-2">
        <div className="grid grid-rows-7 grid-flow-col gap-1 w-max">
          {days.map((date) => (
            <div
              key={date}
              title={`${date}: ${activityMap[date] || 0} tasks`}
              className={`w-2.5 h-2.5 rounded-xs transition-colors duration-500 ${getColor(activityMap[date] || 0)}`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
