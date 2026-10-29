$ErrorActionPreference = 'Stop'
$source = (Resolve-Path (Join-Path $PSScriptRoot '../docs/GlobeTrek-Learning-Journal.docx')).Path
$outputDirectory = Join-Path $PSScriptRoot '../artifacts/journal-render'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$pdf = Join-Path (Resolve-Path $outputDirectory).Path 'journal.pdf'
$word = $null
$document = $null
try {
  # Isolated hidden automation instance; does not open or edit user documents.
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $document = $word.Documents.Open($source, $false, $true)
  $document.ExportAsFixedFormat($pdf, 17)
  Write-Output "Word rendered journal: $pdf"
} finally {
  if ($document) { $document.Close(0); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($document) }
  if ($word) { $word.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
}
