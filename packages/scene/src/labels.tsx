import { useFrame, useThree } from "@react-three/fiber";
import { type ReactNode, useCallback, useRef } from "react";
import { type Camera, type Object3D, Vector3 } from "three";

/**
 * Part numbers are plain DOM laid over the canvas, rendered by the page's own React root.
 *
 * Not drei `<Html>`: it creates one React root per label and unmounts it synchronously inside
 * R3F's commit. React rejects that ("Attempted to synchronously unmount a root while React was
 * already rendering"), and Strict Mode triggers it on every mount.
 *
 * The scene registers one anchor per part (`LabelAnchor`), the layer registers one element per
 * callout (`LabelLayer`), and `LabelProjector` moves each element onto its anchor every frame.
 */
export interface LabelRegistry {
  readonly anchors: Map<string, Object3D>;
  readonly elements: Map<string, HTMLElement>;
}

export function createLabelRegistry(): LabelRegistry {
  return { anchors: new Map(), elements: new Map() };
}

/** Ref callback that keeps `map.get(id)` pointing at the mounted instance. */
function useRegister<T>(map: Map<string, T>, id: string) {
  return useCallback(
    (instance: T | null) => {
      if (instance === null) {
        return;
      }
      map.set(id, instance);
      return () => {
        if (map.get(id) === instance) {
          map.delete(id);
        }
      };
    },
    [map, id],
  );
}

export interface LabelAnchorProps {
  readonly labels: LabelRegistry;
  readonly id: string;
  /** Local position, relative to the part. */
  readonly position: readonly [number, number, number];
}

/** An empty object in the scene, where a part's number is pinned. */
export function LabelAnchor({ labels, id, position }: LabelAnchorProps) {
  const ref = useRegister<Object3D>(labels.anchors, id);
  return <group ref={ref} position={[...position]} />;
}

const point = new Vector3();
/** In clip space: callouts right of this point open to the left, so they stay on the stage. */
const OPEN_LEFT_FROM = 0.3;
/** Margin, in CSS px, a label kept inside leaves to the stage's edge, clear of its frame. */
const EDGE = 28;
/** Labels sit between z-index 0 (far) and DEPTH_LAYERS (near), inside an isolated layer; raised ones above. */
const DEPTH_LAYERS = 50;
/** How often overlaps are settled when nothing moved, in ms: names open and close too. */
const OVERLAP_EVERY = 150;

const overlaps = (a: DOMRect, b: DOMRect) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/** Area, in px², that two boxes share. */
const shared = (a: DOMRect, b: DOMRect) =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
  Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

/** How much of a label is lost: under the other labels, or past the stage's edge. */
const lost = (box: DOMRect, others: readonly DOMRect[], stage: DOMRect) =>
  box.width * box.height -
  shared(box, stage) +
  others.reduce((sum, other) => sum + shared(box, other), 0);

/**
 * A part's callout that covers another one (its open name over a neighbour's balloon)
 * opens on its other side, when less of it is lost there. Then a label that yields (a
 * dimension's value) fades out while another label covers it, and comes back once it
 * is clear; one that yields to names only (a lane's name) stays among bare balloons. Measured on what each label shows, so a part's callout counts its name only
 * while the name is open.
 */
function settleOverlaps(labels: LabelRegistry) {
  const shown = [...labels.elements.values()].filter((e) => e.style.visibility === "visible");
  const boxOf = (e: HTMLElement) => (e.firstElementChild ?? e).getBoundingClientRect();
  const fixed = shown.filter((e) => e.dataset.yields === undefined);
  const blockers = fixed.map(boxOf);
  const stage = fixed[0]?.parentElement?.getBoundingClientRect();
  fixed.forEach((element, i) => {
    const box = blockers[i];
    if (!stage || !box) {
      return;
    }
    const others = blockers.filter((_, j) => j !== i);
    const here = lost(box, others, stage);
    if (here === 0) {
      return;
    }
    // The projector sets the side again whenever the label moves; until then, this holds.
    const side = element.dataset.side === "left" ? "left" : "right";
    element.dataset.side = side === "left" ? "right" : "left";
    const flipped = boxOf(element);
    if (lost(flipped, others, stage) < here) {
      blockers[i] = flipped;
    } else {
      element.dataset.side = side;
    }
  });
  for (const element of shown) {
    if (element.dataset.yields === undefined) {
      continue;
    }
    const box = boxOf(element);
    const toNames = element.dataset.yields === "names";
    const covered = blockers.some(
      (blocker, i) =>
        (!toNames || fixed[i]?.dataset.raised !== undefined) && overlaps(blocker, box),
    );
    element.style.opacity = covered ? "0" : "";
  }
}

export interface ScreenPosition {
  /** CSS pixels from the canvas' top left, rounded to half a pixel. */
  readonly x: number;
  readonly y: number;
  /** Stacking order: nearer is higher. */
  readonly z: number;
  /** Which way a callout opens: away from the stage's right edge. */
  readonly side: "left" | "right";
}

