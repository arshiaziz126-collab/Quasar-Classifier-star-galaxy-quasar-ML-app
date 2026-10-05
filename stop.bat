@echo off
taskkill /FI "WINDOWTITLE eq Quasar API*" /T /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq Quasar Web*" /T /F >nul 2>nul
echo Quasar Classifier stopped.
