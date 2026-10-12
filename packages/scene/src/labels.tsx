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
/** Margin, in CSS px, a label kept inside leaves to the stage's edge. */
const EDGE = 8;
/** Labels sit between z-index 0 (far) and DEPTH_LAYERS (near), inside an isolated layer. */
const DEPTH_LAYERS = 50;

interface ScreenPosition {
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
 * Inside the Canvas, after the parts: moves every label onto its anchor. Touches the DOM only
 * when the rounded position changes.
 */
export function LabelProjector({ labels }: { readonly labels: LabelRegistry }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const written = useRef(new WeakMap<HTMLElement, string>());

  useFrame(() => {
    camera.updateMatrixWorld();
    for (const [id, element] of labels.elements) {
      const anchor = labels.anchors.get(id);
      const screen = anchor ? toScreen(anchor, camera, size) : null;
      const key = screen ? `${screen.x},${screen.y},${screen.z},${screen.side}` : "hidden";
      if (written.current.get(element) === key) {
        continue;
      }
      written.current.set(element, key);
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
      element.style.zIndex = String(screen.z);
      element.style.visibility = "visible";
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
}

function CalloutSlot({
  labels,
  id,
  keepInside,
  children,
}: {
  readonly labels: LabelRegistry;
  readonly id: string;
  readonly keepInside: boolean;
  readonly children: ReactNode;
}) {
  const ref = useRegister<HTMLElement>(labels.elements, id);
  return (
    <div
      ref={ref}
      data-keep-inside={keepInside || undefined}
      className="invisible absolute top-0 left-0 will-change-transform"
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
        >
          {callout.content}
        </CalloutSlot>
      ))}
    </div>
  );
}
