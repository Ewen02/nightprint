import type { FlowName } from "@nightprint/tokens";
import { Button } from "../atoms/button";
import { ChevronIcon } from "../atoms/chevron-icon";
import { IconButton } from "../atoms/icon-button";
import { cx } from "../cx";
import { ScenarioEnd, type ScenarioEndProps } from "../molecules/scenario-end";
import { StepCaption } from "../molecules/step-caption";
import { type StepDotItem, StepDots } from "../molecules/step-dots";

export interface TransportProps {
  /** Scenario title, used as the region's name. */
  readonly scenario: string;
  readonly steps: readonly StepDotItem[];
  /** Index of the current step. */
  readonly current: number;
  readonly caption: { readonly title: string; readonly body: string; readonly flow: FlowName };
  readonly playing: boolean;
  /** The last step has played to its end. */
  readonly finished: boolean;
  readonly onPrev?: () => void;
  readonly onNext?: () => void;
  readonly onTogglePlay?: () => void;
  readonly onSeek?: (index: number) => void;
  /** Once the scenario has played to its end: shown instead of the last step's caption. */
  readonly ending?: Omit<ScenarioEndProps, "onSuggestion"> | null;
  readonly onSuggestion?: (id: string) => void;
  /**
   * A link to the current step: the button's label ("Copy link", "Link copied")
   * and the message read out once it has been shared.
   */
  readonly share?: {
    readonly label: string;
    readonly status: string;
    readonly onShare: () => void;
  };
  /**
   * A video of the machine, made in the page: the button's label ("Download video", or how
   * far the filming is while a press cancels it) and the message read out as it starts and ends.
   */
  readonly film?: {
    readonly label: string;
    readonly status: string;
    /** Filming: the button is pressed, and a press stops it. */
    readonly filming: boolean;
    /** How far the filming is, 0 to 1, while it lasts. */
    readonly progress?: number | undefined;
    readonly onFilm: () => void;
  };
  readonly className?: string;
}

/** The step sequencer: previous, play, next, step bars and the current caption. */
export function Transport({
  scenario,
  steps,
  current,
  caption,
  playing,
  finished,
  onPrev,
  onNext,
  onTogglePlay,
  onSeek,
  ending = null,
  onSuggestion,
  share,
  film,
  className,
}: TransportProps) {
  return (
    <section
      aria-label={`Scenario: ${scenario}`}
      className={cx(
        "flex flex-col gap-4 border-b border-line-muted bg-surface px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:gap-8 lg:border-t",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <IconButton label="Previous step" onClick={onPrev}>
          <ChevronIcon direction="left" />
        </IconButton>
        <Button pressed={playing} onClick={onTogglePlay}>
          {playing ? "Pause" : finished ? "Replay" : "Play"}
        </Button>
        <IconButton label="Next step" disabled={current >= steps.length - 1} onClick={onNext}>
          <ChevronIcon direction="right" />
        </IconButton>
      </div>
      {/* At the end every bar is done and the end says so: the room goes to what to try next. */}
      {!ending && <StepDots steps={steps} current={current} onSeek={onSeek} />}
      {ending ? (
        <ScenarioEnd {...ending} onSuggestion={onSuggestion} />
      ) : (
        <StepCaption
          index={current}
          count={steps.length}
          title={caption.title}
          body={caption.body}
          flow={caption.flow}
        />
      )}
      {(share || film) && (
        <div className="flex flex-none flex-wrap gap-2">
          {share && (
            <>
              <Button variant="secondary" onClick={share.onShare}>
                {share.label}
              </Button>
              <span aria-live="polite" className="sr-only">
                {share.status}
              </span>
            </>
          )}
          {film && (
            <>
              <Button
                variant="secondary"
                pressed={film.filming}
                progress={film.progress}
                onClick={film.onFilm}
              >
                {film.label}
              </Button>
              <span aria-live="polite" className="sr-only">
                {film.status}
              </span>
            </>
          )}
        </div>
      )}
    </section>
  );
}
