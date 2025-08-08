$repo = "myferr/zama"
$latestReleaseUrl = "https://api.github.com/repos/$repo/releases/latest"

try {
    $releaseInfo = Invoke-RestMethod -Uri $latestReleaseUrl
    $latestTag = $releaseInfo.tag_name
} catch {
    Write-Error "Could not fetch the latest release tag: $($_.Exception.Message)"
    exit 1
}

if ([string]::IsNullOrEmpty($latestTag)) {
    Write-Error "Could not fetch the latest release tag."
    exit 1
}

Write-Host "Latest release: $latestTag"

$osPlatform = ""
if ([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)) {
    $osPlatform = "Windows"
} elseif ([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::OSX)) {
    $osPlatform = "macOS"
} elseif ([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Linux)) {
    $osPlatform = "Linux"
} else {
    Write-Error "Unsupported operating system."
    exit 1
}

$arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()

$downloadUrlBase = "https://github.com/$repo/releases/download/$latestTag"
$filename = ""

# Remove 'v' prefix from tag if present for filename consistency
$version = $latestTag
if ($version.StartsWith("v")) {
    $version = $version.Substring(1)
}

switch ($osPlatform) {
    "Linux" {
        if ($arch -eq "X64") {
            # Prioritize AppImage for Linux x64
            $filename = "zama_${version}_amd64.AppImage"
            # Alternative: $filename = "zama_${version}_amd64.deb"
        } elseif ($arch -eq "Arm64") {
            # Placeholder, adjust if different
            $filename = "zama_${version}_arm64.AppImage"
        } else {
            Write-Error "Unsupported architecture for Linux: $arch"
            exit 1
        }
    }
    "macOS" {
        if ($arch -eq "X64") {
            # Placeholder, adjust if different
            $filename = "zama_${version}_x64.dmg"
        } elseif ($arch -eq "Arm64") {
            $filename = "zama_${version}_aarch64.dmg"
        } else {
            Write-Error "Unsupported architecture for macOS: $arch"
            exit 1
        }
    }
    "Windows" {
        if ($arch -eq "X64") {
            # Prioritize .exe for Windows x64
            $filename = "zama_${version}_x64-setup.exe"
            # Alternative: $filename = "zama_${version}_x64_en-US.msi"
        } else {
            Write-Error "Unsupported architecture for Windows: $arch"
            exit 1
        }
    }
}

if ([string]::IsNullOrEmpty($filename)) {
    Write-Error "Could not determine filename for your system."
    exit 1
}

$downloadUrl = "$downloadUrlBase/$filename"
Write-Host "Downloading $filename from $downloadUrl"

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $filename -UseBasicParsing
    Write-Host "Download complete: $filename"
} catch {
    Write-Error "Download failed: $($_.Exception.Message)"
    exit 1
}

start $filename
