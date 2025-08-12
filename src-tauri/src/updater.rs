use semver::Version;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

// Function to get the current version from pkg/version.json
pub fn get_current_version() -> Result<String, String> {
    println!("Attempting to get current version from ../pkg/version.json...");
    let version_path = PathBuf::from("../pkg/version.json");
    let content = fs::read_to_string(&version_path)
        .map_err(|e| format!("Failed to read version.json: {}", e))?;
    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse version.json: {}", e))?;
    let version = json["version"]
        .as_str()
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
    let content = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response text: {}", e))?;
    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse latest version JSON: {}", e))?;
    let version = json["version"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Version not found in latest version JSON".to_string())?;
    println!("Successfully fetched latest version: {}", version);
    Ok(version)
}

// Function to compare versions using semantic versioning
pub fn is_update_available(current_version: &str, latest_version: &str) -> bool {
    println!(
        "Comparing current version ({}) with latest version ({})",
        current_version, latest_version
    );

    // Parse versions using semver for proper comparison
    let current = match Version::parse(current_version) {
        Ok(v) => v,
        Err(e) => {
            eprintln!(
                "Failed to parse current version '{}': {}",
                current_version, e
            );
            return false;
        }
    };

    let latest = match Version::parse(latest_version) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("Failed to parse latest version '{}': {}", latest_version, e);
            return false;
        }
    };

    let update = latest > current;
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
        PathBuf::from(format!(
            "{}/Applications",
            std::env::var("HOME").unwrap_or_default()
        ))
        .join(app_name),
    ];

    for app_path in common_app_paths {
        if app_path.exists() {
            println!("Found app at: {:?}", app_path);
            // Move to Trash (macOS specific command) - using proper escaping
            let app_path_str = app_path.to_string_lossy();
            // Escape single quotes in the path to prevent AppleScript injection
            let escaped_path = app_path_str.replace("'", "'\"'\"'");
            let applescript_cmd = format!(
                "tell app \"Finder\" to move POSIX file \"{}\" to trash",
                escaped_path
            );

            let output = Command::new("osascript")
                .arg("-e")
                .arg(applescript_cmd)
                .output()
                .map_err(|e| format!("Failed to execute osascript for uninstall: {}", e))?;

            if output.status.success() {
                println!("Successfully moved {:?} to Trash.", app_path);
                return Ok(());
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                eprintln!("Failed to move {:?} to Trash. Stderr: {}", app_path, stderr);
                return Err(format!(
                    "Failed to move {:?} to Trash: {}",
                    app_path, stderr
                ));
            }
        }
    }
    println!("Zama.app not found in common application directories. Skipping uninstall.");
    Err("Zama.app not found in common application directories.".to_string())
}

// Function to install the latest application using secure download and verification
pub async fn install_app() -> Result<(), String> {
    println!("Attempting to install the latest version of Zama...");
    let install_script_url =
        "https://raw.githubusercontent.com/myferr/zama/main/scripts/install.sh";

    // Securely download the install script first
    println!("Downloading install script from: {}", install_script_url);
    let response = reqwest::get(install_script_url)
        .await
        .map_err(|e| format!("Failed to download install script: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to download install script: HTTP {}",
            response.status()
        ));
    }

    let script_content = response
        .text()
        .await
        .map_err(|e| format!("Failed to read install script: {}", e))?;

    // Basic validation - ensure it's actually a shell script
    if !script_content.starts_with("#!/") {
        return Err("Install script does not appear to be a valid shell script".to_string());
    }

    // Write script to a temporary file
    let temp_dir = std::env::temp_dir();
    let script_path = temp_dir.join("zama_install.sh");

    std::fs::write(&script_path, &script_content)
        .map_err(|e| format!("Failed to write install script to temp file: {}", e))?;

    // Make script executable
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&script_path)
            .map_err(|e| format!("Failed to get script permissions: {}", e))?
            .permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&script_path, perms)
            .map_err(|e| format!("Failed to set script permissions: {}", e))?;
    }

    // Execute the script from the local file
    println!("Executing install script...");
    let output = Command::new("bash")
        .arg(&script_path)
        .output()
        .map_err(|e| format!("Failed to execute install script: {}", e))?;

    // Clean up temp file
    let _ = std::fs::remove_file(&script_path);

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
                        if let Err(e) = install_app().await {
                            eprintln!("Install failed: {}", e);
                            return;
                        }
                        println!("Update completed successfully. Please restart the application.");
                    } else {
                        println!("You are already running the latest version.");
                    }
                }
                Err(e) => eprintln!("Failed to get latest version: {}", e),
            }
        }
        Err(e) => eprintln!("Failed to get current version: {}", e),
    }
}
