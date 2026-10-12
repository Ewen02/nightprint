import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { float, mrt, output, pass } from "three/tsl";
import { RenderPipeline, WebGPURenderer } from "three/webgpu";
import { scene as sceneTokens } from "./palette";

function webgpuRenderer(gl: unknown): WebGPURenderer {
  if (!(gl instanceof WebGPURenderer)) {
    throw new Error("The render pipeline needs the WebGPURenderer created by MachineStage");
  }
  return gl;
}

/**
 * Takes over rendering (frame priority 1, after every other frame callback):
 * the scene pass writes its colour and each material's bloom intensity, and
 * only `colour × intensity` blooms. Flow colours glow; white never does.
 */
export function SceneRenderPipeline() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  const pipeline = useMemo(() => {
    const renderPipeline = new RenderPipeline(webgpuRenderer(gl));
    const scenePass = pass(scene, camera);
    scenePass.setMRT(mrt({ output, bloomIntensity: float(0) }));
    const colour = scenePass.getTextureNode("output");
    const intensity = scenePass.getTextureNode("bloomIntensity");
    const { strength, radius, threshold } = sceneTokens.bloom;
    const glow = bloom(colour.mul(intensity), strength, radius, threshold);
    renderPipeline.outputNode = colour.add(glow);
    return renderPipeline;
  }, [gl, scene, camera]);

  useEffect(() => () => pipeline.dispose(), [pipeline]);

  useFrame(() => {
    pipeline.render();
  }, 1);

  return null;
}
