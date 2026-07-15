import { useState } from "react";
import { CanvasStage } from "./CanvasStage";
import { PlaybackBar } from "./PlaybackBar";
import { DataPanel } from "@/components/data/DataPanel";
import { BarsIcon, LineIcon } from "@/components/ui/icons";

type Tab = "preview" | "data";

export function CenterPanel() {
  const [tab, setTab] = useState<Tab>("preview");

  return (
    <div className="center">
      <div className="center__tabs">
        <button
          type="button"
          className={`tab ${tab === "preview" ? "is-active" : ""}`}
          onClick={() => setTab("preview")}
        >
          <LineIcon size={15} /> Preview
        </button>
        <button
          type="button"
          className={`tab ${tab === "data" ? "is-active" : ""}`}
          onClick={() => setTab("data")}
        >
          <BarsIcon size={15} /> Data
        </button>
      </div>

      <div className="center__body">
        {tab === "preview" ? <CanvasStage /> : <DataPanel />}
      </div>

      <PlaybackBar />
    </div>
  );
}
