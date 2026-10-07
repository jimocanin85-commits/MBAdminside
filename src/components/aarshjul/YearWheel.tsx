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
    <div className="mx-auto w-full max-w-[520px]">
      {/* SVG Wheel */}
      <svg
        viewBox="-160 -160 320 320"
        className="aspect-square w-full"
        role="group"
        aria-label="Årshjul - vælg en måned for at se dens opgaver"
      >
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
          className="fill-primary"
        />

        {/* Center text */}
        <text
          x="0"
          y="-4"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-primary-foreground font-display text-[34px] font-bold"
        >
          {new Date().getFullYear()}
        </text>
        <text
          x="0"
          y="20"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-primary-foreground text-[9px] font-medium"
        >
          {tasks.length} {tasks.length === 1 ? "opgave" : "opgaver"}
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
          const labelRadius = 98;
          const labelAngle = ((index + 0.5) * 30 - 90) * (Math.PI / 180);
          const labelX = Math.cos(labelAngle) * labelRadius;
          const labelY = Math.sin(labelAngle) * labelRadius;

          // Position for task count badge
          const badgeRadius = 129;
          const badgeX = Math.cos(labelAngle) * badgeRadius;
          const badgeY = Math.sin(labelAngle) * badgeRadius;

          return (
            <g key={month.index}>
              {/* Month segment */}
              <path
                d={path}
                className={cn(
                  "cursor-pointer outline-none transition-colors duration-200 focus-visible:stroke-foreground focus-visible:[stroke-width:3]",
                  isSelected
                    ? "fill-foreground stroke-foreground"
                    : isHovered
                    ? "fill-primary/25 stroke-primary/50"
                    : isCurrent
                    ? "fill-primary/15 stroke-primary/40"
                    : "fill-muted stroke-border"
                )}
                strokeWidth="1"
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${month.fullName}: ${taskCount} ${taskCount === 1 ? "opgave" : "opgaver"}, ${completedCount} færdige`}
                onClick={() => onMonthSelect(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onMonthSelect(index);
                  }
                }}
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
                  "text-xs font-semibold uppercase pointer-events-none select-none",
                  isSelected ? "fill-background" : "fill-foreground"
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
                    strokeWidth="1.5"
                    className={cn(
                      "pointer-events-none",
                      completedCount === taskCount
                        ? "fill-success stroke-success"
                        : "fill-card stroke-primary"
                    )}
                  />
                  <text
                    x={badgeX}
                    y={badgeY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={cn(
                      "text-[10px] font-bold pointer-events-none",
                      completedCount === taskCount ? "fill-success-foreground" : "fill-primary"
                    )}
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
      <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-3.5 rounded-full border-2 border-primary bg-card" />
          <span>Åbne opgaver</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-3.5 rounded-full bg-success" />
          <span>Alle færdige</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-3.5 rounded-full bg-foreground" />
          <span>Valgt måned</span>
        </div>
      </div>
    </div>
  );
};

export default YearWheel;
