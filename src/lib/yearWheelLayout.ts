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

  // Ensure inputs are arrays
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeSections = Array.isArray(sections) ? sections : [];

  const positionedTasks: PositionedTask[] = safeTasks
    .filter((task) => task && task.start_dato && task.slut_dato && task.spor_id)
    .map((task) => {
    const startDate = new Date(task.start_dato);
    const endDate = new Date(task.slut_dato);
    
    const monthStart = startDate.getMonth();
    const monthEnd = endDate.getMonth();
    
    // Calculate angles (0 = January, 11 = December)
    // Start from top (-Math.PI/2) and go clockwise
    const startAngle = (monthStart / 12) * Math.PI * 2 - Math.PI / 2;
    const endAngle = (monthEnd / 12) * Math.PI * 2 - Math.PI / 2;

    const sectionIndex = safeSections.findIndex((s) => s && s.id === task.spor_id);
    const radius = baseRadius + (sectionIndex >= 0 ? sectionIndex : 0) * ringWidth;

    return {
      task,
      startAngle,
      endAngle,
      radius,
    };
  });

  return {
    positionedTasks,
    ringWidths: baseRadius + safeSections.length * ringWidth,
  };
}
