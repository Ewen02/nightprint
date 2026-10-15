"use client";

import { useEffect, useRef } from "react";

/**
 * The film's frame, copied into a small canvas of its own each time the page paints. The
 * source stays where the encoder reads it, and the stage's tools, drawn twice (beside the
 * stage, and under it on phones), each get their own copy.
 */
export function FilmFrame({ source }: { readonly source: HTMLCanvasElement }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let id = 0;
    const copy = () => {
      const canvas = ref.current;
      // Only the copy on screen draws: the other one is hidden at this width.
      if (canvas && canvas.offsetParent !== null) {
        canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
      }
      id = requestAnimationFrame(copy);
    };
    id = requestAnimationFrame(copy);
    return () => cancelAnimationFrame(id);
  }, [source]);
  // Twice the card's 256 × 144, for screens with two pixels to the px.
  return <canvas ref={ref} width={512} height={288} className="block size-full" />;
}
