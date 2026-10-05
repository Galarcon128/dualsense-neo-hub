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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_driver_state])
        .run(tauri::generate_context!())
        .expect("error while running DualSense Neo Hub");
}
