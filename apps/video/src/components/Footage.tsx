import type React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { type CameraKey, cameraAt, type Timeline, viewOf } from "../timeline";

type FootageProps = {
  /** Folder under `public/` holding `f0000.jpg`…, written by `scripts/capture.mjs`. */
  readonly dir: string;
  readonly footage: Timeline["footage"];
  readonly camera: readonly CameraKey[];
  readonly style?: React.CSSProperties;
  /**
   * The size it fills in the video, in px, when it is not the whole 16:9 frame: a window of a
   * vertical video. The camera's zoom is then page px to video px.
   */
  readonly size?: { readonly width: number; readonly height: number };
  /** Drawn in page px, so they move with the camera (the cursor, click marks). */
  readonly children?: React.ReactNode;
};

/**
 * The captured page, one image per frame, seen through a camera. The images are captured at
 * `footage.scale`, so zooming up to that factor stays sharp; a closer key fails the render
 * rather than upscale. Past the last image the page holds.
 */
export function Footage({ dir, footage, camera, style, size, children }: FootageProps) {
  const closest = Math.max(...camera.map((key) => key[3]));
  if (closest > footage.scale) {
    throw new Error(
      `Camera zoom ${closest} is past the capture's ${footage.scale}×: the footage would blur`,
    );
  }
  const frame = useCurrentFrame();
  const index = Math.min(frame, footage.frames - 1);
  const view = viewOf(cameraAt(camera, frame), footage, size);
  const zoom = (size?.width ?? footage.width) / view.width;

  return (
    <AbsoluteFill style={{ overflow: "hidden", ...style }}>
      <div
        style={{
          position: "absolute",
          width: footage.width,
          height: footage.height,
          transformOrigin: "0 0",
          // Order matters: move the viewed rectangle to the origin, then scale it to the frame.
          transform: `scale(${zoom}) translate(${-view.left}px, ${-view.top}px)`,
        }}
      >
        <Img
          src={staticFile(`${dir}/f${String(index).padStart(4, "0")}.jpg`)}
          style={{ width: footage.width, height: footage.height, display: "block" }}
        />
        {children}
      </div>
    </AbsoluteFill>
  );
}
