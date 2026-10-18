import { Composition, Folder } from "remotion";
import { EndCard } from "./components/EndCard";
import { StepCaption } from "./components/StepCaption";
import { TitleCard } from "./components/TitleCard";
import { ViolationFrame } from "./components/ViolationFrame";
import { WhatIfCard } from "./components/WhatIfCard";
import { FMD001_VERTICAL_FRAMES, Fmd001Vertical } from "./fmd-001-vertical/Fmd001Vertical";
import { MCH001_FRAMES, Mch001 } from "./mch-001/Mch001";
import { MCH002_FRAMES, Mch002 } from "./mch-002/Mch002";
import { MCH003_FRAMES, Mch003 } from "./mch-003/Mch003";
import { MCH004_FRAMES, Mch004 } from "./mch-004/Mch004";
import { PRJ001_FRAMES, Prj001 } from "./prj-001/Prj001";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="MCH-001"
        component={Mch001}
        durationInFrames={MCH001_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="MCH-002"
        component={Mch002}
        durationInFrames={MCH002_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="MCH-003"
        component={Mch003}
        durationInFrames={MCH003_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="MCH-004"
        component={Mch004}
        durationInFrames={MCH004_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="FMD-001-9x16"
        component={Fmd001Vertical}
        durationInFrames={FMD001_VERTICAL_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="PRJ-001"
        component={Prj001}
        durationInFrames={PRJ001_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Folder name="Elements">
        <Composition
          id="TitleCard"
          component={TitleCard}
          durationInFrames={84}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            kicker: "NIGHTPRINT · MCH-001",
            lineOne: "Hexagonal architecture,",
            lineTwo: "as a machine you can run.",
            outAt: 64,
          }}
        />
        <Composition
          id="StepCaption"
          component={StepCaption}
          durationInFrames={120}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            steps: [
              { from: 0, number: 3, count: 8, title: "Through the driving port", flow: "request" },
              {
                from: 48,
                number: 4,
                count: 8,
                title: "The core applies the rules",
                flow: "request",
              },
              {
                from: 96,
                number: 5,
                count: 8,
                title: "Out through OrderRepository",
                flow: "write",
              },
            ],
            stepFrames: 42,
            outAt: 108,
          }}
        />
        <Composition
          id="WhatIfCard"
          component={WhatIfCard}
          durationInFrames={104}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            action: "Swap Postgres for InMemory",
            result: "The core does not change.",
            tone: "write",
            clickAt: 16,
            resultAt: 50,
            outAt: 90,
          }}
        />
        <Composition
          id="ViolationFrame"
          component={ViolationFrame}
          durationInFrames={100}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{ outAt: 88 }}
        />
        <Composition
          id="EndCard"
          component={EndCard}
          durationInFrames={104}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            lineOne: "Software architecture,",
            lineTwo: "drawn as machines you can run.",
            url: "nightprint.dev",
            footer: "MCH-001 · HEXAGONAL ARCHITECTURE · ONE MACHINE A WEEK",
          }}
        />
      </Folder>
    </>
  );
}
