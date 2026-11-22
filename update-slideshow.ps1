# Rebuilds slideshow.js and photos.js from the pictures in the slideshow and photos folders.
# Run it with update-slideshow.bat. The live site does this by itself when it deploys.
function Build($folder, $var, $out) {
  $dir = Join-Path $PSScriptRoot $folder
  $names = @()
  if (Test-Path $dir) {
    $names = Get-ChildItem $dir -File |
      Where-Object { $_.Extension -match '^\.(png|jpe?g|gif|webp)$' } |
      Sort-Object Name |
      ForEach-Object { '  ' + (ConvertTo-Json $_.Name) + ',' }
  }
  $text = "// Built automatically from the $folder folder, no need to edit by hand.`nconst $var = [`n" + ($names -join "`n") + "`n];`n"
  [IO.File]::WriteAllText((Join-Path $PSScriptRoot $out), $text)
  Write-Host ("$folder updated: " + $names.Count + " pictures.")
}
Build 'slideshow' 'IMAGES' 'slideshow.js'
Build 'photos' 'PHOTOS' 'photos.js'
