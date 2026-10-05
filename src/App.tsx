import { useEffect, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import "./App.css";

type Branch = "audio" | "haptics" | "lights";
type Toggle = Branch | "mic";
type LightMode = "off" | "fixed" | "music-blue" | "music-bands";
interface DriverState {
  api_version: number;
  connected: boolean;
  child_running: boolean;
  pending: boolean;
  audio_enabled: boolean;
  mic_enabled: boolean;
  haptics_enabled: boolean;
  lights_enabled: boolean;
  light_mode: LightMode;
  fixed_color: [number, number, number];
  audio_level: number;
  haptics_level: number;
  lights_level: number;
}
type Setting =
  | { kind: `${Toggle}_enabled`; enabled: boolean }
  | { kind: `${Branch}_level`; level: number }
  | { kind: "light_mode"; mode: LightMode }
  | { kind: "fixed_color"; color: [number, number, number] };

function LevelControl({ branch, value, disabled, apply }: {
  branch: Branch; value: number; disabled: boolean; apply: (setting: Setting) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return <div className="level">
    <label htmlFor={`${branch}-level`}>Level: {draft}% <span>(requested: {value}%)</span></label>
    <div className="input-row">
      <input id={`${branch}-level`} type="range" min="0" max="100" value={draft}
        disabled={disabled} onChange={(event) => setDraft(Number(event.target.value))} />
      <button disabled={disabled || draft === value}
        onClick={() => void apply({ kind: `${branch}_level`, level: draft })}>Apply</button>
    </div>
  </div>;
}

function ColorControl({ color, disabled, apply }: {
  color: [number, number, number]; disabled: boolean; apply: (setting: Setting) => Promise<void>;
}) {
  const hex = `#${color.map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  const [draft, setDraft] = useState(hex);
  useEffect(() => setDraft(hex), [hex]);
  return <div className="level">
    <label htmlFor="fixed-color">Stored fixed color: {hex}</label>
    <div className="input-row">
      <input id="fixed-color" type="color" value={draft} disabled={disabled}
        onChange={(event) => setDraft(event.target.value)} />
      <code>{draft}</code>
      <button disabled={disabled || draft === hex} onClick={() => void apply({
        kind: "fixed_color",
        color: [1, 3, 5].map((index) => parseInt(draft.slice(index, index + 2), 16)) as [number, number, number],
      })}>Apply color</button>
    </div>
    <p className="hint">The stored color is used in Fixed mode.</p>
  </div>;
}

function App() {
  const desktop = isTauri();
  const [state, setState] = useState<DriverState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [checkedAt, setCheckedAt] = useState("");
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const writing = useRef(false);

  function accept(next: DriverState) {
    if (!mounted.current) return;
    setState(next);
    setCheckedAt(new Date().toLocaleTimeString());
  }

  async function refresh() {
    if (!desktop || inFlight.current || writing.current) return;
    inFlight.current = true;
    try {
      accept(await invoke<DriverState>("get_driver_state"));
      if (mounted.current) setError("");
    } catch (cause) {
      if (mounted.current) { setState(null); setError(String(cause)); }
    } finally { inFlight.current = false; }
  }

  async function apply(setting: Setting) {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    while (inFlight.current) await new Promise((resolve) => window.setTimeout(resolve, 25));
    if (!mounted.current) { writing.current = false; return; }
    inFlight.current = true;
    setMessage("");
    setError("");
    try {
      accept(await invoke<DriverState>("set_driver_setting", { setting }));
      if (mounted.current) setMessage("Setting accepted. See the requested state below.");
    } catch (cause) {
      if (mounted.current) { setError(String(cause)); setState(null); }
    } finally {
      inFlight.current = false;
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => { mounted.current = false; window.clearInterval(timer); };
  }, []);

  return <main className="container">
    <header>
      <p className="eyebrow">API TEST PANEL</p>
      <h1>DualSense Neo Hub</h1>
      <p>A simple panel for the driver's session API v1.</p>
    </header>
    {!desktop && <p className="notice">Open with <code>bun run tauri dev</code> to access the installed driver. Browser preview cannot call D-Bus.</p>}
    <section className="card" aria-labelledby="status-title">
      <div className="section-heading"><h2 id="status-title">Connection</h2>
        <button disabled={!desktop || busy} onClick={() => void refresh()}>Refresh</button></div>
      <p role="status" aria-live="polite">{state
        ? `Service available · Controller ${state.connected ? "connected" : "disconnected"} · Child ${state.child_running ? "running" : "stopped"}`
        : desktop ? "Waiting for the driver service…" : "Desktop connection required."}</p>
      {state && <p className={state.pending ? "notice" : "hint"}>{state.pending
        ? "Pending: requested settings have not yet been applied to the child."
        : "No pending settings."}</p>}
      {checkedAt && <p className="hint">Last successful check: {checkedAt}. Updates every 2 seconds.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <p role="status" aria-live="polite">{busy ? "Sending setting…" : message}</p>
      {state && !state.connected && <p className="hint">You can change requested settings while disconnected. Physical effects require a connected controller.</p>}
    </section>
    <div className="controls">
      {(["audio", "mic", "haptics", "lights"] as Toggle[]).map((branch) => <section className="card" key={branch}>
        <h2>{({ audio: "Audio", mic: "Microphone", haptics: "Haptics", lights: "Lights" })[branch]}</h2>
        <fieldset disabled={!state || busy}>
          <label className="toggle"><input type="checkbox" checked={state?.[`${branch}_enabled`] ?? false}
            onChange={(event) => void apply({ kind: `${branch}_enabled`, enabled: event.target.checked })} /> Enabled</label>
          {branch !== "mic" && <LevelControl branch={branch} value={state?.[`${branch}_level`] ?? 100}
            disabled={!state || busy} apply={apply} />}
          {branch === "lights" && <>
            <label htmlFor="light-mode">Mode</label>
            <select id="light-mode" value={state?.light_mode ?? "music-blue"}
              onChange={(event) => void apply({ kind: "light_mode", mode: event.target.value as LightMode })}>
              <option value="off">Off</option><option value="fixed">Fixed</option>
              <option value="music-blue">Music blue</option><option value="music-bands">Music bands (RGB)</option>
            </select>
            <ColorControl color={state?.fixed_color ?? [0, 0, 128]} disabled={!state || busy} apply={apply} />
          </>}
        </fieldset>
      </section>)}
    </div>
    {state && <details className="card"><summary>GetState JSON</summary><pre>{JSON.stringify(state, null, 2)}</pre></details>}
    <p className="footnote">Changes may briefly interrupt controller audio. Settings reset when the driver service restarts.
      Pairing, service startup and default audio routing are managed separately.</p>
  </main>;
}
export default App;
