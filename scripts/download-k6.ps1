$ErrorActionPreference = 'Stop'
# Optional, explicit download into this workspace; no system installation or PATH changes.
$release = Invoke-RestMethod -Uri 'https://api.github.com/repos/grafana/k6/releases/tags/v2.3.0'
$asset = $release.assets | Where-Object name -EQ 'k6-v2.3.0-windows-amd64.zip'
if (-not $asset) { throw 'Official release asset was not found.' }
$destination = Join-Path $PSScriptRoot '../.cache/k6'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$archive = Join-Path $destination $asset.name
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $archive
if ($asset.digest -like 'sha256:*') {
  $expected = $asset.digest.Substring(7)
} else {
  $checksums = $release.assets | Where-Object name -Match 'checksums.txt$' | Select-Object -First 1
  if (-not $checksums) { throw 'No release checksum found; refusing to execute an unverified binary.' }
  $checksumFile = Join-Path $destination 'checksums.txt'
  Invoke-WebRequest -Uri $checksums.browser_download_url -OutFile $checksumFile
  $line = Get-Content -LiteralPath $checksumFile | Where-Object { $_ -match [regex]::Escape($asset.name) } | Select-Object -First 1
  $expected = ($line -split '\s+')[0]
}
$actual = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
if ($actual -ne $expected) { throw 'k6 SHA256 checksum mismatch.' }
Expand-Archive -LiteralPath $archive -DestinationPath $destination -Force
$binary = Get-ChildItem -LiteralPath $destination -Filter k6.exe -Recurse | Select-Object -First 1
if (-not $binary) { throw 'k6 executable not found after extraction.' }
Write-Output "Verified k6 executable: $($binary.FullName)"
& $binary.FullName version
