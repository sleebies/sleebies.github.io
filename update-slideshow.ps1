# Rebuilds slideshow.js from whatever pictures are in the slideshow folder.
# Run it with update-slideshow.bat. The live site does this by itself when it deploys.
$names = Get-ChildItem (Join-Path $PSScriptRoot 'slideshow') -File |
  Where-Object { $_.Extension -match '^\.(png|jpe?g|gif|webp)$' } |
  Sort-Object Name |
  ForEach-Object { '  ' + (ConvertTo-Json $_.Name) + ',' }
$text = "// List of home page slideshow pictures. Built automatically from the slideshow folder, no need to edit by hand.`nconst IMAGES = [`n" + ($names -join "`n") + "`n];`n"
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'slideshow.js'), $text)
Write-Host ("Slideshow list updated: " + $names.Count + " pictures.")
