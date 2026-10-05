# Project instructions

- Write repository documentation and code-facing text in English.
- Use Bun for frontend dependencies and scripts; Cargo for Rust.
- Keep native integration in `src-tauri`; the React UI calls narrow Tauri commands.
- The driver lives in `vendor/dualsense-neo` as a pinned Git submodule. Do not
  change its revision or implementation unless the task requires it.
- Use the driver's documented session D-Bus API. Never write directly to hidraw.
- Keep installation privileges limited to the installer. Run the UI as the user.
- Do not silently pair devices, enable services or change default audio routing.
- Keep private handoffs in ignored `.tmp/`; do not commit credentials or local binaries.
