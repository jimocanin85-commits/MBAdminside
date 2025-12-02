import React, { useRef, useEffect } from "react";
import { Task } from "@/types/task";
import { Section } from "@/types/section";
import { computeYearWheelPositions, PositionedTask } from "@/lib/yearWheelLayout";
import { getMonthAbbreviation } from "@/lib/dateHelpers";

interface YearWheelProps {
  tasks: Task[];
  sections: Section[];
  year: number;
  onTaskClick: (task: Task) => void;
}

export default function YearWheel({ tasks, sections, year, onTaskClick }: YearWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const positionedTasksRef = useRef<PositionedTask[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size - ensure minimum size
    const size = Math.max(Math.min(window.innerWidth - 40, 800), 400);
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Ensure tasks and sections are arrays
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeSections = Array.isArray(sections) ? sections : [];
    
    const { positionedTasks, ringWidths } = computeYearWheelPositions(safeTasks, safeSections);
    positionedTasksRef.current = positionedTasks;

    // Draw background circle
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringWidths + 20, 0, Math.PI * 2);
    ctx.stroke();

    // Draw months
    const months = Array.from({ length: 12 }, (_, i) => getMonthAbbreviation(i));
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#374151";

    months.forEach((m, i) => {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const radius = ringWidths + 50;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      ctx.fillText(m, x, y);
    });

    // Draw sections (rings) - only if sections exist
    if (sections && sections.length > 0) {
      sections.forEach((section, index) => {
        const baseRadius = 120;
        const ringWidth = 40;
        const radius = baseRadius + index * ringWidth;
        
        ctx.strokeStyle = section.farve || "#3b82f6";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw section label
        ctx.font = "12px Arial";
        ctx.fillStyle = section.farve || "#3b82f6";
        ctx.fillText(section.navn, centerX, centerY - radius - 10);
      });
    }

    // Draw tasks - only if tasks exist
    if (positionedTasks && positionedTasks.length > 0) {
      positionedTasks.forEach((p) => {
        if (!p.task) return;
        
        ctx.beginPath();
        ctx.strokeStyle = p.task.farve || "#3b82f6";
        ctx.lineWidth = 18;
        ctx.lineCap = "round";

        ctx.arc(centerX, centerY, p.radius, p.startAngle, p.endAngle);
        ctx.stroke();

        // Store coords in task for click detection
        if (p.task) {
          p.task._coords = {
            startAngle: p.startAngle,
            endAngle: p.endAngle,
            radius: p.radius,
          };
        }
      });
    }
  }, [tasks, sections, year]);

  // Click detector
  const handleClick = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    if (!positionedTasksRef.current || positionedTasksRef.current.length === 0) {
      return;
    }

    for (const p of positionedTasksRef.current) {
      if (!p.task) continue;
      const coords = p.task._coords;
      if (!coords) continue;

      const dx = x - centerX;
      const dy = y - centerY;
      const angle = Math.atan2(dy, dx);
      
      // Normalize angle to 0-2π
      let normalizedAngle = angle;
      if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
      
      let startAngle = coords.startAngle;
      let endAngle = coords.endAngle;
      if (startAngle < 0) startAngle += Math.PI * 2;
      if (endAngle < 0) endAngle += Math.PI * 2;

      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if click is within ring and angle range
      const ringTolerance = 20;
      if (
        dist >= coords.radius - ringTolerance &&
        dist <= coords.radius + ringTolerance &&
        ((normalizedAngle >= startAngle && normalizedAngle <= endAngle) ||
         (startAngle > endAngle && (normalizedAngle >= startAngle || normalizedAngle <= endAngle)))
      ) {
        onTaskClick(p.task);
        return;
      }
    }
  };

  return (
    <div className="flex justify-center items-center p-4 overflow-auto">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="border rounded-lg shadow-lg cursor-pointer"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}
