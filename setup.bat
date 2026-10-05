@echo off
cd /d "%~dp0"
echo.
echo  Setting up Quasar Classifier. The first time takes a few minutes.
echo.
where python >nul 2>nul || (echo Python is not installed. Install Python 3.11 or 3.12 from python.org and tick "Add python.exe to PATH". & pause & exit /b 1)
where npm >nul 2>nul || (echo Node.js is not installed. Install the LTS version from nodejs.org. & pause & exit /b 1)
cd backend
if not exist .venv python -m venv .venv
call .venv\Scripts\activate
python -m pip install --upgrade pip >nul
pip install -r requirements.txt || goto :fail
if not exist .env copy ..\.env.example .env >nul
if not exist data\raw\star_classification.csv (python -m ml.make_demo_data || goto :fail)
echo Training the models. This takes about a minute...
python -m ml.train || goto :fail
cd ..\frontend
call npm install --no-audit --no-fund || goto :fail
cd ..
echo.
echo  Setup finished. Double-click run.bat to start Quasar Classifier.
pause
exit /b 0
:fail
echo.
echo  Setup stopped because of the error above.
pause
exit /b 1
