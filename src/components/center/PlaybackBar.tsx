import { useStudioStore, selectT01 } from "@/store/useStudioStore";
import { ASPECT_PRESETS } from "@/constants/aspects";
import { PlayIcon, PauseIcon, RestartIcon, LoopIcon } from "@/components/ui/icons";

const SPEEDS = [0.5, 1, 1.5, 2, 3];

function AspectGlyph({ ratio }: { ratio: number }) {
  const max = 18;
  const w = ratio >= 1 ? max : max * ratio;
  const h = ratio >= 1 ? max / ratio : max;
  return <span className="aspect-glyph" style={{ width: w, height: h }} />;
}

export function PlaybackBar() {
  const playback = useStudioStore((s) => s.playback);
  const t01 = useStudioStore(selectT01);
  const aspectId = useStudioStore((s) => s.aspectId);
  const setAspect = useStudioStore((s) => s.setAspect);
  const togglePlay = useStudioStore((s) => s.togglePlay);
  const seek01 = useStudioStore((s) => s.seek01);
  const setSpeed = useStudioStore((s) => s.setSpeed);
  const setDuration = useStudioStore((s) => s.setDuration);
  const toggleLoop = useStudioStore((s) => s.toggleLoop);
  const pause = useStudioStore((s) => s.pause);

  const restart = () => {
    pause();
    seek01(0);
  };

  return (
    <div className="playback">
      <div className="playback__aspects">
        {ASPECT_PRESETS.map((a) => (
          <button
            key={a.id}
            type="button"
            title={a.label}
            className={`aspect-btn ${aspectId === a.id ? "is-active" : ""}`}
            onClick={() => setAspect(a.id)}
          >
            <AspectGlyph ratio={a.ratio} />
          </button>
        ))}
      </div>

      <div className="playback__transport">
        <button type="button" className="icon-btn" onClick={restart} title="Restart">
          <RestartIcon size={16} />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--primary"
          onClick={togglePlay}
          title={playback.playing ? "Pause" : "Play"}
        >
          {playback.playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
        </button>
        <button
          type="button"
          className={`icon-btn ${playback.loop ? "is-active" : ""}`}
          onClick={toggleLoop}
          title="Loop"
        >
          <LoopIcon size={16} />
        </button>

        <input
          className="scrubber"
          type="range"
          min={0}
          max={1000}
          value={Math.round(t01 * 1000)}
          onChange={(e) => seek01(Number(e.target.value) / 1000)}
          style={{
            background: `linear-gradient(to right, var(--accent) ${t01 * 100}%, var(--track) ${t01 * 100}%)`,
          }}
        />

        <span className="playback__time">
          {playback.time.toFixed(1)}s
        </span>
        <span className="playback__sep">/</span>
        <input
          className="duration-input"
          type="number"
          min={1}
          max={120}
          step={0.5}
          value={playback.duration}
          onChange={(e) => setDuration(Number(e.target.value) || 1)}
          title="Total duration (seconds)"
        />

        <div className="select select--sm">
          <select value={playback.speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
