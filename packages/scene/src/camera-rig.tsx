import type { Vec3 } from "@nightprint/engine";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { MathUtils, OrthographicCamera, TOUCH, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { scene } from "./palette";

const DISTANCE = 30;
/**
 * The first framing starts this much wider, and the camera settles onto the machine
 * while the stage fades in. Above the orbit's minimum zoom, so nothing clamps it.
 */
const ARRIVAL_ZOOM = 0.9;
const MARGIN = 1.08;
/** Highest point drawn above the plate, balloons included. */
const TOP = 1.6;
const ISO = new Vector3(...scene.isoDirection).normalize();
const ISO_AZIMUTH = Math.atan2(ISO.x, ISO.z);
const ISO_POLAR = Math.acos(ISO.y);

interface Fit {
  /** Point the camera orbits: the plate centre, shifted so the drawing is centred on screen. */
  readonly target: Vector3;
  readonly zoom: number;
}

/** Isometric framing of the plate: where to aim and how far to zoom so the whole machine fits. */
function fitIsometric(
  camera: OrthographicCamera,
  size: readonly [number, number],
  center: readonly [number, number],
  viewport: { readonly width: number; readonly height: number },
): Fit {
  const target = new Vector3(center[0], 0, center[1]);
  camera.position.copy(target).addScaledVector(ISO, DISTANCE);
  camera.lookAt(target);
  camera.updateMatrixWorld();

  const [w, d] = size;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const corner = new Vector3();
  for (const x of [-w / 2, w / 2]) {
    for (const z of [-d / 2, d / 2]) {
      for (const y of [0, TOP]) {
        corner.set(center[0] + x, y, center[1] + z).applyMatrix4(camera.matrixWorldInverse);
        minX = Math.min(minX, corner.x);
        maxX = Math.max(maxX, corner.x);
        minY = Math.min(minY, corner.y);
        maxY = Math.max(maxY, corner.y);
      }
    }
  }
  // Centre the projected bounds, not the plate centre: the box is taller on one side.
  const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  target.addScaledVector(right, (minX + maxX) / 2).addScaledVector(up, (minY + maxY) / 2);
  const zoom = Math.min(
    viewport.width / ((maxX - minX) * MARGIN),
    viewport.height / ((maxY - minY) * MARGIN),
  );
  return { target, zoom };
}

export interface CameraRigProps {
  readonly size: readonly [number, number];
  readonly center: readonly [number, number];
  /** What the current step is about, in world space; null for the whole machine. */
  readonly follow: Vec3 | null;
  readonly reducedMotion: boolean;
  /**
   * Room kept clear along the canvas' edges, in CSS px, for what is laid over it: text
   * on the left, labels on the right, a ruler or a title on top. The machine is framed
   * and centred in what remains. The view is shifted, not cropped, so the plate can
   * still reach under the overlays.
   */
  readonly insetLeft?: number;
  readonly insetRight?: number;
  readonly insetTop?: number;
}

interface Insets {
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

/**
 * The isometric camera, framed on the plate, that the visitor can turn a little
 * and zoom. Bounded: never far from the isometric view the drawing is made for.
 * The wheel alone scrolls the page; pinch or ctrl/⌘ + wheel zooms. On touch, one
 * finger scrolls the page and two fingers turn and zoom. Double-click resets.
 *
 * Until the visitor takes the camera, it follows the action: it leans towards
 * the parts of each step and zooms in a little, then settles back on the whole
 * machine when the scenario ends. Never with reduced motion.
 */
export function CameraRig({
  size,
  center,
  follow,
  reducedMotion,
  insetLeft = 0,
  insetRight = 0,
  insetTop = 0,
}: CameraRigProps) {
  const camera = useThree((s) => s.camera);
  const element = useThree((s) => s.gl.domElement);
  // Width and height only: R3F's size also carries the canvas' page offset, and a
  // new offset must not re-frame the camera.
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const rig = useRef<{
    fit: Fit | null;
    following: boolean;
    follow: Vec3 | null;
    /** The insets applied now: they ease towards the props, so the machine glides aside. */
    inset: Insets;
    /** The first framing has been made: later ones (resize, double-click) are immediate. */
    arrived: boolean;
  }>({
    fit: null,
    following: true,
    follow: null,
    inset: { left: insetLeft, right: insetRight, top: insetTop },
    arrived: false,
  });
  useLayoutEffect(() => {
    rig.current.follow = follow;
  }, [follow]);

  const controls = useMemo(() => {
    const orbit = new OrbitControls(camera, element);
    const { azimuth, elevationMin, elevationMax } = scene.orbit;
    orbit.enablePan = false;
    orbit.rotateSpeed = 0.5;
    orbit.minAzimuthAngle = ISO_AZIMUTH - MathUtils.degToRad(azimuth);
    orbit.maxAzimuthAngle = ISO_AZIMUTH + MathUtils.degToRad(azimuth);
    orbit.minPolarAngle = ISO_POLAR - MathUtils.degToRad(elevationMax);
    orbit.maxPolarAngle = ISO_POLAR - MathUtils.degToRad(elevationMin);
    orbit.touches = { ONE: null, TWO: TOUCH.DOLLY_ROTATE };
    return orbit;
  }, [camera, element]);

  useEffect(() => {
    controls.enableDamping = !reducedMotion;
  }, [controls, reducedMotion]);

  useEffect(() => {
    // OrbitControls blocks all touch scrolling; give vertical scrolling back to the page.
    element.style.touchAction = "pan-y";
    // At the target, capture listeners run first: keep plain wheel events from zooming.
    const letPageScroll = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        event.stopImmediatePropagation();
      }
    };
    element.addEventListener("wheel", letPageScroll, { capture: true });
    // The visitor turns or zooms: the camera is theirs until they double-click.
    const takeOver = () => {
      rig.current.following = false;
    };
    controls.addEventListener("start", takeOver);
    return () => {
      element.removeEventListener("wheel", letPageScroll, { capture: true });
      controls.removeEventListener("start", takeOver);
      controls.dispose();
    };
  }, [controls, element]);

  // Shifts the projection by half the insets, so the target lands in the middle of the
  // free part. Pointer picking and the label layer read the same projection.
  const applyInset = useMemo(
    () => (inset: Insets) => {
      if (!(camera instanceof OrthographicCamera)) {
        return;
      }
      const x = (inset.left - inset.right) / 2;
      const y = inset.top / 2;
      if (Math.abs(x) > 0.5 || y > 0.5) {
        camera.setViewOffset(width, height, -x, -y, width, height);
      } else {
        camera.clearViewOffset();
      }
    },
    [camera, width, height],
  );
  // Framing never moves the real camera: it is worked out on a stand-in.
  const probe = useMemo(() => new OrthographicCamera(), []);
  // What the insets leave of the canvas for the machine: never less than a share of it.
  const free = useMemo(
    () => (inset: Insets) => ({
      width: Math.max(width - inset.left - inset.right, width * 0.3),
      height: Math.max(height - inset.top, height * 0.5),
    }),
    [width, height],
  );
  const wantedInsets = (): Insets => ({
    left: Math.min(Math.max(insetLeft, 0), width * 0.6),
    right: Math.min(Math.max(insetRight, 0), width * 0.2),
    top: Math.min(Math.max(insetTop, 0), height * 0.4),
  });

  useLayoutEffect(() => {
    if (!(camera instanceof OrthographicCamera)) {
      return;
    }
    const reset = () => {
      const inset = rig.current.inset;
      const fit = fitIsometric(probe, size, center, free(inset));
      applyInset(inset);
      controls.target.copy(fit.target);
      camera.position.copy(fit.target).addScaledVector(ISO, DISTANCE);
      // On arrival the camera starts a little wide and the follow loop eases it in. Read
      // from the system, not the player: its reduced-motion flag lands after mount.
      const settle =
        !rig.current.arrived && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      camera.zoom = fit.zoom * (settle ? ARRIVAL_ZOOM : 1);
      rig.current.arrived = true;
      controls.minZoom = fit.zoom * scene.orbit.zoomMin;
      controls.maxZoom = fit.zoom * scene.orbit.zoomMax;
      camera.updateProjectionMatrix();
      controls.update();
      rig.current.fit = fit;
      rig.current.following = true;
    };
    reset();
    element.addEventListener("dblclick", reset);
    return () => element.removeEventListener("dblclick", reset);
  }, [camera, controls, element, probe, applyInset, free, size, center]);

  const goal = useMemo(() => new Vector3(), []);
  const step = useMemo(() => new Vector3(), []);
  useFrame((_, delta) => {
    // A new inset (the text beside the stage got wider or narrower): ease towards it and
    // re-frame on the way. Following, the camera glides to the new framing below.
    const wanted = wantedInsets();
    const now = rig.current.inset;
    if (
      Math.abs(now.left - wanted.left) > 0.5 ||
      Math.abs(now.right - wanted.right) > 0.5 ||
      Math.abs(now.top - wanted.top) > 0.5
    ) {
      const ease = (from: number, to: number) =>
        reducedMotion ? to : MathUtils.damp(from, to, scene.follow.rate * 1.5, delta);
      const inset = {
        left: ease(now.left, wanted.left),
        right: ease(now.right, wanted.right),
        top: ease(now.top, wanted.top),
      };
      rig.current.inset = inset;
      applyInset(inset);
      const fit = fitIsometric(probe, size, center, free(inset));
      rig.current.fit = fit;
      controls.minZoom = fit.zoom * scene.orbit.zoomMin;
      controls.maxZoom = fit.zoom * scene.orbit.zoomMax;
      if (reducedMotion && rig.current.following && camera instanceof OrthographicCamera) {
        controls.target.copy(fit.target);
        camera.position.copy(fit.target).addScaledVector(ISO, DISTANCE);
        camera.zoom = fit.zoom;
      }
      if (camera instanceof OrthographicCamera) {
        camera.updateProjectionMatrix();
      }
    }
    const { fit, following, follow: point } = rig.current;
    if (fit && following && !reducedMotion && camera instanceof OrthographicCamera) {
      const { shift, zoom, rate } = scene.follow;
      goal.copy(fit.target);
      if (point) {
        goal.lerp(step.set(point[0], point[1], point[2]), shift);
      }
      // Pan the target and the camera together: the view keeps its angle.
      step
        .set(
          MathUtils.damp(controls.target.x, goal.x, rate, delta),
          MathUtils.damp(controls.target.y, goal.y, rate, delta),
          MathUtils.damp(controls.target.z, goal.z, rate, delta),
        )
        .sub(controls.target);
      controls.target.add(step);
      camera.position.add(step);
      camera.zoom = MathUtils.damp(camera.zoom, fit.zoom * (point ? zoom : 1), rate, delta);
      camera.updateProjectionMatrix();
    }
    controls.update();
  });

  return null;
}
