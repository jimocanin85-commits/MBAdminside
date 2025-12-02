import { Task } from "@/types/task";
import { Section } from "@/types/section";

export interface PositionedTask {
  task: Task;
  startAngle: number;
  endAngle: number;
  radius: number;
}

export function computeYearWheelPositions(
  tasks: Task[],
  sections: Section[]
): { positionedTasks: PositionedTask[]; ringWidths: number } {
  const baseRadius = 120;
  const ringWidth = 40;

  const positionedTasks: PositionedTask[] = tasks.map((task) => {
    const startDate = new Date(task.start_dato);
    const endDate = new Date(task.slut_dato);
    
    const monthStart = startDate.getMonth();
    const monthEnd = endDate.getMonth();
    
    // Calculate angles (0 = January, 11 = December)
    // Start from top (-Math.PI/2) and go clockwise
    const startAngle = (monthStart / 12) * Math.PI * 2 - Math.PI / 2;
    const endAngle = (monthEnd / 12) * Math.PI * 2 - Math.PI / 2;

    const sectionIndex = sections.findIndex((s) => s.id === task.spor_id);
    const radius = baseRadius + sectionIndex * ringWidth;

    return {
      task,
      startAngle,
      endAngle,
      radius,
    };
  });

  return {
    positionedTasks,
    ringWidths: baseRadius + sections.length * ringWidth,
  };
}
