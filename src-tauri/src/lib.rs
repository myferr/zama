use futures::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;
use tokio::time::{timeout, Duration};

mod updater;

const OLLAMA_BASE_URL: &str = "http://localhost:11434";
const HF_BASE_URL: &str = "https://huggingface.co";

// --- Ollama Client Schemas ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<Message>,
    pub stream: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatResponse {
    pub model: String,
    pub created_at: String,
    pub message: Option<Message>, // Message might be null for done: true responses
    pub done: bool,
    // Add other optional fields if needed, eg., total_duration, load_duration
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PullModelRequest {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeleteModelRequest {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ShowModelRequest {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelDetails {
    pub parent_model: Option<String>,
    pub format: String,
    pub family: String,
    pub families: Option<Vec<String>>,
    pub parameter_size: String,
    pub quantization_level: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ShowModelResponse {
    pub model: String,
    pub license: String,
    pub modelfile: String,
    pub parameters: Vec<String>,
    pub template: String,
    pub details: ModelDetails,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListModelEntry {
    pub name: String,
    pub modified_at: String,
    pub size: u64,
    pub digest: String,
    pub details: ModelDetails,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListModelsResponse {
    pub models: Vec<ListModelEntry>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConfigResponse {
    pub ollama_url: String, // Assuming this is the only field for now
}

// --- Hugging Face Client Schemas ---

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HfModel {
    pub model_id: String,
    pub pipeline_tag: Option<String>,
    pub downloads: Option<u64>,
    pub last_modified: Option<String>,
    // Add other fields as needed
}

// --- End of Schemas ---

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

#[tauri::command]
async fn list_ollama_models() -> Result<ListModelsResponse, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/tags", OLLAMA_BASE_URL);
    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to send request to Ollama: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let error_text = res
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!(
            "Ollama API returned non-success status: {} - {}",
            status, error_text
        ));
    }

    res.json::<ListModelsResponse>()
        .await
        .map_err(|e| format!("Failed to parse Ollama models response: {}", e))
}

#[tauri::command]
async fn delete_ollama_model(request: DeleteModelRequest) -> Result<String, String> {
    validate_model_name(&request.name)?;
    let client = reqwest::Client::new();
    let url = format!("{}/api/delete", OLLAMA_BASE_URL);
    let res = client
        .delete(&url)
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to send request to Ollama: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let error_text = res
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!(
            "Ollama API returned non-success status: {} - {}",
            status, error_text
        ));
    }

    Ok("Model deleted successfully".to_string())
}

#[tauri::command]
async fn show_ollama_model(request: ShowModelRequest) -> Result<ShowModelResponse, String> {
    validate_model_name(&request.name)?;
    let client = reqwest::Client::new();
    let url = format!("{}/api/show", OLLAMA_BASE_URL);
    let res = client
        .post(&url)
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to send request to Ollama: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let error_text = res
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!(
            "Ollama API returned non-success status: {} - {}",
            status, error_text
        ));
    }

    res.json::<ShowModelResponse>()
        .await
        .map_err(|e| format!("Failed to parse Ollama show model response: {}", e))
}

#[tauri::command]
async fn get_ollama_config() -> Result<ConfigResponse, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/config", OLLAMA_BASE_URL);
    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to send request to Ollama: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let error_text = res
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!(
            "Ollama API returned non-success status: {} - {}",
            status, error_text
        ));
    }

    res.json::<ConfigResponse>()
        .await
        .map_err(|e| format!("Failed to parse Ollama config response: {}", e))
}

#[tauri::command]
async fn chat_ollama(app_handle: tauri::AppHandle, request: ChatRequest) -> Result<(), String> {
    validate_model_name(&request.model)?;
    if request.messages.is_empty() {
        return Err("Chat request must include at least one message".to_string());
    }

    let client = reqwest::Client::new();
    let url = format!("{}/api/chat", OLLAMA_BASE_URL);

    let mut stream_request = request.clone();
    stream_request.stream = true; // Ensure streaming is enabled for the API call

    let res = client
        .post(&url)
        .json(&stream_request)
        .send()
        .await
        .map_err(|e| format!("Failed to send chat request to Ollama: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let error_text = res
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!(
            "Ollama API returned non-success status: {} - {}",
            status, error_text
        ));
    }

    let mut stream = res.bytes_stream();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Error reading stream: {}", e))?;
        let chunk_str = String::from_utf8_lossy(&chunk);

        for line in chunk_str.lines() {
            if line.trim().is_empty() {
                continue;
            }
            match serde_json::from_str::<ChatResponse>(line) {
                Ok(chat_response) => {
                    // Emit each chat response chunk as a Tauri event
                    app_handle
                        .emit("ollama-chat-chunk", chat_response)
                        .map_err(|e| format!("Failed to emit event: {}", e))?;
                }
                Err(e) => {
                    eprintln!("Failed to parse chat response chunk: {} - {}", e, line);
                    // Optionally, emit an error event or handle it differently
                }
            }
        }
    }

    Ok(())
}

#[tauri::command]
async fn list_hf_models(search: Option<String>) -> Result<Vec<HfModel>, String> {
    let client = reqwest::Client::new();
    let search_query = search.unwrap_or_else(|| "GGUF".to_string());
    let url = format!(
        "{}/api/models?search={}&pipeline_tag=text-generation&sort=downloads&direction=-1&limit=100",
        HF_BASE_URL, search_query
    );

    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to send request to Hugging Face: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let error_text = res
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!(
            "Hugging Face API returned non-success status: {} - {}",
            status, error_text
        ));
    }

    res.json::<Vec<HfModel>>()
        .await
        .map_err(|e| format!("Failed to parse Hugging Face models response: {}", e))
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
    if !name
        .chars()
        .all(|c| c.is_alphanumeric() || matches!(c, '-' | '_' | ':' | '.' | '/'))
    {
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
            list_ollama_models,
            delete_ollama_model,
            show_ollama_model,
            get_ollama_config,
            chat_ollama,
            pull_model,
            check_ollama_status,
            list_hf_models
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
