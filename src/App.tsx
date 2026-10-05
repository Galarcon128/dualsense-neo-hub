import { useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import "./App.css";

interface DriverState {
  api_version: number;
  connected: boolean;
  child_running: boolean;
  pending: boolean;
}

function App() {
  const [state, setState] = useState<DriverState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setState(await invoke<DriverState>("get_driver_state"));
    } catch (error) {
      setState(null);
      setError(String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <header>
        <p className="eyebrow">YOUR CONTROLLER, CONNECTED</p>
        <h1>DualSense Neo Hub</h1>
        <p>Audio, haptics and lighting for your DualSense on Linux.</p>
      </header>
      <section className="card" aria-labelledby="connection-title">
        <h2 id="connection-title">Controller connection</h2>
        <p role="status" aria-live="polite">
          {loading ? "Checking driver…" : state
            ? state.connected ? "Controller connected" : "Controller disconnected"
            : "Connection has not been checked."}
        </p>
        {state && <p>
          Driver process: {state.child_running ? "running" : "stopped"}.
          {state.pending && " Settings are being applied."}
        </p>}
        {error && <p className="error" role="alert">{error}</p>}
        {!isTauri() && <p>Open the desktop application to check the driver connection.</p>}
        <button onClick={refresh} disabled={loading || !isTauri()}>
          {loading ? "Checking…" : "Check connection"}
        </button>
      </section>
      <p className="footnote">Pair your controller over Bluetooth and start the DualSense Neo service before connecting.</p>
    </main>
  );
}

export default App;
