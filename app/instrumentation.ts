export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { connect } = await import("@lancedb/lancedb");
    const { setLanceConnect } = await import("../agents/memory/vector-store");
    setLanceConnect((uri) => connect(uri));
    const { startIdleLoop } = await import("../agents/runner/idle-loop");
    startIdleLoop();
  }
}
