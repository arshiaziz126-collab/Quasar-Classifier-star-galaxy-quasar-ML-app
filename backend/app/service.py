"""Loads the trained model once and answers prediction requests."""
import json

import lightgbm as lgb
import numpy as np
import pandas as pd

from ml.core import MODEL, METRICS, SAMPLE, CLASSES, LABELS, FEATURES, INPUTS, clean, features, group_contributions

MAX_CSV_ROWS = 5000


class NotReady(RuntimeError):
    pass


class Service:
    def __init__(self):
        if not (MODEL.exists() and METRICS.exists()):
            raise NotReady("The model isn't trained yet. Run setup.bat (or `python -m ml.make_demo_data` "
                           "then `python -m ml.train`) and restart the API.")
        self.model = lgb.Booster(model_file=str(MODEL))
        self.metrics = json.loads(METRICS.read_text())
        self.sample = pd.read_csv(SAMPLE) if SAMPLE.exists() else None

    @staticmethod
    def _cls(i: int) -> dict:
        return {"key": CLASSES[i], "label": LABELS[CLASSES[i]]}

    def _explain(self, X: pd.DataFrame, k: int) -> list:
        contrib = self.model.predict(X, pred_contrib=True).reshape(len(CLASSES), len(FEATURES) + 1)
        grouped = group_contributions(contrib[k, :-1])
        total = sum(abs(v) for v in grouped.values()) or 1.0
        items = [{"factor": f, "effect": round(v, 3), "share": round(abs(v) / total, 3),
                  "direction": "for" if v > 0 else "against"} for f, v in grouped.items()]
        return sorted(items, key=lambda d: -d["share"])[:5]

    def predict_one(self, values: dict) -> dict:
        df = clean(pd.DataFrame([values]))
        if df.empty:
            raise ValueError("Those values look broken. Magnitudes should be between 0 and 40, "
                             "and redshift between -0.1 and 10.")
        X = features(df)
        p = self.model.predict(X)[0]
        k = int(np.argmax(p))
        return {
            "prediction": self._cls(k),
            "confidence": round(float(p[k]), 4),
            "probabilities": [{**self._cls(i), "p": round(float(v), 4)} for i, v in enumerate(p)],
            "explanation": self._explain(X, k),
            "input": {c: float(values[c]) for c in INPUTS},
        }

    def predict_csv(self, raw: pd.DataFrame) -> dict:
        raw.columns = [str(c).strip() for c in raw.columns]
        lower = {c.lower(): c for c in raw.columns}
        rename = {lower[c]: c for c in INPUTS + ["class"] if c in lower and lower[c] != c}
        raw = raw.rename(columns=rename)
        if len(raw) > MAX_CSV_ROWS:
            raise ValueError(f"That file has {len(raw):,} rows. Upload up to {MAX_CSV_ROWS:,} at a time.")
        df = clean(raw)
        if df.empty:
            raise ValueError("No usable rows found. Each row needs u, g, r, i, z and redshift as numbers.")
        proba = self.model.predict(features(df))
        pred = proba.argmax(axis=1)
        rows = []
        for (_, r), k, pr in zip(df.iterrows(), pred, proba):
            row = {c: round(float(r[c]), 5) for c in INPUTS}
            row.update({"prediction": LABELS[CLASSES[k]], "confidence": round(float(pr[k]), 4)})
            if "class" in df.columns and str(r["class"]).upper() in LABELS:
                row["actual"] = LABELS[str(r["class"]).upper()]
            rows.append(row)
        summary = {LABELS[c]: int((pred == i).sum()) for i, c in enumerate(CLASSES)}
        out = {"count": len(rows), "skipped": int(len(raw) - len(df)), "summary": summary, "rows": rows}
        if rows and all("actual" in r for r in rows):
            out["accuracy"] = round(sum(r["actual"] == r["prediction"] for r in rows) / len(rows) * 100, 2)
        return out

    def random_object(self) -> dict:
        if self.sample is None or self.sample.empty:
            raise ValueError("No sample objects saved. Run `python -m ml.train` again.")
        row = self.sample.sample(1).iloc[0]
        result = self.predict_one({c: float(row[c]) for c in INPUTS})
        result["actual"] = {"key": row["class"], "label": LABELS[row["class"]]}
        result["correct"] = result["actual"]["key"] == result["prediction"]["key"]
        return result

    def meta(self) -> dict:
        m = self.metrics
        return {k: m[k] for k in ("data_source", "rows", "rows_removed", "train_rows", "test_rows",
                                  "class_counts", "models", "classes", "confusion_pct", "importance")}
