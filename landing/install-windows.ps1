$ErrorActionPreference = "Stop"

$TempDir = Join-Path $env:TEMP "CareerForgesInstall"

# ==========================================
# CareerForges Model Configuration
# ==========================================
# CareerForges can read this file after installation
# to determine which Ollama model was selected.
$CareerForgesConfigDir = Join-Path $env:ProgramData "CareerForges"
$CareerForgesConfigFile = Join-Path $CareerForgesConfigDir "config.json"

# ==========================================
# Available Models
# ==========================================
$AvailableModels = @(
    @{
        Id = 1
        Model = "qwen3:8b"
        Label = "⭐ Qwen 3 8B"
        Size = "5.2 GB"
        Description = "Recommended for CareerForges"
    },
    @{
        Id = 2
        Model = "qwen3.5:latest"
        Label = "🧠 Qwen 3.5"
        Size = "6.6 GB"
        Description = "Better reasoning"
    },
    @{
        Id = 3
        Model = "gemma3:4b"
        Label = "🚀 Gemma 3 4B"
        Size = "3 GB"
        Description = "Lightweight and fast"
    },
    @{
        Id = 4
        Model = "gemma3:12b"
        Label = "🔥 Gemma 3 12B"
        Size = "8 GB"
        Description = "Higher quality responses"
    },
    @{
        Id = 5
        Model = "deepseek-r1:8b"
        Label = "🔍 DeepSeek R1 8B"
        Size = "5 GB"
        Description = "Strong reasoning"
    },
    @{
        Id = 6
        Model = "qwen3:14b"
        Label = "🏆 Qwen 3 14B"
        Size = "10 GB"
        Description = "Best local quality"
    },
    @{
        Id = 7
        Model = "llama3.2:1b"
        Label = "⚡ Llama 3.2 1B"
        Size = "1.3 GB"
        Description = "Fastest option"
    }
)

