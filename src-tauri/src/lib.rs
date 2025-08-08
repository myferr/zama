use reqwest;

use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;

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

#[tauri::command]
async fn pull_model(model_name: String) -> Result<String, String> {
    let mut command = TokioCommand::new("ollama")
        .arg("pull")
        .arg(&model_name)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn ollama process: {}", e.to_string()))?;

    let stdout = command.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = command.stderr.take().ok_or("Failed to capture stderr")?;

    let mut stdout_reader = BufReader::new(stdout).lines();
    let mut stderr_reader = BufReader::new(stderr).lines();

    let mut output = String::new();

    loop {
        tokio::select! {
            line = stdout_reader.next_line() => {
                match line {
                    Ok(Some(l)) => {
                        println!("stdout: {}", l);
                        output.push_str(&l);
                        output.push_str("\n");
                    },
                    Ok(None) => break,
                    Err(e) => return Err(format!("Error reading stdout: {}", e.to_string())),
                }
            }
            line = stderr_reader.next_line() => {
                match line {
                    Ok(Some(l)) => {
                        println!("stderr: {}", l);
                        output.push_str(&l);
                        output.push_str("\n");
                    },
                    Ok(None) => break,
                    Err(e) => return Err(format!("Error reading stderr: {}", e.to_string())),
                }
            }
        }
    }

    let status = command.wait().await.map_err(|e| format!("Failed to wait for ollama process: {}", e.to_string()))?;

    if status.success() {
        Ok(format!("Model {} pulled successfully.\n{}", model_name, output))
    } else {
        Err(format!("Failed to pull model {}: {}\n{}", model_name, status, output))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, get_ollama_models, pull_model])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
