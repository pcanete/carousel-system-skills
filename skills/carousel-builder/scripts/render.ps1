# carousel-builder v2 — render, QA y conversión JPG.
# Uso: pwsh -File render.ps1 -Dir <carpeta-pieza> [-Width 1080] [-Height 1350]

param(
    [Parameter(Mandatory = $true)][string]$Dir,
    [int]$Width = 1080,
    [int]$Height = 1350,
    [ValidateRange(1, 100)][int]$JpegQuality = 92
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$pieceDir = [System.IO.Path]::GetFullPath($Dir)
if (-not (Test-Path -LiteralPath $pieceDir -PathType Container)) {
    Write-Error "No existe la carpeta de pieza: $pieceDir"
    exit 2
}

$edge = @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $edge) {
    Write-Error "No se encontró msedge.exe"
    exit 2
}

$buildDir = Join-Path $pieceDir "build"
if (-not (Test-Path -LiteralPath $buildDir -PathType Container)) {
    Write-Error "No existe build/ en $pieceDir; ejecutar build.mjs primero"
    exit 2
}

$htmls = Get-ChildItem -LiteralPath $buildDir -Filter "slide-*.html" -File |
    Where-Object { $_.BaseName -match "^slide-(\d+)$" } |
    Sort-Object { [int]($_.BaseName -replace "^slide-", "") }
if (-not $htmls) {
    Write-Error "No hay build/slide-*.html en $pieceDir"
    exit 2
}

# Eliminar solo capturas administradas por este pipeline.
Get-ChildItem -LiteralPath $buildDir -Filter "slide-*.png" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.BaseName -match "^slide-\d+$" } |
    Remove-Item -Force

$profileDir = Join-Path ([System.IO.Path]::GetTempPath()) ("carousel-render-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $profileDir | Out-Null
try {
    foreach ($html in $htmls) {
        $png = [System.IO.Path]::ChangeExtension($html.FullName, ".png")
        $url = ([System.Uri]::new($html.FullName)).AbsoluteUri
        & $edge --headless=new --disable-gpu --hide-scrollbars --no-first-run `
            --force-device-scale-factor=1 --allow-file-access-from-files `
            "--user-data-dir=$profileDir" --virtual-time-budget=8000 `
            "--window-size=$Width,$Height" "--screenshot=$png" $url 2>$null | Out-Null
        # Edge puede delegar el proceso y devolver el control antes de escribir la captura.
        for ($attempt = 0; $attempt -lt 100 -and -not (Test-Path -LiteralPath $png); $attempt++) {
            Start-Sleep -Milliseconds 100
        }
        if (-not (Test-Path -LiteralPath $png)) {
            Write-Error "Falló el render de $($html.Name)"
            exit 2
        }
    }
} finally {
    if (Test-Path -LiteralPath $profileDir) {
        Remove-Item -LiteralPath $profileDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

$failed = @()
foreach ($html in $htmls) {
    $png = [System.IO.Path]::ChangeExtension($html.FullName, ".png")
    $img = $null
    try {
        $img = [System.Drawing.Bitmap]::FromFile($png)
        if ($img.Width -ne $Width -or $img.Height -ne $Height) {
            $failed += $html.BaseName
            Write-Output "QA-FAIL $($html.BaseName) — captura de $($img.Width)x$($img.Height), se esperaba ${Width}x${Height}"
            continue
        }

        $sampleXs = @(8, [int]($img.Width / 2), ($img.Width - 8))
        $isRed = $false
        foreach ($x in $sampleXs) {
            $pixel = $img.GetPixel($x, $img.Height - 8)
            if ($pixel.R -gt 200 -and $pixel.G -lt 80 -and $pixel.B -lt 100) {
                $isRed = $true
                break
            }
        }

        if ($isRed) {
            $failed += $html.BaseName
            Write-Output "QA-FAIL $($html.BaseName) — abrir $png y leer la barra roja"
        } else {
            Write-Output "QA-OK   $($html.BaseName)"
        }
    } finally {
        if ($img) { $img.Dispose() }
    }
}

if ($failed.Count -gt 0) {
    Write-Output "QA fallido en: $($failed -join ', '). Nada pasa a final/ hasta corregir."
    exit 1
}

$finalDir = Join-Path $pieceDir "final"
New-Item -ItemType Directory -Path $finalDir -Force | Out-Null
Get-ChildItem -LiteralPath $finalDir -Filter "slide-*.jpg" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.BaseName -match "^slide-\d+$" } |
    Remove-Item -Force

$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq "image/jpeg" }
$parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
$parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality,
    [long]$JpegQuality
)

$index = 0
foreach ($html in $htmls) {
    $index++
    $png = [System.IO.Path]::ChangeExtension($html.FullName, ".png")
    $jpg = Join-Path $finalDir ("slide-{0:d2}.jpg" -f $index)
    $img = $null
    try {
        $img = [System.Drawing.Image]::FromFile($png)
        $img.Save($jpg, $encoder, $parameters)
    } finally {
        if ($img) { $img.Dispose() }
    }
}

Write-Output "QA-OK completo: $index JPGs en $finalDir"