function Write-Info {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Write-WarningMessage {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Yellow
}

function Write-ErrorMessage {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Red
}

function Test-OllamaApi {
    try {
        Invoke-RestMethod `
            -Uri "http://localhost:11434/api/tags" `
            -Method Get `
            -TimeoutSec 3 | Out-Null

        return $true
    }
    catch {
        return $false
    }
}

function Wait-ForOllamaApi {
    param(
        [int]$TimeoutSeconds = 300
    )

    Write-Info "Waiting for Ollama API to become available..."

    $Stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

    while ($Stopwatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {

        if (Test-OllamaApi) {
            $Stopwatch.Stop()
            return $true
        }

        Start-Sleep -Seconds 1
    }

    return $false
}

function Get-InstalledOllamaModels {

    try {

        $Output = ollama list 2>$null

        if (-not $Output) {
            return @()
        }

        $Models = @()

        foreach ($Line in $Output) {

            if ($Line -match "^NAME\s+") {
                continue
            }

            $Trimmed = $Line.Trim()

            if ([string]::IsNullOrWhiteSpace($Trimmed)) {
                continue
            }

            $ModelName = ($Trimmed -split '\s+')[0]

            if (-not [string]::IsNullOrWhiteSpace($ModelName)) {
                $Models += $ModelName
            }
        }

        return $Models | Sort-Object -Unique
    }
    catch {
        return @()
    }
}

function Select-CareerForgesModel {

    $InstalledModels = Get-InstalledOllamaModels

    if ($InstalledModels.Count -gt 0) {

        Write-Host ""
        Write-Host "Installed Models:"
        Write-Host ""

        foreach ($Model in $InstalledModels) {
            Write-Host "✓ $Model"
        }

        Write-Host ""
        Write-Host "[1] Use Existing Model"
        Write-Host "[2] Choose Another Model"
        Write-Host ""

        do {
            $Choice = Read-Host "Select an option (1-2)"
        } until ($Choice -in @("1", "2"))

        if ($Choice -eq "1") {

            Write-Host ""

            for ($i = 0; $i -lt $InstalledModels.Count; $i++) {
                Write-Host "[$($i + 1)] $($InstalledModels[$i])"
            }

            Write-Host ""

            do {
                $Selection = Read-Host "Choose a model"
                $Valid = ($Selection -as [int]) -and
                         ([int]$Selection -ge 1) -and
                         ([int]$Selection -le $InstalledModels.Count)
            }
            until ($Valid)

            return $InstalledModels[[int]$Selection - 1]
        }
    }

    Write-Host ""
    Write-Host "Available Models"
    Write-Host ""

    foreach ($Model in $AvailableModels) {

        Write-Host "Option $($Model.Id)"
        Write-Host "Model: $($Model.Model)"
        Write-Host "Label: $($Model.Label)"
        Write-Host "Size: $($Model.Size)"
        Write-Host "Description: $($Model.Description)"
        Write-Host ""
    }

    do {
        $Choice = Read-Host "Select a model (1-7)"
        $Valid = ($Choice -as [int]) -and
                 ([int]$Choice -ge 1) -and
                 ([int]$Choice -le 7)
    }
    until ($Valid)

    return (
        $AvailableModels |
        Where-Object { $_.Id -eq [int]$Choice } |
        Select-Object -ExpandProperty Model
    )
}

function Save-CareerForgesModelConfig {
    param(
        [Parameter(Mandatory)]
        [string]$Model
    )

    try {

        New-Item `
            -ItemType Directory `
            -Path $CareerForgesConfigDir `
            -Force | Out-Null

        $Config = @{
            selectedModel = $Model
            configuredAt  = (Get-Date).ToString("o")
        }

        $Config |
            ConvertTo-Json -Depth 5 |
            Set-Content -Path $CareerForgesConfigFile -Encoding UTF8

        Write-Success "Saved CareerForges model configuration."
        Write-Host "Config: $CareerForgesConfigFile"
    }
    catch {
        Write-WarningMessage "Unable to save model configuration: $($_.Exception.Message)"
    }
}

if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

$CareerForgesInstaller = Join-Path $TempDir "CareerForgesSetup.exe"
$SelectedModel = $null

try {

    Write-Host ""
    Write-Host "===================================="
    Write-Host "      CareerForges Installer"
    Write-Host "===================================="
    Write-Host ""

    # ==========================================
    # Check Ollama Installation
    # ==========================================

    Write-Info "Checking Ollama..."

    $OllamaInstalled = Get-Command ollama -ErrorAction SilentlyContinue

    if (-not $OllamaInstalled) {

        Write-WarningMessage "Ollama not found."
        Write-Info "Installing Ollama..."

        try {

            Invoke-Expression (Invoke-RestMethod "https://ollama.com/install.ps1")

            Start-Sleep -Seconds 10

            $env:PATH += ";$env:LOCALAPPDATA\Programs\Ollama"

            $OllamaInstalled = Get-Command ollama -ErrorAction SilentlyContinue

            if (-not $OllamaInstalled) {
                throw "Ollama installation verification failed."
            }

            Write-Success "Ollama installed successfully."
        }
        catch {
            throw "Failed to install Ollama. $($_.Exception.Message)"
        }
    }
    else {

        Write-Success "Ollama already installed."
    }

    # ==========================================
    # Verify CLI
    # ==========================================

    Write-Info "Verifying Ollama CLI..."

    try {

        $Version = ollama -v

        if (-not $Version) {
            throw "No version information returned."
        }

        Write-Success $Version
    }
    catch {
        throw "Ollama CLI is installed but not functioning correctly."
    }

    # ==========================================
    # Verify API
    # ==========================================

    Write-Info "Checking Ollama API..."

    if (-not (Test-OllamaApi)) {

        Write-WarningMessage "Ollama API is not running."
        Write-Info "Starting Ollama service..."

        try {

            Start-Process `
                -FilePath "ollama" `
                -ArgumentList "serve" `
                -WindowStyle Hidden `
                -ErrorAction Stop | Out-Null

            $ApiReady = Wait-ForOllamaApi -TimeoutSeconds 300

            if (-not $ApiReady) {
                throw "Timed out waiting for Ollama API after 300 seconds."
            }

            Write-Success "Ollama API is ready."
        }
        catch {
            throw "Failed to start Ollama service. $($_.Exception.Message)"
        }
    }
    else {

        Write-Success "Ollama API already running."
    }

    # ==========================================
    # Model Selection
    # ==========================================

    Write-Host ""
    Write-Host "===================================="
    Write-Host "Model Selection"
    Write-Host "===================================="

    $SelectedModel = Select-CareerForgesModel

    if ([string]::IsNullOrWhiteSpace($SelectedModel)) {
        throw "No model selected."
    }

    Write-Host ""
    Write-Info "Selected model: $SelectedModel"

    $InstalledModels = Get-InstalledOllamaModels

    if ($InstalledModels -contains $SelectedModel) {

        Write-Success "Model already installed. Reusing existing model."
    }
    else {

        Write-Info "Downloading model: $SelectedModel"

        try {

            ollama pull $SelectedModel

            Write-Success "Model downloaded successfully."
        }
        catch {
            throw "Failed to download model '$SelectedModel'."
        }
    }

    # ==========================================
    # Download CareerForges
    # ==========================================

    Write-Info "Finding latest CareerForges release..."

    try {

        $Release = Invoke-RestMethod `
            -Uri "https://api.github.com/repos/JoshiNaidu/career-forges/releases/latest"

        $Asset = $Release.assets |
            Where-Object { $_.name -like "*_x64-setup.exe" } |
            Select-Object -First 1

        if (-not $Asset) {
            throw "Windows installer asset not found."
        }
    }
    catch {
        throw "Unable to locate latest CareerForges release. $($_.Exception.Message)"
    }

    Write-Info "Downloading CareerForges..."

    try {

        Invoke-WebRequest `
            -Uri $Asset.browser_download_url `
            -OutFile $CareerForgesInstaller

        if (-not (Test-Path $CareerForgesInstaller)) {
            throw "Installer download verification failed."
        }

        Write-Success "Download completed."
    }
    catch {
        throw "Failed to download CareerForges installer. $($_.Exception.Message)"
    }

    # ==========================================
    # Install CareerForges
    # ==========================================

    Write-Info "Installing CareerForges..."

    try {

        Start-Process `
            -FilePath $CareerForgesInstaller `
            -ArgumentList "/S" `
            -Wait `
            -ErrorAction Stop

        Write-Success "CareerForges installed successfully."
    }
    catch {
        throw "CareerForges installation failed. $($_.Exception.Message)"
    }

    # ==========================================
    # Persist Selected Model
    # ==========================================

    Write-Info "Saving CareerForges configuration..."

    Save-CareerForgesModelConfig -Model $SelectedModel

    Write-Host ""
    Write-Success "✅ CareerForges installed successfully!"
    Write-Host ""
    Write-Host "Selected Model: $SelectedModel"
    Write-Host ""

}
catch {

    Write-Host ""
    Write-ErrorMessage "Installation failed."
    Write-ErrorMessage $_.Exception.Message
    Write-Host ""

    exit 1
}
finally {

    try {

        if (Test-Path $TempDir) {
            Remove-Item `
                -Path $TempDir `
                -Recurse `
                -Force `
                -ErrorAction SilentlyContinue
        }
    }
    catch {
    }
}