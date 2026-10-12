import { motion } from "@nightprint/tokens";
import type { CSSProperties } from "react";
import { ButtonLink } from "../atoms/button-link";
import { ChevronIcon } from "../atoms/chevron-icon";
import { FlowDot } from "../atoms/flow-dot";
import { MonoLabel } from "../atoms/mono-label";
import { type Fact, FactList } from "../molecules/fact-list";

interface Action {
  readonly label: string;
  readonly href: string;
}

export interface HomeIntroProps {
  /** What runs right now, in the request colour: "MCH-001 is running". */
  readonly status: string;
  readonly title: string;
  readonly lead: string;
  readonly primaryAction: Action;
  readonly secondaryAction?: Action;
  readonly facts?: readonly Fact[];
  /** A last line that says what scrolling does: "Scroll, and it runs". */
  readonly cue?: string;
}

const ENTER = "animate-enter motion-reduce:animate-none";

/**
 * The page arrives line by line, a beat apart, around a title that is there at once:
 * it is the page's largest text, and a fade would hold back its first paint.
 */
const after = (beat: number): CSSProperties => ({ animationDelay: `${beat * motion.fast}ms` });

/** The hero text of the home page: status, h1, lead, actions, key figures and a cue. */
export function HomeIntro({
  status,
  title,
  lead,
  primaryAction,
  secondaryAction,
  facts = [],
  cue,
}: HomeIntroProps) {
  return (
    <div className="flex flex-col gap-7">
      <MonoLabel flow="request" className={`flex items-center gap-2.5 ${ENTER}`}>
        <FlowDot flow="request" />
        {status}
      </MonoLabel>
      <h1 className="text-title sm:text-display lg:text-hero">{title}</h1>
      <p className={`max-w-115 text-body text-text-muted ${ENTER}`} style={after(2)}>
        {lead}
      </p>
      <div className={`flex flex-wrap gap-3 ${ENTER}`} style={after(3)}>
        <ButtonLink href={primaryAction.href}>{primaryAction.label}</ButtonLink>
        {secondaryAction && (
          <ButtonLink href={secondaryAction.href} variant="secondary">
            {secondaryAction.label}
          </ButtonLink>
        )}
      </div>
      {facts.length > 0 && (
        <div className={`mt-2 ${ENTER}`} style={after(4)}>
          <FactList facts={facts} />
        </div>
      )}
      {/* The cue comes last, once the rest has landed. */}
      {cue && (
        <p
          className={`mono-label mt-6 flex items-center gap-2 text-text-faint ${ENTER}`}
          style={after(6)}
        >
          <ChevronIcon direction="down" />
          {cue}
        </p>
      )}
    </div>
  );
}
