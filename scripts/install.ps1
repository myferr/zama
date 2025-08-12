$repo = "myferr/zama"
$latestReleaseUrl = "https://api.github.com/repos/$repo/releases/latest"

function Write-Zama {
    param(
        [string]$Message,
        [ConsoleColor]$Color = "White"
    )
    Write-Host "[zama] " -ForegroundColor Blue -NoNewline
    Write-Host $Message -ForegroundColor $Color
}

try {
    $releaseInfo = Invoke-RestMethod -Uri $latestReleaseUrl
    $latestTag = $releaseInfo.tag_name
} catch {
    Write-Zama "Could not fetch the latest release tag: $($_.Exception.Message)" Red
    exit 1
}

if ([string]::IsNullOrEmpty($latestTag)) {
    Write-Zama "Could not fetch the latest release tag." Red
    exit 1
}

Write-Zama "Latest release: $latestTag" Green

$osPlatform = ""
if ([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)) {
    $osPlatform = "Windows"
} elseif ([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::OSX)) {
    $osPlatform = "macOS"
} elseif ([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Linux)) {
    $osPlatform = "Linux"
} else {
    Write-Zama "Unsupported operating system." Red
    exit 1
}

$arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()

$downloadUrlBase = "https://github.com/$repo/releases/download/$latestTag"
$filename = ""

$version = $latestTag
if ($version.StartsWith("v")) {
    $version = $version.Substring(1)
}

switch ($osPlatform) {
    "Linux" {
        if ($arch -eq "X64") {
            $filename = "zama_${version}_amd64.AppImage"
        } elseif ($arch -eq "Arm64") {
            $filename = "zama_${version}_arm64.AppImage"
        } else {
            Write-Zama "Unsupported architecture for Linux: $arch" Red
            exit 1
        }
    }
    "macOS" {
        if ($arch -eq "X64") {
            $filename = "zama_${version}_x64.dmg"
        } elseif ($arch -eq "Arm64") {
            $filename = "zama_${version}_aarch64.dmg"
        } else {
            Write-Zama "Unsupported architecture for macOS: $arch" Red
            exit 1
        }
    }
    "Windows" {
        if ($arch -eq "X64") {
            $filename = "zama_${version}_x64-setup.exe"
        } else {
            Write-Zama "Unsupported architecture for Windows: $arch" Red
            exit 1
        }
    }
}

if ([string]::IsNullOrEmpty($filename)) {
    Write-Zama "Could not determine filename for your system." Red
    exit 1
}

$downloadUrl = "$downloadUrlBase/$filename"
Write-Zama "Downloading $filename from $downloadUrl" Yellow

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $filename -UseBasicParsing
    Write-Zama "Download complete: $filename" Green
} catch {
    Write-Zama "Download failed: $($_.Exception.Message)" Red
    exit 1
}

start $filename
