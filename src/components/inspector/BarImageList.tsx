import { useRef, useState } from "react";
import { useStudioStore } from "@/store/useStudioStore";
import { resolveIso } from "@/data/countries";
import { getFlagDataUri } from "@/data/flagRegistry";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(blob);
  });
}

/** Per-entity custom images: upload a file or paste from the clipboard.
 *  The image renders inside the bar in place of the auto flag. */
export function BarImageList() {
  const names = useStudioStore((s) => s.engine.names);
  const barImages = useStudioStore((s) => s.config.barImages);
  const setBarImage = useStudioStore((s) => s.setBarImage);
  const clearBarImage = useStudioStore((s) => s.clearBarImage);

  const fileRef = useRef<HTMLInputElement>(null);
  const targetName = useRef<string>("");
  const [note, setNote] = useState<string | null>(null);

  const openFile = (name: string) => {
    targetName.current = name;
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setBarImage(targetName.current, await blobToDataUrl(file));
    e.target.value = "";
  };

  const paste = async (name: string) => {
    setNote(null);
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) {
          setBarImage(name, await blobToDataUrl(await item.getType(type)));
          return;
        }
      }
      setNote("No image in clipboard — copy an image first, or use Upload.");
    } catch {
      setNote("Clipboard paste unavailable here — use Upload.");
    }
  };

  return (
    <div className="image-list">
      <div className="color-list__head">
        <span>Bar Images</span>
      </div>
      <div className="color-list__scroll">
        {names.map((name) => {
          const custom = barImages[name];
          const preview = custom ?? getFlagDataUri(resolveIso(name));
          return (
            <div key={name} className="image-row">
              <button
                type="button"
                className="image-thumb"
                onClick={() => openFile(name)}
                aria-label={`Upload image for ${name}`}
                title="Upload image"
              >
                {preview ? <img src={preview} alt="" /> : <span aria-hidden="true">+</span>}
              </button>
              <span className="image-row__name">{name}</span>
              <button
                type="button"
                className="mini-btn"
                onClick={() => paste(name)}
                aria-label={`Paste image for ${name}`}
              >
                Paste
              </button>
              {custom && (
                <button
                  type="button"
                  className="mini-btn mini-btn--danger"
                  aria-label={`Remove image for ${name}`}
                  title="Remove image"
                  onClick={() => clearBarImage(name)}
                >
                  <span aria-hidden="true">×</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
      {note && <p className="image-list__note">{note}</p>}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
    </div>
  );
}
