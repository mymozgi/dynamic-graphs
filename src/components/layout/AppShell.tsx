import { LeftRail } from "./LeftRail";
import { CenterPanel } from "@/components/center/CenterPanel";
import { Inspector } from "@/components/inspector/Inspector";

export function AppShell() {
  return (
    <div className="app-shell">
      <LeftRail />
      <CenterPanel />
      <Inspector />
    </div>
  );
}
