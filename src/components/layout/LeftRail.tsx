import { BarsIcon, LineIcon, AreaIcon, PieIcon, DonutIcon } from "@/components/ui/icons";

const TOOLS = [
  { id: "bar-race", label: "Bar Chart Race", icon: <BarsIcon />, active: true },
  { id: "bar", label: "Bar (soon)", icon: <BarsIcon />, active: false },
  { id: "line", label: "Line (soon)", icon: <LineIcon />, active: false },
  { id: "area", label: "Area (soon)", icon: <AreaIcon />, active: false },
  { id: "pie", label: "Pie (soon)", icon: <PieIcon />, active: false },
  { id: "donut", label: "Donut (soon)", icon: <DonutIcon />, active: false },
];

export function LeftRail() {
  return (
    <nav className="left-rail">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          title={t.label}
          className={`rail-btn ${t.active ? "is-active" : ""}`}
          disabled={!t.active}
        >
          {t.icon}
        </button>
      ))}
    </nav>
  );
}
