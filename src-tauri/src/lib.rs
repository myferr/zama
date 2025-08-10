use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;
use tokio::time::{timeout, Duration};

mod updater;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/ 
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn get_ollama_models() -> Result<String, String> {
    println!("Attempting to fetch models from ollamadb.dev...");
    let res = reqwest::get("https://ollamadb.dev/api/v1/models?limit=200&skip=0")
        .await
        .map_err(|e| {
            eprintln!("Error fetching from ollamadb.dev: {}", e);
            format!("Failed to fetch from ollamadb.dev: {}", e.to_string())
        })?;

    println!("Received response from ollamadb.dev with status: {}", res.status());
    if !res.status().is_success() {
        let status = res.status();
        let error_msg = format!("OllamaDB API returned non-success status: {}", status);
        eprintln!("{}", error_msg);
        return Err(error_msg);
    }

    res.text()
        .await
        .map_err(|e| {
            eprintln!("Error reading response text: {}", e);
            format!("Failed to read response text: {}", e.to_string())
        })
}

// Input validation helper
fn validate_model_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("Model name cannot be empty".to_string());
    }
    if name.len() > 200 {
        return Err("Model name is too long (max 200 characters)".to_string());
    }
    if name.trim() != name {
        return Err("Model name cannot have leading or trailing whitespace".to_string());
    }
    // Prevent basic injection attempts
    if name.contains(['<', '>', '"', '\'', '&', ';', '|', '`', '$']) {
        return Err("Model name contains invalid characters".to_string());
    }
    // Ensure it looks like a valid model name (alphanumeric, hyphens, underscores, colons for tags, dots for versions)
    if !name.chars().all(|c| c.is_alphanumeric() || matches!(c, '-' | '_' | ':' | '.' | '/')) {
        return Err("Model name contains invalid characters".to_string());
    }
    Ok(())
}

#[tauri::command]
async fn pull_model(model_name: String) -> Result<String, String> {
    // Validate input
    validate_model_name(&model_name)?;
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

    let status = command
        .wait()
        .await
        .map_err(|e| format!("Failed to wait for ollama process: {}", e.to_string()))?;

    if status.success() {
        Ok(format!(
            "Model {} pulled successfully.\n{}",
            model_name, output
        ))
    } else {
        Err(format!(
            "Failed to pull model {}: {}\n{}",
            model_name, status, output
        ))
    }
}

#[tauri::command]
async fn check_ollama_status() -> Result<String, String> {
    _check_and_start_ollama_logic().await
}

async fn _check_and_start_ollama_logic() -> Result<String, String> {
    println!("Attempting to check/start Ollama server...");
    let client = reqwest::Client::new();
    let ollama_url = "http://localhost:11434";

    // Check if Ollama is already running
    match timeout(Duration::from_secs(1), client.get(ollama_url).send()).await {
        Ok(Ok(res)) if res.status().is_success() => {
            return Ok("Ollama server is already running.".to_string());
        }
        _ => {
            // Ollama is not running, try to start it
            println!("Ollama server not found, attempting to start...");
            TokioCommand::new("ollama")
                .arg("serve")
                .spawn()
                .map_err(|e| format!("Failed to spawn ollama serve process: {}", e.to_string()))?;

            // Give Ollama some time to start up
            tokio::time::sleep(Duration::from_secs(5)).await;

            // Verify if Ollama started successfully
            match timeout(Duration::from_secs(5), client.get(ollama_url).send()).await {
                Ok(Ok(res)) if res.status().is_success() => {
                    Ok("Ollama server started successfully.".to_string())
                }
                _ => Err("Failed to start Ollama server or it did not respond.".to_string()),
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_ollama_models,
            pull_model,
            check_ollama_status
        ])
        .setup(|_app| {
            #[cfg(desktop)]
            tauri::async_runtime::spawn(async move {
                // Check for updates
                updater::check_and_update().await;

                // Original Ollama check
                match _check_and_start_ollama_logic().await {
                    Ok(msg) => println!("Ollama status: {}", msg),
                    Err(e) => eprintln!("Error checking/starting Ollama: {}", e),
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
