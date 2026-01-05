import { useState } from "react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description?: string;
  subtasks: { id: string; title: string; completed: boolean }[];
  assignedUsers: string[];
  completed: boolean;
  month: number;
  createdAt: string;
  updatedAt?: string;
}

interface YearWheelProps {
  selectedMonth: number | null;
  onMonthSelect: (month: number) => void;
  tasks: Task[];
}

const MONTHS = [
  { name: "Jan", fullName: "Januar", index: 0 },
  { name: "Feb", fullName: "Februar", index: 1 },
  { name: "Mar", fullName: "Marts", index: 2 },
  { name: "Apr", fullName: "April", index: 3 },
  { name: "Maj", fullName: "Maj", index: 4 },
  { name: "Jun", fullName: "Juni", index: 5 },
  { name: "Jul", fullName: "Juli", index: 6 },
  { name: "Aug", fullName: "August", index: 7 },
  { name: "Sep", fullName: "September", index: 8 },
  { name: "Okt", fullName: "Oktober", index: 9 },
  { name: "Nov", fullName: "November", index: 10 },
  { name: "Dec", fullName: "December", index: 11 },
];

const YearWheel = ({ selectedMonth, onMonthSelect, tasks }: YearWheelProps) => {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const getTaskCountForMonth = (monthIndex: number) => {
    return tasks.filter((t) => t.month === monthIndex).length;
  };

  const getCompletedTaskCountForMonth = (monthIndex: number) => {
    return tasks.filter((t) => t.month === monthIndex && t.completed).length;
  };

  // Calculate position on the wheel for each month
  const getMonthPosition = (index: number, radius: number) => {
    // Start from top (12 o'clock) and go clockwise
    const angle = (index * 30 - 90) * (Math.PI / 180);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  const currentMonth = new Date().getMonth();

  return (
    <div className="relative w-full aspect-square max-w-[500px] mx-auto">
      {/* SVG Wheel */}
      <svg viewBox="-160 -160 320 320" className="w-full h-full">
        {/* Outer circle */}
        <circle
          cx="0"
          cy="0"
          r="150"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-border"
        />

        {/* Inner circle */}
        <circle
          cx="0"
          cy="0"
          r="60"
          fill="currentColor"
          className="text-primary/10"
        />

        {/* Center text */}
        <text
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-2xl font-bold fill-primary"
        >
          {new Date().getFullYear()}
        </text>

        {/* Month segments */}
        {MONTHS.map((month, index) => {
          const startAngle = (index * 30 - 90) * (Math.PI / 180);
          const endAngle = ((index + 1) * 30 - 90) * (Math.PI / 180);
          
          const innerRadius = 65;
          const outerRadius = 145;

          const x1 = Math.cos(startAngle) * innerRadius;
          const y1 = Math.sin(startAngle) * innerRadius;
          const x2 = Math.cos(startAngle) * outerRadius;
          const y2 = Math.sin(startAngle) * outerRadius;
          const x3 = Math.cos(endAngle) * outerRadius;
          const y3 = Math.sin(endAngle) * outerRadius;
          const x4 = Math.cos(endAngle) * innerRadius;
          const y4 = Math.sin(endAngle) * innerRadius;

          const isSelected = selectedMonth === index;
          const isHovered = hoveredMonth === index;
          const isCurrent = currentMonth === index;
          const taskCount = getTaskCountForMonth(index);
          const completedCount = getCompletedTaskCountForMonth(index);

          const path = `
            M ${x1} ${y1}
            L ${x2} ${y2}
            A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3}
            L ${x4} ${y4}
            A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1}
            Z
          `;

          // Position for month label
          const labelRadius = 105;
          const labelAngle = ((index + 0.5) * 30 - 90) * (Math.PI / 180);
          const labelX = Math.cos(labelAngle) * labelRadius;
          const labelY = Math.sin(labelAngle) * labelRadius;

          // Position for task count badge
          const badgeRadius = 130;
          const badgeX = Math.cos(labelAngle) * badgeRadius;
          const badgeY = Math.sin(labelAngle) * badgeRadius;

          return (
            <g key={month.index}>
              {/* Month segment */}
              <path
                d={path}
                className={cn(
                  "cursor-pointer transition-all duration-200",
                  isSelected
                    ? "fill-primary stroke-primary"
                    : isHovered
                    ? "fill-primary/30 stroke-primary/50"
                    : isCurrent
                    ? "fill-primary/20 stroke-primary/30"
                    : "fill-muted stroke-border"
                )}
                strokeWidth="1"
                onClick={() => onMonthSelect(index)}
                onMouseEnter={() => setHoveredMonth(index)}
                onMouseLeave={() => setHoveredMonth(null)}
              />

              {/* Month label */}
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className={cn(
                  "text-xs font-medium pointer-events-none select-none",
                  isSelected ? "fill-primary-foreground" : "fill-foreground"
                )}
              >
                {month.name}
              </text>

              {/* Task count badge */}
              {taskCount > 0 && (
                <g>
                  <circle
                    cx={badgeX}
                    cy={badgeY}
                    r="10"
                    className={cn(
                      completedCount === taskCount
                        ? "fill-green-500"
                        : "fill-orange-500"
                    )}
                  />
                  <text
                    x={badgeX}
                    y={badgeY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[10px] font-bold fill-white pointer-events-none"
                  >
                    {taskCount}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Divider lines between months */}
        {MONTHS.map((_, index) => {
          const angle = (index * 30 - 90) * (Math.PI / 180);
          const x1 = Math.cos(angle) * 65;
          const y1 = Math.sin(angle) * 65;
          const x2 = Math.cos(angle) * 145;
          const y2 = Math.sin(angle) * 145;

          return (
            <line
              key={`line-${index}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth="1"
              className="text-border pointer-events-none"
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>Igangværende</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Færdig</span>
        </div>
      </div>
    </div>
  );
};

export default YearWheel;
