/** The size of a film: a 1280 × 720 stage drawn at 1.5 px per CSS px, so 1920 × 1080. */
export const FILM_SIZE = { width: 1280, height: 720, scale: 1.5 } as const;

const PIXELS = {
  width: FILM_SIZE.width * FILM_SIZE.scale,
  height: FILM_SIZE.height * FILM_SIZE.scale,
};

/** H.264 at 1080p, the profile and level X and LinkedIn take. */
const AVC = "avc1.640028";

/**
 * Whether this browser can make a film: WebCodecs, and an H.264 encoder at 1080p.
 * Answered without loading the muxer, so a machine page pays nothing to ask.
 */
export async function canFilm(): Promise<boolean> {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") {
    return false;
  }
  try {
    const { supported } = await VideoEncoder.isConfigSupported({
      codec: AVC,
      width: PIXELS.width,
      height: PIXELS.height,
      framerate: 30,
    });
    return supported === true;
  } catch {
    return false;
  }
}

export interface FilmEncoder {
  /** Encodes what the canvas shows now as the frame at `seconds`. Await it: backpressure. */
  add(seconds: number, duration: number): Promise<void>;
  /** The MP4, once every frame is in. */
  finish(): Promise<Blob>;
  cancel(): Promise<void>;
}

/** An MP4 encoder fed from `canvas`, frame by frame. Loads the muxer on first use. */
export async function openEncoder(canvas: HTMLCanvasElement, fps: number): Promise<FilmEncoder> {
  const { BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH } = await import(
    "mediabunny"
  );
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target });
  const source = new CanvasSource(canvas, { codec: "avc", quality: QUALITY_HIGH });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();
  return {
    add: (seconds, duration) => source.add(seconds, duration),
    async finish() {
      await output.finalize();
      if (!target.buffer) {
        throw new Error("The video came out empty.");
      }
      return new Blob([target.buffer], { type: "video/mp4" });
    },
    async cancel() {
      if (output.state === "started" || output.state === "pending") {
        await output.cancel();
      }
    },
  };
}
