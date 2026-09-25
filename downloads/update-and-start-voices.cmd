@echo off
setlocal
set "REPO="

for /d /r "%USERPROFILE%" %%D in (narou-character-analyzer) do (
  if exist "%%D\.git" (
    set "REPO=%%D"
    goto found
  )
)

echo narou-character-analyzer folder was not found.
pause
exit /b 1

:found
echo Updating:
echo %REPO%
git -C "%REPO%" pull --ff-only origin main
if errorlevel 1 (
  echo Update failed.
  pause
  exit /b 1
)

call "%REPO%\tools\NarouVoicevox.Local\start-voices.cmd"
endlocal
