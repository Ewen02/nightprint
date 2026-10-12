import type { Frame, Player, Vec3 } from "@nightprint/engine";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { type AssemblyPhase, assemblyPhase, assemblyTimeline } from "./assembly";
import { CameraRig } from "./camera-rig";
import { DependencyArrow } from "./dependency-arrow";
import { Dimensions } from "./dimensions";
import { pipeTravels } from "./flow";
import { shapeHalfHeight } from "./geometry";
import { LabelProjector, type LabelRegistry } from "./labels";
import { neutral, scene } from "./palette";
import { PartModel } from "./part-model";
import { Pipe } from "./pipe";
import { Plate } from "./plate";
import { SceneRenderPipeline } from "./render-pipeline";
import { everyDrawnRoute, placeRoutes } from "./route-slots";
import { Simulation } from "./simulation";
import { Sparks } from "./sparks";
import { unplugs } from "./unplug";
import { usePlayerSnapshot } from "./use-player";
import { Wire } from "./wire";
import { Zones } from "./zones";

export interface MachineSceneProps {
  readonly player: Player;
  readonly selected: string | null;
  readonly hovered: string | null;
  readonly labels: LabelRegistry;
  readonly onSelect?: ((partId: string) => void) | undefined;
  readonly onHover?: ((partId: string | null) => void) | undefined;
  /** The camera leans towards each step's parts. */
  readonly follows: boolean;
  /** Room kept clear along the canvas' edges for what is laid over it, in CSS px. */
  readonly insetLeft?: number;
  readonly insetRight?: number;
  readonly insetTop?: number;
  /** The stage is shown: the machine starts assembling. */
  readonly revealed: boolean;
  /** Each step of the first display, for what lives outside the canvas (the labels). */
  readonly onPhase?: ((phase: AssemblyPhase) => void) | undefined;
  /** The exploded view: every adapter off its pipe, the core and its ports whole. */
  readonly exploded?: boolean;
}

