import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { type BufferGeometry, Color, EdgesGeometry, GreaterDepth, LessEqualDepth } from "three";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineSegments2 } from "three/addons/lines/webgpu/LineSegments2.js";
import { mix, uniform } from "three/tsl";
import { Line2NodeMaterial, type UniformNode } from "three/webgpu";
import { setBloom } from "./materials";
import { noRaycast, scene } from "./palette";

export interface EdgeStyle {
  readonly color: string;
  readonly opacity: number;
  /** In CSS px, whatever the zoom. */
  readonly width: number;
  /** Share of the colour that blooms: 0 for neutral edges. */
  readonly bloom: number;
}

export interface EdgesProps {
  /** The shape whose creases are drawn (sharper than `scene.edgeThreshold`). */
  readonly geometry: BufferGeometry;
  readonly rest: EdgeStyle;
  /**
   * The style when lit. Omitted, the last one given stays, so a part going out
   * fades from the colour it was lit in, not from white.
   */
  readonly lit?: EdgeStyle | undefined;
  /** 0 at rest, 1 lit; the owner animates it. Without it the edges stay at rest. */
  readonly level?: UniformNode<"float", number>;
  /**
   * `visible` draws the edges in front; `hidden` draws, dashed, only the edges
   * something stands in front of, as a drawing shows edges behind glass.
   */
  readonly pass?: "visible" | "hidden";
  readonly renderOrder?: number;
}

/**
 * A part's edges as drawn lines: constant pixel width, antialiased, optionally
 * dashed. Colour, opacity and glow blend between the rest and lit styles on the
 * GPU, so lighting up or going out never re-renders React or recompiles.
 */
export function Edges({
  geometry,
  rest,
  lit,
  level,
  pass = "visible",
  renderOrder = 2,
}: EdgesProps) {
  const hidden = pass === "hidden";
  const style = useMemo(
    () => ({
      restColor: uniform(new Color()),
      litColor: uniform(new Color()),
      restOpacity: uniform(1),
      litOpacity: uniform(1),
      restBloom: uniform(0),
      litBloom: uniform(0),
      /** Width is a material property, not a node: kept here and blended per frame. */
      litWidth: { value: 0 },
    }),
    [],
  );
  const amount = useMemo(() => level ?? uniform(0), [level]);

  const object = useMemo(() => {
    const creases = new EdgesGeometry(geometry, scene.edgeThreshold);
    const lines = new LineSegmentsGeometry().fromEdgesGeometry(creases);
    creases.dispose();
    const material = new Line2NodeMaterial({
      transparent: true,
      depthWrite: false,
      depthFunc: hidden ? GreaterDepth : LessEqualDepth,
      dashed: hidden,
      dashSize: scene.hiddenDash[0],
      gapSize: scene.hiddenDash[1],
    });
    // Alpha to coverage turns a translucent line into an MSAA screen-door stipple:
    // blend the line's own antialiased alpha instead.
    material.alphaToCoverage = false;
    material.colorNode = mix(style.restColor, style.litColor, amount);
    material.opacityNode = mix(style.restOpacity, style.litOpacity, amount);
    setBloom(material, mix(style.restBloom, style.litBloom, amount));
    const segments = new LineSegments2(lines, material);
    if (hidden) {
      segments.computeLineDistances();
    }
    segments.raycast = noRaycast;
    return segments;
  }, [geometry, hidden, style, amount]);

  useEffect(
    () => () => {
      object.geometry.dispose();
      object.material.dispose();
    },
    [object],
  );

  useEffect(() => {
    style.restColor.value.set(rest.color);
    style.restOpacity.value = rest.opacity;
    style.restBloom.value = rest.bloom;
    object.renderOrder = renderOrder;
  }, [style, object, rest, renderOrder]);

  useEffect(() => {
    if (!lit) {
      return;
    }
    style.litColor.value.set(lit.color);
    style.litOpacity.value = lit.opacity;
    style.litBloom.value = lit.bloom;
    style.litWidth.value = lit.width;
  }, [style, lit]);

  useFrame(() => {
    const to = style.litWidth.value || rest.width;
    object.material.linewidth = rest.width + (to - rest.width) * amount.value;
  });

  return <primitive object={object} />;
}
