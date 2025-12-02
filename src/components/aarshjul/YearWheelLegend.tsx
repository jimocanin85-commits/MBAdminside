import { Section } from "@/types/section";
import { Card, CardContent } from "@/components/ui/card";

interface YearWheelLegendProps {
  sections: Section[];
}

export default function YearWheelLegend({ sections }: YearWheelLegendProps) {
  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3">Forklaring</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sections.map((section) => (
            <div key={section.id} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: section.farve }}
              />
              <span className="text-sm">{section.navn}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Klik på en opgave i årshjulet for at se detaljer
        </p>
      </CardContent>
    </Card>
  );
}
