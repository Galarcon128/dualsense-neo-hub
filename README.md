# DualSense Neo Hub

Linux desktop companion for the [DualSense Neo driver](https://github.com/Galarcon128/dualsense-neo).
The planned application installs and manages the driver and controls Bluetooth audio,
microphone, haptics and lighting. The initial API test panel reads the driver's
versioned session D-Bus state and exposes all version 1 settings.

## Stack

- Tauri 2 and Rust, with zbus for session D-Bus access.
- React, TypeScript and Vite for the interface.
- Bun 1.4.2 for frontend dependencies and scripts; Cargo for Rust dependencies.
- Debian packages as the initial distribution target. Supported Ubuntu/Linux Mint
  releases still need to be selected and validated.

## Development

The public repository is [Galarcon128/dualsense-neo-hub](https://github.com/Galarcon128/dualsense-neo-hub).

Install Bun, Rust and the [Tauri Linux prerequisites](https://v2.tauri.app/start/prerequisites/),
including GTK 3 and WebKitGTK 4.1 development packages.

```sh
git clone --recurse-submodules https://github.com/Galarcon128/dualsense-neo-hub.git
cd dualsense-neo-hub
bun install --frozen-lockfile
bun run dev          # browser preview; native driver access requires Tauri
bun run tauri dev    # desktop application
```

For this workspace only, a Bun binary is available in the ignored `.tools/`
directory. Add it to your shell path if Bun is not installed globally:

```sh
export PATH="$PWD/.tools:$PATH"
```

## Checks and packaging

```sh
bun run check
bun run build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml
bun run tauri build --bundles deb
```

Dependency versions are pinned in `bun.lock` and `src-tauri/Cargo.lock`.
Use `bun install --frozen-lockfile` and
`cargo check --locked --manifest-path src-tauri/Cargo.toml` to verify the committed
dependency resolution.

### Workspace validation

Validation on October 4, 2026 used Linux Mint 22.3, Bun 1.4.2 and Cargo 1.97.0,
with GTK 3.24.41 and WebKitGTK 2.52.6 available through pkg-config.
Frontend dependency installation, TypeScript checking and the Vite production
build passed. Rust formatting and `cargo check --manifest-path src-tauri/Cargo.toml`
also passed.

These checks do not validate the desktop GUI, live driver D-Bus communication,
controller hardware, or Debian packaging. Distribution support remains provisional.

## Driver submodule

`vendor/dualsense-neo` pins the driver fork at commit
`4eff49704a8b9facc2550a7aa62aef99fdbb8fd8`. The driver remains a separate
repository; no driver code is copied into the application.

For an existing clone:

```sh
git submodule update --init --recursive
```

Read `vendor/dualsense-neo/packaging/API.md` for the authoritative UI contract
and `vendor/dualsense-neo/packaging/README.md` for driver build/install instructions.
The application talks to the daemon; it must never open the controller's `hidraw`
device directly. Installation will reuse `packaging/dualsense-neo-setup`.

Bluetooth pairing, service startup and audio routing remain explicit user actions.
The Hub must not silently change the desktop's default audio output.

## API test panel

Run `bun run tauri dev` from a regular desktop user session to use the installed
driver. Browser preview renders the panel but disables native controls.
The panel queries `GetState` at startup, every two seconds and after each setting
change. It shows service availability, controller connection, child process state,
`pending`, and the raw state JSON. If the service is unavailable, it disables
settings and retries on the next poll.

Audio, microphone, haptics and lights have enable toggles. Audio, haptics and
lights have 0–100 level sliders with explicit Apply buttons. Lights also offer
all four modes and a stored fixed RGB color with an Apply color button.
Controls remain available when the service responds but the controller is
disconnected. Displayed values represent requested configuration; `pending`
indicates that the child has not applied it yet. Changes can interrupt audio
briefly, and settings reset when the daemon restarts.

Native calls are restricted to reading state and a typed, validated setting
command. This panel does not install the driver or manage the user service.

## Next steps

- Subscribe to driver state and device signals with reconnect handling.
- Add audio, microphone, haptics and lighting controls, including pending changes.
- Integrate driver installation and service management.
- Define persistent profiles and validate target distributions.
