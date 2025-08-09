
use std::process::Command;
use std::fs;
use std::path::PathBuf;

// Function to get the current version from pkg/version.json
pub fn get_current_version() -> Result<String, String> {
    println!("Attempting to get current version from ../pkg/version.json...");
    let version_path = PathBuf::from("../pkg/version.json");
    let content = fs::read_to_string(&version_path)
        .map_err(|e| format!("Failed to read version.json: {}", e))?;
    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse version.json: {}", e))?;
    let version = json["version"].as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Version not found in version.json".to_string())?;
    println!("Successfully read current version: {}", version);
    Ok(version)
}

// Function to fetch the latest version from GitHub
pub async fn get_latest_version() -> Result<String, String> {
    let url = "https://raw.githubusercontent.com/myferr/zama/main/pkg/version.json";
    println!("Attempting to fetch latest version from GitHub: {}", url);
    let response = reqwest::get(url)
        .await
        .map_err(|e| format!("Failed to fetch latest version: {}", e))?;
    let content = response.text()
        .await
        .map_err(|e| format!("Failed to read response text: {}", e))?;
    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse latest version JSON: {}", e))?;
    let version = json["version"].as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Version not found in latest version JSON".to_string())?;
    println!("Successfully fetched latest version: {}", version);
    Ok(version)
}

// Function to compare versions
pub fn is_update_available(current_version: &str, latest_version: &str) -> bool {
    println!("Comparing current version ({}) with latest version ({})", current_version, latest_version);
    let update = latest_version > current_version;
    if update {
        println!("Update is available.");
    } else {
        println!("No update available.");
    }
    update
}

// Function to uninstall the current application (macOS specific)
pub fn uninstall_app() -> Result<(), String> {
    println!("Attempting to uninstall Zama.app...");
    let app_name = "Zama.app";
    let common_app_paths = vec![
        PathBuf::from("/Applications").join(app_name),
        PathBuf::from(format!("{}/Applications", std::env::var("HOME").unwrap_or_default())).join(app_name),
    ];

    for app_path in common_app_paths {
        if app_path.exists() {
            println!("Found app at: {:?}", app_path);
            // Move to Trash (macOS specific command)
            let output = Command::new("osascript")
                .arg("-e")
                .arg(format!("tell app \"Finder\" to move POSIX file \"{}\" to trash", app_path.to_string_lossy()))
                .output()
                .map_err(|e| format!("Failed to execute osascript for uninstall: {}", e))?;

            if output.status.success() {
                println!("Successfully moved {:?} to Trash.", app_path);
                return Ok(())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                eprintln!("Failed to move {:?} to Trash. Stderr: {}", app_path, stderr);
                return Err(format!("Failed to move {:?} to Trash: {}", app_path, stderr));
            }
        }
    }
    println!("Zama.app not found in common application directories. Skipping uninstall.");
    Err("Zama.app not found in common application directories.".to_string())
}

// Function to install the latest application using the install.sh script
pub fn install_app() -> Result<(), String> {
    println!("Attempting to install the latest version of Zama...");
    let install_script_url = "https://raw.githubusercontent.com/myferr/zama/main/scripts/install.sh";

    // Download and execute the install script
    println!("Executing install script from: {}", install_script_url);
    let output = Command::new("bash")
        .arg("-c")
        .arg(format!("curl -L {} | bash", install_script_url))
        .output()
        .map_err(|e| format!("Failed to execute install script: {}", e))?;

    if output.status.success() {
        println!("Installation script executed successfully.");
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        eprintln!("Installation script failed. Stderr: {}", stderr);
        Err(format!("Installation script failed: {}", stderr))
    }
}

// Main update function
pub async fn check_and_update() {
    println!("Checking for updates...");
    match get_current_version() {
        Ok(current_version) => {
            println!("Current version: {}", current_version);
            match get_latest_version().await {
                Ok(latest_version) => {
                    println!("Latest version available: {}", latest_version);
                    if is_update_available(&current_version, &latest_version) {
                        println!("Update available! Initiating update process...");
                        if let Err(e) = uninstall_app() {
                            eprintln!("Uninstall failed: {}", e);
                            // Continue with install even if uninstall fails, as it might be a fresh install or app not found
                        }
                        if let Err(e) = install_app() {
                            eprintln!("Install failed: {}", e);
                            return;
                        }
                        println!("Update completed successfully. Please restart the application.");
                    } else {
                        println!("You are already running the latest version.");
                    }
                },
                Err(e) => eprintln!("Failed to get latest version: {}", e),
            }
        },
        Err(e) => eprintln!("Failed to get current version: {}", e),
    }
}

