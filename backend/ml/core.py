"""Paths, class names and features shared by training and the API."""
from pathlib import Path

import numpy as np
import pandas as pd

BASE = Path(__file__).resolve().parents[1]
RAW = BASE / "data" / "raw"
ARTIFACTS = BASE / "artifacts"
for _p in (RAW, ARTIFACTS):
    _p.mkdir(parents=True, exist_ok=True)

RAW_CSV = RAW / "star_classification.csv"   # Kaggle: Stellar Classification Dataset - SDSS17
DEMO_MARKER = RAW / ".demo"                   # present while the CSV is synthetic
MODEL = ARTIFACTS / "lgbm.txt"
METRICS = ARTIFACTS / "metrics.json"
SAMPLE = ARTIFACTS / "sample.csv"             # held-out objects for the "random object" button

CLASSES = ["GALAXY", "QSO", "STAR"]          # label order used by the model
LABELS = {"GALAXY": "Galaxy", "QSO": "Quasar", "STAR": "Star"}

BANDS = ["u", "g", "r", "i", "z"]
INPUTS = BANDS + ["redshift"]
FEATURES = INPUTS + ["u_g", "g_r", "r_i", "i_z"]

FRIENDLY = {
    "redshift": "Redshift", "u_g": "u − g colour", "g_r": "g − r colour",
    "r_i": "r − i colour", "i_z": "i − z colour",
    "u": "Brightness", "g": "Brightness", "r": "Brightness", "i": "Brightness", "z": "Brightness",
}


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Keep the columns the model uses and drop broken readings (the survey marks some as -9999)."""
    missing = [c for c in INPUTS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing column(s): {', '.join(missing)}. Needed: {', '.join(INPUTS)}.")
    out = df.copy()
    for c in INPUTS:
        out[c] = pd.to_numeric(out[c], errors="coerce")
    ok = out[INPUTS].notna().all(axis=1)
    ok &= out[BANDS].gt(0).all(axis=1) & out[BANDS].lt(40).all(axis=1)
    ok &= out["redshift"].between(-0.1, 10)
    return out[ok]


def features(df: pd.DataFrame) -> pd.DataFrame:
    """Five magnitudes, redshift, and the four colour indices astronomers use."""
    X = df[INPUTS].astype(float).copy()
    X["u_g"] = X["u"] - X["g"]
    X["g_r"] = X["g"] - X["r"]
    X["r_i"] = X["r"] - X["i"]
    X["i_z"] = X["i"] - X["z"]
    return X[FEATURES]


def group_contributions(values: np.ndarray) -> dict:
    """Add SHAP values of the five magnitudes into one 'Brightness' factor."""
    out = {}
    for f, v in zip(FEATURES, values):
        name = FRIENDLY[f]
        out[name] = out.get(name, 0.0) + float(v)
    return out
