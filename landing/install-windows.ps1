$ErrorActionPreference = "Stop"

$ModelName = "qwen3:8b"

$TempDir = Join-Path $env:TEMP "CareerForgesInstall"

if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

$CareerForgesInstaller = Join-Path $TempDir "CareerForgesSetup.exe"
$OllamaInstaller = Join-Path $TempDir "OllamaSetup.exe"

try {

    Write-Host ""
    Write-Host "=== CareerForges Installer ==="
    Write-Host ""

    Write-Host "Checking Ollama..."

    $OllamaInstalled = Get-Command ollama -ErrorAction SilentlyContinue

    if (-not $OllamaInstalled) {

        Write-Host "Downloading Ollama..."

        Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $OllamaInstaller

        Write-Host "Installing Ollama..."

        Start-Process -FilePath $OllamaInstaller -ArgumentList "/S" -Wait

        Start-Sleep -Seconds 5

    }
    else {

        Write-Host "Ollama already installed."

    }

    Write-Host "Starting Ollama..."

    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden -ErrorAction SilentlyContinue

    Write-Host "Waiting for Ollama..."

    $Ready = $false

    for ($i = 0; $i -lt 20; $i++) {

        try {

            Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2 | Out-Null

            $Ready = $true
            break

        }
        catch {

            Start-Sleep -Seconds 1

        }

    }

    if (-not $Ready) {

        throw "Ollama failed to start."

    }

    Write-Host "Checking model..."

    $ModelExists = ollama list | Select-String $ModelName

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

}
finally {

    if (Test-Path $TempDir) {

        Remove-Item $TempDir -Recurse -Force

    }

}