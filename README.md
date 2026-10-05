# DualSense Neo Hub

Linux desktop companion for the [DualSense Neo driver](https://github.com/Galarcon128/dualsense-neo).
The planned application installs and manages the driver and controls Bluetooth audio,
microphone, haptics and lighting. This initial scaffold includes a manual, read-only
connection check through the driver's versioned session D-Bus API.

## Stack

- Tauri 2 and Rust, with zbus for session D-Bus access.
- React, TypeScript and Vite for the interface.
- Bun 1.4.2 for frontend dependencies and scripts; Cargo for Rust dependencies.
- Debian packages as the initial distribution target. Supported Ubuntu/Linux Mint
  releases still need to be selected and validated.

## Development

GitHub repository creation and the initial push are pending authentication/network
access. The clone command below describes the intended remote once published.

Install Bun, Rust and the [Tauri Linux prerequisites](https://v2.tauri.app/start/prerequisites/),
including GTK 3 and WebKitGTK 4.1 development packages.

```sh
git clone --recurse-submodules https://github.com/Galarcon128/dualsense-neo-hub.git
cd dualsense-neo-hub
bun install
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

Commit the generated `bun.lock` and `src-tauri/Cargo.lock` after the first successful
dependency installation. Initial workspace setup could not resolve dependencies
because network access was restricted; compilation has not yet been validated.

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

## Next steps

- Subscribe to driver state and device signals with reconnect handling.
- Add audio, microphone, haptics and lighting controls, including pending changes.
- Integrate driver installation and service management.
- Define persistent profiles and validate target distributions.
