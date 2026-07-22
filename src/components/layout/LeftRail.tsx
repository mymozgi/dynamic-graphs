import type { ReactNode } from "react";
import { useStudioStore } from "@/store/useStudioStore";
import { BarsIcon, LineIcon, AreaIcon, PieIcon, DonutIcon } from "@/components/ui/icons";
import type { ChartConfig } from "@/engine/types";

type ChartType = ChartConfig["chartType"];

interface Tool {
  id: string;
  label: string;
  icon: ReactNode;
  /** When set, the button selects this chart type; otherwise it's "soon". */
  type?: ChartType;
}

const TOOLS: Tool[] = [
  { id: "barRace", label: "Bar Chart Race", icon: <BarsIcon />, type: "barRace" },
  { id: "line", label: "Line Chart", icon: <LineIcon />, type: "line" },
  { id: "area", label: "Area (soon)", icon: <AreaIcon /> },
  { id: "pie", label: "Pie (soon)", icon: <PieIcon /> },
  { id: "donut", label: "Donut (soon)", icon: <DonutIcon /> },
];

export function LeftRail() {
  const chartType = useStudioStore((s) => s.config.chartType);
  const update = useStudioStore((s) => s.updateConfig);

  return (
    <nav className="left-rail">
      {TOOLS.map((t) => {
        const active = t.type != null && chartType === t.type;
        return (
          <button
            key={t.id}
            type="button"
            title={t.label}
            className={`rail-btn ${active ? "is-active" : ""}`}
            disabled={t.type == null}
            onClick={t.type != null ? () => update({ chartType: t.type }) : undefined}
          >
            {t.icon}
          </button>
        );
      })}
    </nav>
  );
}
