/**
 * Flags inlined as self-contained data URIs.
 *
 * Rendering flags via <image href="data:..."> (instead of flag-icons CSS
 * classes in a <foreignObject>) keeps the chart SVG fully self-contained, so
 * it rasterizes cleanly to PNG/canvas/video without tainting or missing art.
 * A curated set of ~45 common countries is bundled so imported country data
 * gets flags too; unknown entities render without one.
 */

import us from "flag-icons/flags/4x3/us.svg?raw";
import cn from "flag-icons/flags/4x3/cn.svg?raw";
import inFlag from "flag-icons/flags/4x3/in.svg?raw";
import id from "flag-icons/flags/4x3/id.svg?raw";
import br from "flag-icons/flags/4x3/br.svg?raw";
import pk from "flag-icons/flags/4x3/pk.svg?raw";
import ng from "flag-icons/flags/4x3/ng.svg?raw";
import bd from "flag-icons/flags/4x3/bd.svg?raw";
import ru from "flag-icons/flags/4x3/ru.svg?raw";
import jp from "flag-icons/flags/4x3/jp.svg?raw";
import mx from "flag-icons/flags/4x3/mx.svg?raw";
import de from "flag-icons/flags/4x3/de.svg?raw";
import gb from "flag-icons/flags/4x3/gb.svg?raw";
import fr from "flag-icons/flags/4x3/fr.svg?raw";
import it from "flag-icons/flags/4x3/it.svg?raw";
import ca from "flag-icons/flags/4x3/ca.svg?raw";
import kr from "flag-icons/flags/4x3/kr.svg?raw";
import es from "flag-icons/flags/4x3/es.svg?raw";
import au from "flag-icons/flags/4x3/au.svg?raw";
import sa from "flag-icons/flags/4x3/sa.svg?raw";
import tr from "flag-icons/flags/4x3/tr.svg?raw";
import ar from "flag-icons/flags/4x3/ar.svg?raw";
import za from "flag-icons/flags/4x3/za.svg?raw";
import eg from "flag-icons/flags/4x3/eg.svg?raw";
import ph from "flag-icons/flags/4x3/ph.svg?raw";
import vn from "flag-icons/flags/4x3/vn.svg?raw";
import th from "flag-icons/flags/4x3/th.svg?raw";
import ir from "flag-icons/flags/4x3/ir.svg?raw";
import pl from "flag-icons/flags/4x3/pl.svg?raw";
import ua from "flag-icons/flags/4x3/ua.svg?raw";
import nl from "flag-icons/flags/4x3/nl.svg?raw";
import be from "flag-icons/flags/4x3/be.svg?raw";
import se from "flag-icons/flags/4x3/se.svg?raw";
import no from "flag-icons/flags/4x3/no.svg?raw";
import ch from "flag-icons/flags/4x3/ch.svg?raw";
import at from "flag-icons/flags/4x3/at.svg?raw";
import gr from "flag-icons/flags/4x3/gr.svg?raw";
import pt from "flag-icons/flags/4x3/pt.svg?raw";
import ie from "flag-icons/flags/4x3/ie.svg?raw";
import nz from "flag-icons/flags/4x3/nz.svg?raw";
import sg from "flag-icons/flags/4x3/sg.svg?raw";
import my from "flag-icons/flags/4x3/my.svg?raw";
import co from "flag-icons/flags/4x3/co.svg?raw";
import cl from "flag-icons/flags/4x3/cl.svg?raw";
import pe from "flag-icons/flags/4x3/pe.svg?raw";

const RAW: Record<string, string> = {
  us, cn, in: inFlag, id, br, pk, ng, bd, ru, jp, mx, de, gb, fr, it,
  ca, kr, es, au, sa, tr, ar, za, eg, ph, vn, th, ir, pl, ua, nl, be,
  se, no, ch, at, gr, pt, ie, nz, sg, my, co, cl, pe,
};

const CACHE: Record<string, string> = {};

function toDataUri(svg: string): string {
  // base64 keeps it bulletproof for <image href> + canvas rasterization.
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

export function getFlagDataUri(iso: string | null | undefined): string | null {
  if (!iso) return null;
  if (CACHE[iso]) return CACHE[iso];
  const raw = RAW[iso];
  if (!raw) return null;
  return (CACHE[iso] = toDataUri(raw));
}
