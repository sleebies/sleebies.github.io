@echo off
rem Double-click after adding or removing pictures in the slideshow folder.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-slideshow.ps1"
pause