/** Everything inside the Canvas: lights, plate, parts, pipes, tokens and label anchors. */
export function MachineScene({
  player,
  selected,
  hovered,
  labels,
  onSelect,
  onHover,
  follows,
  insetLeft = 0,
  insetRight = 0,
  insetTop = 0,
  revealed,
  onPhase,
  exploded = false,
}: MachineSceneProps) {
  const { resolved, step, state, finished } = usePlayerSnapshot(player);
  const { plate } = resolved.machine.stage;

  // The first display assembles the machine: parts set down in balloon order, then the
  // routes, then the labels, then the scenario runs. Read from the system, not the
  // player: its reduced-motion flag lands after mount. Without it, everything is there.
  const [assembles] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const timeline = useMemo(() => assemblyTimeline(resolved.machine.parts), [resolved.machine]);
  const clock = useRef(-1);
  const [phase, setPhase] = useState<AssemblyPhase>(assembles ? "compiling" : "done");
  const current = useRef(phase);
  const hold = useRef(assembles);
  const shown = useRef(revealed);
  useLayoutEffect(() => {
    shown.current = revealed;
  }, [revealed]);
  useEffect(() => {
    onPhase?.(phase);
  }, [phase, onPhase]);
  // Before the simulation (-1): a scenario held back this frame gets no time this frame.
  useFrame((_, delta) => {
    if (current.current === "done" || !shown.current) {
      return;
    }
    clock.current = clock.current < 0 ? 0 : clock.current + delta;
    const next = assemblyPhase(clock.current, timeline);
    if (next !== current.current) {
      current.current = next;
      hold.current = next !== "done";
      setPhase(next);
    }
  }, -2);
  // Routes stay out while the parts are set down; before that, drawn unseen to compile.
  const routesShown = phase !== "parts";

  // Every route the switches can draw stays mounted and fades in or out: a switch then
  // changes uniforms only, never compiles a material mid-animation.
  const every = useMemo(() => everyDrawnRoute(resolved.machine), [resolved.machine]);
  const lastPoints = useRef(new Map<string, { key: string; points: readonly Vec3[] }>());
  const slots = useMemo(() => placeRoutes(every, resolved, lastPoints.current), [every, resolved]);
  const pipes = useMemo(() => slots.filter((s) => s.route.kind === "pipe"), [slots]);
  const wires = useMemo(() => slots.filter((s) => s.route.kind === "wire"), [slots]);
  const hiddenPipes = useMemo(() => pipes.map((p) => ({ ...p, present: false })), [pipes]);
  // The exploded view, ready under every switch: its lines are mounted from the start too.
  const unplugged = useMemo(() => unplugs(resolved, pipes), [resolved, pipes]);

  // Once the scenario has played to its end the machine comes to rest: nothing lit,
  // nothing travelling, the trails fade and the camera goes back to the overview.

  const travels = useMemo(
    () => (finished ? new Map() : pipeTravels(step, resolved)),
    [step, resolved, finished],
  );
  const frame = useRef<Frame | null>(null);

  const focus = useMemo(() => new Set(finished ? [] : step.step.focus), [step, finished]);

  // Where the camera leans: the middle of the parts the step is about; the whole machine once
  // the scenario has played to its end.
  const follow = useMemo((): Vec3 | null => {
    const points = step.step.focus
      .map((id) => resolved.partById.get(id)?.position)
      .filter((p): p is Vec3 => p !== undefined);
    if (!follows || finished || points.length === 0) {
      return null;
    }
    const sum = points.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]);
    return [sum[0] / points.length, sum[1] / points.length, sum[2] / points.length];
  }, [step, resolved, finished, follows]);

  // The sparks rise from the first part that breaks the pattern, if any.
  const sparksAt = useMemo((): Vec3 | null => {
    const part = resolved.parts.find((p) => p.flag === "violation");
    return part
      ? [part.position[0], part.position[1] + shapeHalfHeight(part.shape), part.position[2]]
      : null;
  }, [resolved]);

  return (
    <>
      <color attach="background" args={[scene.background]} />
      <hemisphereLight args={[neutral.textBody, scene.background, scene.light.ambient]} />
      <directionalLight position={[...scene.light.keyPosition]} intensity={scene.light.key} />
      <CameraRig
        size={plate.size}
        center={plate.center}
        follow={follow}
        reducedMotion={state.reducedMotion}
        insetLeft={insetLeft}
        insetRight={insetRight}
        insetTop={insetTop}
      />
      <Plate size={plate.size} center={plate.center} />
      <Zones zones={resolved.machine.stage.zones} centreX={plate.center[0]} labels={labels} />
      {pipes.map(({ route, points, present }) => (
        <Pipe
          key={route.id}
          points={points}
          present={present && routesShown}
          travel={travels.get(route.id)}
          violation={route.flag === "violation"}
          reducedMotion={state.reducedMotion}
          frame={frame}
        />
      ))}
      {wires.map(({ route, points, present }) => (
        <Wire
          key={route.id}
          points={points}
          // Unplugged, an adapter is wired to nothing.
          present={present && routesShown && !exploded}
          flow={present && focus.has(route.from) && focus.has(route.to) ? step.flow : null}
          reducedMotion={state.reducedMotion}
        />
      ))}
      {/* The gap an unplugged adapter leaves, dashed like a drawing's assembly line. */}
      {[...unplugged].map(([id, unplug]) => (
        <Wire
          key={`unplug-${id}`}
          points={unplug.line}
          present={exploded && unplug.free && routesShown}
          flow={null}
          restOpacity={scene.edgeOpacity.solid}
          reducedMotion={state.reducedMotion}
        />
      ))}
      <Dimensions
        routes={routesShown ? pipes : hiddenPipes}
        centre={plate.center}
        reducedMotion={state.reducedMotion}
        labels={labels}
      />
      {pipes.map(({ route, points, present }) =>
        route.dependsOn ? (
          <DependencyArrow
            key={route.id}
            points={points}
            end={route.dependsOn}
            violation={route.flag === "violation"}
            present={present && routesShown}
            reducedMotion={state.reducedMotion}
          />
        ) : null,
      )}
      {resolved.parts.map((part) => (
        <PartModel
          key={part.id}
          part={part}
          focused={focus.has(part.id)}
          selected={selected === part.id}
          hovered={hovered === part.id}
          flow={step.flow}
          reducedMotion={state.reducedMotion}
          labels={labels}
          onSelect={onSelect}
          onHover={onHover}
          arrival={assembles ? { clock, at: timeline.partAt.get(part.id) ?? 0 } : undefined}
          unplugBy={
            exploded && unplugged.get(part.id)?.free ? unplugged.get(part.id)?.offset : null
          }
        />
      ))}
      <Sparks origin={sparksAt} frame={frame} reducedMotion={state.reducedMotion} />
      {/* After the parts: their frame callbacks run first, so labels follow a gliding part. */}
      <LabelProjector labels={labels} />
      <Simulation
        player={player}
        frame={frame}
        resting={finished}
        reducedMotion={state.reducedMotion}
        hold={hold}
      />
      <SceneRenderPipeline />
    </>
  );
}
