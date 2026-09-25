@echo off
setlocal

set "STYLEID=%~1"
if "%STYLEID%"=="" set "STYLEID=2"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$styleId=[int]'%STYLEID%';" ^
  "$body=@{styleId=$styleId}|ConvertTo-Json;" ^
  "$r=Invoke-RestMethod -Uri 'http://127.0.0.1:50022/sample' -Method Post -ContentType 'application/json' -Body $body;" ^
  "if(-not $r.saved){throw 'VOICEVOX sample generation failed.'};" ^
  "$bytes=[IO.File]::ReadAllBytes($r.filePath);" ^
  "$publicPath='voicevox-samples/'+$r.fileName;" ^
  "$payload=@{message=('Publish VOICEVOX sample style '+$styleId);content=[Convert]::ToBase64String($bytes);branch='main'}|ConvertTo-Json -Compress;" ^
  "$payload | gh api --method PUT ('repos/momotarou2025desu-pixel/momotarou2025desu-pixel.github.io/contents/'+$publicPath) --input - | Out-Null;" ^
  "$raw='https://raw.githubusercontent.com/momotarou2025desu-pixel/momotarou2025desu-pixel.github.io/main/'+$publicPath;" ^
  "$page='https://momotarou2025desu-pixel.github.io/'+$publicPath;" ^
  "Write-Host '';" ^
  "Write-Host 'PUBLISHED' -ForegroundColor Green;" ^
  "Write-Host ('speakerName : '+$r.speakerName);" ^
  "Write-Host ('styleName   : '+$r.styleName);" ^
  "Write-Host ('styleId     : '+$styleId);" ^
  "Write-Host ('rawUrl      : '+$raw) -ForegroundColor Cyan;" ^
  "Write-Host ('pageUrl     : '+$page);" ^
  "Set-Clipboard $raw;" ^
  "Write-Host '';" ^
  "Write-Host 'rawUrl copied to clipboard.' -ForegroundColor Green"

if errorlevel 1 (
  echo.
  echo Failed.
  pause
  exit /b 1
)

echo.
echo Complete.
pause
endlocal
