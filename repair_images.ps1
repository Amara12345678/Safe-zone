Add-Type -AssemblyName System.Drawing

$dir = "c:\Projects\sos app\assets\images\onboarding"
$files = Get-ChildItem -Path $dir -Filter "*.png" | Select-Object -ExpandProperty Name

foreach ($file in $files) {
    try {
        $path = Join-Path $dir $file
        $newPath = Join-Path $dir ($file + ".new")
        
        Write-Host "Processing $file..."
        $image = [System.Drawing.Image]::FromFile($path)
        $image.Save($newPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $image.Dispose()
        
        Remove-Item $path -Force
        Rename-Item $newPath $file
        Write-Host "Successfully converted $file to true PNG."
    } catch {
        Write-Host "Failed to process ${file}: $_"
    }
}
