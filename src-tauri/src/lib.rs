// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn get_ollama_models() -> Result<String, String> {
    let res = reqwest::get("https://ollamadb.dev/api/v1/models?limit=200&skip=0")
        .await
        .map_err(|e| format!("Failed to fetch from ollamadb.dev: {}", e.to_string()))?;

    if !res.status().is_success() {
        return Err(format!("OllamaDB API returned non-success status: {}", res.status()));
    }

    res.text().await.map_err(|e| format!("Failed to read response text: {}", e.to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, get_ollama_models])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
