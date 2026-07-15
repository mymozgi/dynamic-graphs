import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { usePlaybackClock } from "@/hooks/usePlaybackClock";
import { useStudioStore } from "@/store/useStudioStore";

export default function App() {
  const theme = useStudioStore((s) => s.theme);
  usePlaybackClock();

  // Reflect theme on <html> so CSS variables switch.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return <AppShell />;
}
