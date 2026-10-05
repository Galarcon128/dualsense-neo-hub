#[tauri::command]
async fn get_driver_state() -> Result<serde_json::Value, String> {
    let connection = zbus::Connection::session()
        .await
        .map_err(|e| format!("Cannot connect to session bus: {e}"))?;
    let proxy = zbus::Proxy::new(
        &connection,
        "io.github.Galarcon128.DualSenseNeo1",
        "/io/github/Galarcon128/DualSenseNeo",
        "io.github.Galarcon128.DualSenseNeo1",
    )
    .await
    .map_err(|e| format!("Cannot create driver proxy: {e}"))?;
    read_state(&proxy).await
}

async fn read_state(proxy: &zbus::Proxy<'_>) -> Result<serde_json::Value, String> {
    let state: String = proxy
        .call("GetState", &())
        .await
        .map_err(|e| format!("Cannot query DualSense Neo: {e}"))?;
    let state: serde_json::Value =
        serde_json::from_str(&state).map_err(|e| format!("Invalid driver state: {e}"))?;
    if state.get("api_version").and_then(|v| v.as_u64()) != Some(1) {
        return Err("Unsupported DualSense Neo API version".into());
    }
    Ok(state)
}

#[derive(serde::Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
enum DriverSetting {
    AudioEnabled { enabled: bool },
    MicEnabled { enabled: bool },
    HapticsEnabled { enabled: bool },
    LightsEnabled { enabled: bool },
    LightMode { mode: String },
    FixedColor { color: [u8; 3] },
    AudioLevel { level: u8 },
    HapticsLevel { level: u8 },
    LightsLevel { level: u8 },
}

#[tauri::command]
async fn set_driver_setting(setting: DriverSetting) -> Result<serde_json::Value, String> {
    match &setting {
        DriverSetting::LightMode { mode }
            if !["off", "fixed", "music-blue", "music-bands"].contains(&mode.as_str()) =>
        {
            return Err("Invalid light mode".into());
        }
        DriverSetting::AudioLevel { level }
        | DriverSetting::HapticsLevel { level }
        | DriverSetting::LightsLevel { level }
            if *level > 100 =>
        {
            return Err("Level must be between 0 and 100".into());
        }
        _ => {}
    }
    let connection = zbus::Connection::session()
        .await
        .map_err(|e| format!("Cannot connect to session bus: {e}"))?;
    let proxy = zbus::Proxy::new(
        &connection,
        "io.github.Galarcon128.DualSenseNeo1",
        "/io/github/Galarcon128/DualSenseNeo",
        "io.github.Galarcon128.DualSenseNeo1",
    )
    .await
    .map_err(|e| format!("Cannot create driver proxy: {e}"))?;
    // Check the version before sending any settings to the service.
    read_state(&proxy).await?;
    let result: zbus::Result<()> = match setting {
        DriverSetting::AudioEnabled { enabled } => proxy.call("SetAudioEnabled", &(enabled,)).await,
        DriverSetting::MicEnabled { enabled } => proxy.call("SetMicEnabled", &(enabled,)).await,
        DriverSetting::HapticsEnabled { enabled } => {
            proxy.call("SetHapticsEnabled", &(enabled,)).await
        }
        DriverSetting::LightsEnabled { enabled } => {
            proxy.call("SetLightsEnabled", &(enabled,)).await
        }
        DriverSetting::LightMode { mode } => proxy.call("SetLightMode", &(mode,)).await,
        DriverSetting::FixedColor { color: [r, g, b] } => {
            proxy.call("SetFixedColor", &(r, g, b)).await
        }
        DriverSetting::AudioLevel { level } => proxy.call("SetAudioLevel", &(level,)).await,
        DriverSetting::HapticsLevel { level } => proxy.call("SetHapticsLevel", &(level,)).await,
        DriverSetting::LightsLevel { level } => proxy.call("SetLightsLevel", &(level,)).await,
    };
    result.map_err(|e| format!("Cannot update DualSense Neo: {e}"))?;
    read_state(&proxy).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_driver_state,
            set_driver_setting
        ])
        .run(tauri::generate_context!())
        .expect("error while running DualSense Neo Hub");
}
