@echo off
setlocal
set "INSTALL=%LOCALAPPDATA%\NarouCharacterAnalyzer"
set "TMP=%TEMP%\NarouCharacterAnalyzerUpdate"
set "ZIP=%TEMP%\NarouCharacterAnalyzer-main.zip"

echo Updating NarouCharacterAnalyzer...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$zip='%ZIP%'; $tmp='%TMP%'; $install='%INSTALL%';" ^
  "if(Test-Path $zip){Remove-Item $zip -Force};" ^
  "if(Test-Path $tmp){Remove-Item $tmp -Recurse -Force};" ^
  "Invoke-WebRequest -UseBasicParsing 'https://github.com/momotarou2025desu-pixel/narou-character-analyzer/archive/refs/heads/main.zip' -OutFile $zip;" ^
  "Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force;" ^
  "$src=Join-Path $tmp 'narou-character-analyzer-main';" ^
  "New-Item -ItemType Directory -Force -Path $install | Out-Null;" ^
  "Copy-Item -Path (Join-Path $src '*') -Destination $install -Recurse -Force;" ^
  "Remove-Item $zip -Force;" ^
  "Remove-Item $tmp -Recurse -Force"

if errorlevel 1 (
  echo Update failed.
  pause
  exit /b 1
)

cd /d "%INSTALL%"

powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:5188/api/health' -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  start "NarouVoicevox.Local" cmd /k dotnet run --project tools\NarouVoicevox.Local\NarouVoicevox.Local.csproj
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$u='http://127.0.0.1:5188/api/health'; while($true){try{Invoke-WebRequest -UseBasicParsing $u -TimeoutSec 1 | Out-Null; break}catch{}; Start-Sleep -Milliseconds 300}; Start-Process 'http://127.0.0.1:5188/voices'"

endlocal
