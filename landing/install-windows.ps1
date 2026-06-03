$ErrorActionPreference = "Stop"

$ModelName = "qwen3:8b"
$TempDir = Join-Path $env:TEMP "CareerForgesInstall"

function Test-OllamaApi {
    try {
        Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 3 | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

$CareerForgesInstaller = Join-Path $TempDir "CareerForgesSetup.exe"

try {

    Write-Host ""
    Write-Host "=== CareerForges Installer ==="
    Write-Host ""

    Write-Host "Checking Ollama..."

    $OllamaInstalled = Get-Command ollama -ErrorAction SilentlyContinue

    if (-not $OllamaInstalled) {

        Write-Host "Ollama not found."
        Write-Host "Installing Ollama..."

        Invoke-Expression (Invoke-RestMethod "https://ollama.com/install.ps1")

        Start-Sleep -Seconds 10

        $env:PATH += ";$env:LOCALAPPDATA\Programs\Ollama"

        $OllamaInstalled = Get-Command ollama -ErrorAction SilentlyContinue

        if (-not $OllamaInstalled) {
            throw "Ollama installation failed."
        }

        Write-Host "Ollama installed successfully."
    }
    else {

        Write-Host "Ollama already installed."

    }

    Write-Host "Verifying Ollama CLI..."

    try {
        $Version = ollama -v

        if ($Version) {
            Write-Host $Version
        }
    }
    catch {
        throw "Ollama CLI is installed but not working."
    }

    Write-Host "Checking Ollama API..."

    if (-not (Test-OllamaApi)) {

        Write-Host "Starting Ollama..."

        $OllamaExe = Join-Path $env:LOCALAPPDATA "Programs\Ollama\Ollama.exe"

        if (-not (Test-Path $OllamaExe)) {
            throw "Unable to locate Ollama.exe"
        }

        Start-Process -FilePath $OllamaExe

        Write-Host "Waiting for Ollama API..."

        $Ready = $false

        for ($i = 0; $i -lt 300; $i++) {

            if (Test-OllamaApi) {
                $Ready = $true
                break
            }

            Start-Sleep -Seconds 1
        }

        if (-not $Ready) {
            throw "Ollama API did not become available. Please launch Ollama manually once and rerun the installer."
        }

        Write-Host "Ollama API is ready."
    }
    else {

        Write-Host "Ollama API already running."

    }

    Write-Host "Checking model..."

    $ModelExists = ollama list | Select-String "^$ModelName"

    if (-not $ModelExists) {

        Write-Host "Downloading $ModelName..."
        ollama pull $ModelName

    }
    else {

        Write-Host "$ModelName already installed."

    }

    Write-Host "Finding latest CareerForges release..."

    $Release = Invoke-RestMethod -Uri "https://api.github.com/repos/JoshiNaidu/career-forges/releases/latest"

    $Asset = $Release.assets |
        Where-Object { $_.name -like "*_x64-setup.exe" } |
        Select-Object -First 1

    if (-not $Asset) {
        throw "Unable to locate CareerForges Windows installer."
    }

    Write-Host "Downloading CareerForges..."

    Invoke-WebRequest -Uri $Asset.browser_download_url -OutFile $CareerForgesInstaller

    Write-Host "Installing CareerForges..."

    Start-Process -FilePath $CareerForgesInstaller -ArgumentList "/S" -Wait

    Write-Host ""
    Write-Host "✅ CareerForges installed successfully!"
    Write-Host ""

}
finally {

    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force
    }

}