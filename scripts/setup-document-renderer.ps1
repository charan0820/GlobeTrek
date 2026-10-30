$ErrorActionPreference = 'Stop'
# Administrative extraction only. Run explicitly with the user's access approval.
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$taskCache = Join-Path $taskRoot '.cache/document-renderer'
New-Item -ItemType Directory -Path $taskCache -Force | Out-Null
$taskPackage = Join-Path $taskCache 'LibreOffice_26.8.2_Win_x86-64.msi'
$taskSource = 'https://download.documentfoundation.org/libreoffice/stable/26.8.2/win/x86_64/LibreOffice_26.8.2_Win_x86-64.msi'
if (!(Test-Path -LiteralPath $taskPackage)) { Invoke-WebRequest $taskSource -OutFile $taskPackage }
$taskSignature = Get-AuthenticodeSignature -LiteralPath $taskPackage
if ($taskSignature.Status -ne 'Valid' -or $taskSignature.SignerCertificate.Subject -notmatch 'Document Foundation') { throw 'The official document-renderer signature could not be verified.' }
$taskDestination = Join-Path $taskCache 'extracted'
$taskLog = Join-Path $taskCache 'extraction.log'
$taskProcess = Start-Process -FilePath msiexec.exe -ArgumentList @('/a', ('"' + $taskPackage + '"'), '/qn', ('TARGETDIR="' + $taskDestination + '"'), '/l*v', ('"' + $taskLog + '"')) -WindowStyle Hidden -PassThru -Wait
if ($taskProcess.ExitCode -ne 0) { throw "Renderer extraction failed with exit code $($taskProcess.ExitCode). See $taskLog" }
Get-ChildItem -LiteralPath $taskDestination -Filter soffice.exe -Recurse | Select-Object -ExpandProperty FullName
