"""Quasar Classifier API.

Run locally:  uvicorn app.main:app --reload --port 8000
Docs:         http://localhost:8000/docs
"""
import io
import os
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from .service import NotReady, Service

app = FastAPI(title="Quasar Classifier API", version="1.0.0",
              description="Classifies SDSS objects as stars, galaxies or quasars from their colours and redshift.")
origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"], allow_headers=["*"])

_service: Service | None = None


def service() -> Service:
    global _service
    if _service is None:
        try:
            _service = Service()
        except NotReady as exc:
            raise HTTPException(status_code=503, detail=str(exc))
    return _service


class SkyObject(BaseModel):
    u: float = Field(..., ge=0, le=40, description="Brightness in the ultraviolet filter (magnitude)")
    g: float = Field(..., ge=0, le=40, description="Green filter magnitude")
    r: float = Field(..., ge=0, le=40, description="Red filter magnitude")
    i: float = Field(..., ge=0, le=40, description="Near-infrared filter magnitude")
    z: float = Field(..., ge=0, le=40, description="Infrared filter magnitude")
    redshift: float = Field(..., ge=-0.1, le=10, description="How fast the object moves away from us")


@app.get("/api/health")
def health():
    try:
        s = service()
        return {"status": "ok", "data_source": s.metrics.get("data_source")}
    except HTTPException as exc:
        return {"status": "not_ready", "detail": exc.detail}


@app.get("/api/meta")
def meta():
    return service().meta()


@app.post("/api/predict")
def predict(obj: SkyObject):
    try:
        return service().predict_one(obj.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@app.post("/api/predict-csv")
async def predict_csv(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="Upload a .csv file with columns u, g, r, i, z and redshift.")
    data = await file.read()
    if len(data) > 5_000_000:
        raise HTTPException(status_code=413, detail="That file is over 5 MB. Upload a smaller one.")
    try:
        df = pd.read_csv(io.BytesIO(data))
    except Exception:
        raise HTTPException(status_code=422, detail="That file couldn't be read as a CSV.")
    try:
        return service().predict_csv(df)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@app.get("/api/random")
def random_object():
    try:
        return service().random_object()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


STATIC_DIR = Path(os.getenv("STATIC_DIR", Path(__file__).resolve().parents[1] / "static"))
if STATIC_DIR.is_dir() and (STATIC_DIR / "index.html").exists():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="web")
