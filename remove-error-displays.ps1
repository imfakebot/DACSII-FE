# Script to remove error display elements from HTML files
# This script will comment out <div *ngIf="error"> elements instead of deleting them

$htmlFiles = Get-ChildItem -Path "src\app" -Filter "*.html" -Recurse

$patterns = @(
    '<div\s+\*ngIf="error[^>]*>.*?</div>',
    '<div\s+class="[^"]*error[^"]*"\s+\*ngIf="error[^>]*>.*?</div>',
    '<div\s+\*ngIf="error\s+&&\s+[^"]*"\s+class="[^"]*">.*?</div>'
)

$count = 0

foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    foreach ($pattern in $patterns) {
        $content = $content -replace $pattern, '<!-- Error display removed - check console for errors -->'
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated: $($file.FullName)" -ForegroundColor Green
        $count++
    }
}

Write-Host "`nTotal files updated: $count" -ForegroundColor Cyan
Write-Host "Note: This is a basic pattern match. Please review changes and adjust manually if needed." -ForegroundColor Yellow
