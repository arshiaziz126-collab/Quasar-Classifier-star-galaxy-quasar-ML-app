# Quasar Classifier

Live demo : https://quasar-classifier-star-galaxy-quasa.vercel.app/
**Is it a star, a galaxy, or a quasar?** A machine learning app that classifies objects from the Sloan Digital Sky Survey (SDSS DR17) using their brightness in five colour filters and their redshift, and explains every answer with SHAP.

| Layer | Tech |
|---|---|
| Machine learning | Python, pandas, scikit-learn (logistic regression, random forest), LightGBM, TreeSHAP |
| API | FastAPI, Uvicorn |
| Frontend | React 18, Vite, GSAP ScrollTrigger, Lenis smooth scroll, canvas particle animation |
| Data | Stellar Classification Dataset, SDSS17 (Kaggle), 100,000 objects |
| Deploy | One Docker container (API + site), ready for Render |

---
<img width="1920" height="1080" alt="Screenshot 2026-10-06 112911" src="https://github.com/user-attachments/assets/3ac0560a-e969-498d-8e43-953e88502bf1" />

## Run it on Windows

You need **Python 3.11 or 3.12** (tick "Add python.exe to PATH") and **Node.js LTS**.

1. Double-click **`setup.bat`**. It creates a virtual environment, installs everything, creates demo data if no real data is present, and trains the models (about a minute).
2. Double-click **`run.bat`**. The API and the website start, and the browser opens http://localhost:5173.
3. Double-click **`stop.bat`** when you're done.

API docs: http://localhost:8000/docs

> The first run uses **synthetic demo data** so the app works immediately, and the site says so. Use the real dataset (below) before you present results.

### Run it by hand (any OS)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m ml.make_demo_data          # skip once you have the real file
python -m ml.train
uvicorn app.main:app --reload --port 8000

# second terminal
cd frontend
npm install
npm run dev                          # http://localhost:5173
```

---
<img width="1920" height="1080" alt="Screenshot 2026-10-06 112929" src="https://github.com/user-attachments/assets/c7adbd75-5bf8-4918-9f11-49aee7de9735" />

## Use the real dataset

1. Open https://www.kaggle.com/datasets/fedesoriano/stellar-classification-dataset-sdss17 and download it (free Kaggle login).
2. Unzip it and copy **`star_classification.csv`** into `backend/data/raw/` (replace the demo file).
3. Delete `backend/data/raw/.demo`.
4. Retrain: `python -m ml.train` (inside `backend`, with the virtual environment active).
5. Restart the app. The "synthetic demo data" notices disappear and every number on the site is now real.

--
<img width="1920" height="1080" alt="Screenshot 2026-10-06 112950" src="https://github.com/user-attachments/assets/5052555d-6f69-4c1d-b928-587dd1814009" />


## Deploy on Vercel (recommended: never sleeps)

The whole model also runs inside the browser, so the site can be hosted as static files with no server.

1. Train the model, then export it for the browser:
   ```
   python -m ml.train
   python -m ml.export_web
   ```
   This writes `frontend/public/model/` (about 1 MB). Commit it.
2. Push to GitHub.
3. On https://vercel.com choose **Add New > Project** and import the repo.
4. Set **Root Directory** to `frontend`. Vercel detects Vite.
5. Under **Environment Variables** add `VITE_MODE` = `static`.
6. Click **Deploy**.

In this mode the "why" bars use path-based contributions, a fast approximation of SHAP; the API version uses exact TreeSHAP. Predictions are identical in both.

<img width="1920" height="1080" alt="Screenshot 2026-10-06 113008" src="https://github.com/user-attachments/assets/2dd14e0b-5905-4b52-b639-d315314eec46" />

## Deploy on Render

1. Train with the real data so `backend/artifacts/` contains `lgbm.txt`, `metrics.json` and `sample.csv`. Commit them (raw data is ignored by git).
2. Push the project to GitHub.
3. On https://render.com choose **New > Blueprint** and pick the repo. `render.yaml` creates a free Docker web service.
4. Open the URL Render gives you. The same server serves the site and `/api`.

To stop the free service from sleeping, add a free monitor at https://uptimerobot.com that opens `/api/health` every 5 minutes.

---

## API

| Endpoint | What it does |
|---|---|
| `GET /api/health` | Whether the model is loaded |
| `GET /api/meta` | Dataset size, class counts, model scores, per-class recall, confusion matrix, SHAP importance |
| `POST /api/predict` | Classify one object. Body: `{"u":20.39,"g":19.97,"r":19.80,"i":19.73,"z":19.62,"redshift":2.031}`. Returns the class, probabilities and a SHAP explanation |
| `POST /api/predict-csv` | Upload a CSV (columns `u,g,r,i,z,redshift`, optional `class`, up to 5,000 rows). Returns a prediction per row, and accuracy if `class` is present |
| `GET /api/random` | Picks a real object the model never trained on, classifies it, and shows the true answer |

---

## How the model works

* **Cleaning:** keep the five magnitudes and redshift, drop ID and sky-position columns, and remove broken readings (the survey marks some as -9999).
* **Features:** the five magnitudes (u, g, r, i, z), redshift, and four colour indices: u − g, g − r, r − i, i − z.
* **Split:** stratified 80/20, so each class keeps its share in both sets.
* **Class balance:** galaxies are about 60% of the data, so every model weights the classes equally.
* **Models:** logistic regression (baseline), random forest, and LightGBM with early stopping. LightGBM is the model the app uses: it is close to the best accuracy, fast, and gives exact SHAP values.
* **Evaluation:** accuracy, macro F1, per-class precision and recall, and a confusion matrix on the 20% test set.
* **Explanations:** LightGBM's built-in TreeSHAP shows which clue pushed each prediction, with the five magnitudes grouped as "Brightness".
<img width="1920" height="1080" alt="Screenshot 2026-10-06 113022" src="https://github.com/user-attachments/assets/b0958108-0ede-4f72-a1f6-e1ba3bc62c30" />


### Limitations

* The model learns from labels made with spectroscopy. A new object still needs a measured redshift, which comes from that same expensive step.
* Galaxies with an active black hole can look like quasars, which is where most errors happen.
* The "Try it" map is a simplified two-dimensional view; the model itself uses all ten features.

---

## Project structure

```
quasar-classifier/
├── backend/
│   ├── app/          FastAPI app and prediction service
│   ├── ml/           shared features, demo data, training
│   ├── data/raw/     star_classification.csv (not committed)
│   └── artifacts/    trained model, metrics.json, sample.csv
├── frontend/src/     React app: particle story, panels, timeline, results, try-it console
├── Dockerfile, render.yaml
└── setup.bat, run.bat, stop.bat
```
