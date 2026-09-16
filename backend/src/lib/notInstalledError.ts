/** Thrown wherever a business-scoped lookup finds no Business row yet —
 * lets the global error handler return a clean, machine-readable signal
 * (`code: "NOT_INSTALLED"`) instead of a generic 500, so the frontend can
 * detect this state and redirect to the install wizard. */
export class NotInstalledError extends Error {
  constructor() {
    super("This instance hasn't been set up yet — run the install wizard first.");
    this.name = "NotInstalledError";
  }
}
