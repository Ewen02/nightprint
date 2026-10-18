import type { MachineInput } from "@nightprint/engine";

export type StepInput = MachineInput["scenarios"][number]["steps"][number];
/** A step as `variants` asks for it: everything but its id and its condition. */
export type StepBody = Omit<StepInput, "id" | "when">;
export type TokenInput = NonNullable<StepInput["tokens"]>[number];
export type LogInput = NonNullable<StepInput["log"]>[number];

/**
 * One copy of a step per combination of the switches it depends on, by action id: `make`
 * writes the step knowing which of them are on, and each copy plays only under its own
 * combination. For machines where one step tells what several lanes do at once (a bench,
 * a failure mode), so a switch rewrites a sentence instead of a whole scenario.
 */
export function variants(
  id: string,
  depends: readonly string[],
  make: (on: (action: string) => boolean) => StepBody,
): StepInput[] {
  return Array.from({ length: 1 << depends.length }, (_, mask) => {
    const active = depends.filter((_, i) => mask & (1 << i));
    return {
      ...make((action) => active.includes(action)),
      id: [id, ...active].join("-"),
      when: { all: active, none: depends.filter((action) => !active.includes(action)) },
    };
  });
}
