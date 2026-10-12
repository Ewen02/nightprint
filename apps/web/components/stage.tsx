"use client";

import type { MachineStageProps } from "@nightprint/scene";
import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";

function StageMessage({ children }: { readonly children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
      <p className="mono-label max-w-sm text-text-secondary">{children}</p>
    </div>
  );
}

// three/webgpu only runs in the browser: never render the canvas on the server.
const MachineStage = dynamic(() => import("@nightprint/scene").then((m) => m.MachineStage), {
  ssr: false,
  loading: () => <StageMessage>Assembling the machine…</StageMessage>,
});

class StageBoundary extends Component<{ readonly children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override render() {
    if (this.state.failed) {
      return (
        <StageMessage>
          This browser can run neither WebGPU nor WebGL 2. The scenario and the log below still
          work.
        </StageMessage>
      );
    }
    return this.props.children;
  }
}

export function Stage(props: MachineStageProps) {
  return (
    <StageBoundary>
      <MachineStage {...props} />
    </StageBoundary>
  );
}
