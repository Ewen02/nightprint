import { getConsoleFunction, setConsoleFunction } from "three";

/**
 * React Three Fiber 9.8 creates a THREE.Clock for every Canvas, and three r183
 * deprecated Clock with a warning in its constructor: one warning per mounted
 * stage, from code we do not own. Remove this filter when R3F creates a
 * THREE.Timer instead (v10). Our own code never uses Clock.
 */
const R3F_CLOCK_WARNING =
  "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.";

interface StackTrace {
  readonly isStackTrace: true;
  getError(message: string): Error;
}

function isStackTrace(value: unknown): value is StackTrace {
  return typeof value === "object" && value !== null && "isStackTrace" in value;
}

/**
 * Drops that one warning. Everything else three logs reaches the console as
 * three itself prints it, TSL stack traces included, or goes to the console
 * function that was set before.
 */
export function filterThreeConsole(): void {
  const previous = getConsoleFunction();
  setConsoleFunction((type, message, ...params) => {
    if (type === "warn" && message === R3F_CLOCK_WARNING) {
      return;
    }
    if (previous) {
      previous(type, message, ...params);
    } else if (type !== "log" && isStackTrace(params[0])) {
      console[type](params[0].getError(message));
    } else {
      console[type](message, ...params);
    }
  });
}
