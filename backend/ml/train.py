"""Train and compare three classifiers, then save the best one (LightGBM) for the API.

Usage:  python -m ml.train
"""
import json
import time

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_sample_weight

from .core import (RAW_CSV, DEMO_MARKER, MODEL, METRICS, SAMPLE, CLASSES, LABELS, FEATURES, INPUTS,
                   clean, features, group_contributions)

PARAMS = {
    "objective": "multiclass", "num_class": len(CLASSES), "learning_rate": 0.05,
    "num_leaves": 63, "min_data_in_leaf": 30, "feature_fraction": 0.9,
    "bagging_fraction": 0.9, "bagging_freq": 1, "lambda_l2": 1.0, "verbose": -1, "seed": 42,
}


def main():
    if not RAW_CSV.exists():
        raise SystemExit(f"Missing {RAW_CSV}.\nRun `python -m ml.make_demo_data` for demo data, "
                         "or put the Kaggle file star_classification.csv there.")
    t0 = time.time()
    raw = pd.read_csv(RAW_CSV)
    if "class" not in raw.columns:
        raise SystemExit("The CSV has no 'class' column. Is this the SDSS17 stellar classification file?")
    df = clean(raw)
    df = df[df["class"].isin(CLASSES)]
    dropped = len(raw) - len(df)
    X = features(df)
    y = df["class"].map({c: i for i, c in enumerate(CLASSES)}).to_numpy()
    print(f"{len(df):,} objects after cleaning ({dropped} broken rows removed)")

    X_tr, X_te, y_tr, y_te, df_tr, df_te = train_test_split(
        X, y, df, test_size=0.2, stratify=y, random_state=42)
    w_tr = compute_sample_weight("balanced", y_tr)

    scores = []

    def score(name, detail, pred, chosen=False):
        acc = accuracy_score(y_te, pred)
        f1 = f1_score(y_te, pred, average="macro")
        scores.append({"name": name, "detail": detail, "accuracy": round(acc * 100, 2),
                       "macro_f1": round(f1, 4), **({"chosen": True} if chosen else {})})
        print(f"  {name:<20} accuracy {acc*100:.2f}%   macro F1 {f1:.4f}")

    print("Training models...")
    logreg = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000, class_weight="balanced"))
    logreg.fit(X_tr, y_tr)
    score("Logistic regression", "A straight-line baseline", logreg.predict(X_te))

    forest = RandomForestClassifier(n_estimators=200, min_samples_leaf=2, class_weight="balanced",
                                    n_jobs=-1, random_state=42)
    forest.fit(X_tr, y_tr)
    score("Random forest", "200 decision trees voting", forest.predict(X_te))

    cut = int(len(X_tr) * 0.9)
    probe = lgb.train(PARAMS, lgb.Dataset(X_tr.iloc[:cut], y_tr[:cut], weight=w_tr[:cut]),
                      num_boost_round=2000,
                      valid_sets=[lgb.Dataset(X_tr.iloc[cut:], y_tr[cut:], weight=w_tr[cut:])],
                      callbacks=[lgb.early_stopping(100, verbose=False)])
    rounds = max(probe.best_iteration, 100)
    model = lgb.train(PARAMS, lgb.Dataset(X_tr, y_tr, weight=w_tr), num_boost_round=rounds)
    proba = model.predict(X_te)
    pred = proba.argmax(axis=1)
    score("LightGBM", "Gradient boosting, the model in use", pred, chosen=True)
    model.save_model(str(MODEL))

    cm = confusion_matrix(y_te, pred, labels=range(len(CLASSES)))
    cm_pct = (cm / cm.sum(axis=1, keepdims=True) * 100).round(1)
    recall = recall_score(y_te, pred, average=None)
    precision = precision_score(y_te, pred, average=None)

    # SHAP: TreeSHAP built into LightGBM, averaged over classes and objects
    sample = X_te.sample(min(4000, len(X_te)), random_state=1)
    contrib = model.predict(sample, pred_contrib=True).reshape(len(sample), len(CLASSES), len(FEATURES) + 1)
    mean_abs = np.abs(contrib[:, :, :-1]).mean(axis=(0, 1))
    grouped = group_contributions(mean_abs)
    total = sum(grouped.values()) or 1.0
    importance = sorted(({"factor": k, "share": round(v / total, 3)} for k, v in grouped.items()),
                        key=lambda d: -d["share"])

    # Held-out objects for the app's "random object" button
    keep = df_te[INPUTS + ["class"]].copy()
    keep = keep.sample(frac=1, random_state=5).groupby("class").head(1000)
    keep.round(5).to_csv(SAMPLE, index=False)

    counts = df["class"].value_counts()
    metrics = {
        "data_source": "demo" if DEMO_MARKER.exists() else "real",
        "rows": int(len(df)), "rows_removed": int(dropped),
        "train_rows": int(len(X_tr)), "test_rows": int(len(X_te)),
        "class_counts": [{"key": c, "label": LABELS[c], "count": int(counts.get(c, 0))} for c in CLASSES],
        "models": scores,
        "classes": [{"key": c, "label": LABELS[c], "recall": round(float(recall[i]) * 100, 1),
                     "precision": round(float(precision[i]) * 100, 1)} for i, c in enumerate(CLASSES)],
        "confusion_pct": cm_pct.tolist(),
        "importance": importance,
        "boosting_rounds": int(rounds),
        "features": FEATURES,
    }
    METRICS.write_text(json.dumps(metrics, indent=2))
    print(f"Saved {MODEL.name}, {METRICS.name} and {SAMPLE.name} in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