function toScreen(
  anchor: Object3D,
  camera: Camera,
  size: { width: number; height: number },
): ScreenPosition | null {
  anchor.getWorldPosition(point).project(camera);
  if (point.z < -1 || point.z > 1) {
    return null;
  }
  return {
    x: Math.round(((point.x + 1) / 2) * size.width * 2) / 2,
    y: Math.round(((1 - point.y) / 2) * size.height * 2) / 2,
    z: Math.round(((1 - point.z) / 2) * DEPTH_LAYERS),
    side: point.x > OPEN_LEFT_FROM ? "left" : "right",
  };
}

/**
 * Where every anchor stands on the canvas now, by id: what a film paints its labels at.
 * Anchors behind the camera are left out.
 */
export function projectAnchors(
  labels: LabelRegistry,
  camera: Camera,
  size: { width: number; height: number },
): Map<string, ScreenPosition> {
  camera.updateMatrixWorld();
  const projected = new Map<string, ScreenPosition>();
  for (const [id, anchor] of labels.anchors) {
    const screen = toScreen(anchor, camera, size);
    if (screen) {
      projected.set(id, screen);
    }
  }
  return projected;
}

/**
 * Inside the Canvas, after the parts: moves every label onto its anchor. Touches the DOM only
 * when the rounded position changes.
 */
export function LabelProjector({ labels }: { readonly labels: LabelRegistry }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const written = useRef(new WeakMap<HTMLElement, string>());
  const settled = useRef(0);

  useFrame(() => {
    camera.updateMatrixWorld();
    let moved = false;
    for (const [id, element] of labels.elements) {
      const anchor = labels.anchors.get(id);
      const screen = anchor ? toScreen(anchor, camera, size) : null;
      const key = screen ? `${screen.x},${screen.y},${screen.z},${screen.side}` : "hidden";
      if (written.current.get(element) === key) {
        continue;
      }
      written.current.set(element, key);
      moved = true;
      if (!screen) {
        element.style.visibility = "hidden";
        continue;
      }
      // The content anchors itself on this point (a callout centres its balloon on it).
      // A label that may leave its point slides back onto the stage, whole.
      const x =
        element.dataset.keepInside === undefined
          ? screen.x
          : Math.min(Math.max(screen.x, EDGE), size.width - element.offsetWidth - EDGE);
      element.style.transform = `translate3d(${x}px, ${screen.y}px, 0)`;
      element.dataset.side = screen.side;
      // A label that is talking (a part's open name) stands above every bare balloon.
      const raised = element.dataset.raised === undefined ? 0 : DEPTH_LAYERS + 1;
      element.style.zIndex = String(screen.z + raised);
      element.style.visibility = "visible";
    }
    const now = performance.now();
    if (moved || now - settled.current > OVERLAP_EVERY) {
      settled.current = now;
      settleOverlaps(labels);
    }
  });

  return null;
}

/** What the page shows at a part's anchor: a balloon, a name, a card. */
export interface StageCallout {
  /** Part id, matching its anchor. */
  readonly id: string;
  readonly content: ReactNode;
  /**
   * Slides along to stay whole on the stage: for a label naming a region, which
   * may leave its point. A part's callout never does: it must stay on its part.
   */
  readonly keepInside?: boolean;
  /**
   * Fades out while another label covers it. `any`: under any label, for a dimension's value,
   * the least needed. `names`: only under a part's open name, for a lane's name, which the
   * reader needs the whole run and which a bare balloon beside it must not hide.
   */
  readonly yields?: "any" | "names";
  /** Stands above the other labels whatever their depth: for a name being read. */
  readonly raised?: boolean;
}

function CalloutSlot({
  labels,
  id,
  keepInside,
  yields,
  raised,
  children,
}: {
  readonly labels: LabelRegistry;
  readonly id: string;
  readonly keepInside: boolean;
  readonly yields: "any" | "names" | undefined;
  readonly raised: boolean;
  readonly children: ReactNode;
}) {
  const ref = useRegister<HTMLElement>(labels.elements, id);
  return (
    <div
      ref={ref}
      data-keep-inside={keepInside || undefined}
      data-yields={yields}
      data-raised={raised || undefined}
      className="invisible absolute top-0 left-0 transition-opacity duration-200 will-change-transform motion-reduce:transition-none"
    >
      {children}
    </div>
  );
}

export interface LabelLayerProps {
  readonly labels: LabelRegistry;
  readonly callouts: readonly StageCallout[];
}

/**
 * Outside the Canvas, same box. The page decides what each callout says; the
 * scene only pins it to its part. Decorative: the bill of parts carries the
 * same names and descriptions, so the layer is hidden from assistive technology
 * and lets pointer events through to the canvas.
 */
export function LabelLayer({ labels, callouts }: LabelLayerProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 isolate overflow-hidden"
    >
      {callouts.map((callout) => (
        <CalloutSlot
          key={callout.id}
          labels={labels}
          id={callout.id}
          keepInside={callout.keepInside ?? false}
          yields={callout.yields}
          raised={callout.raised ?? false}
        >
          {callout.content}
        </CalloutSlot>
      ))}
    </div>
  );
}
