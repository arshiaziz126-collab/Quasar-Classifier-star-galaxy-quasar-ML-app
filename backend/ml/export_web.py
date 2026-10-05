"""Export the trained model so it can run inside the browser (for a static Vercel deploy).

Writes three files to frontend/public/model/:
  model.json   every decision tree of the LightGBM model, in a compact form
  meta.json    the numbers the site shows (accuracy, confusion matrix, SHAP importance...)
  sample.json  held-out objects for the "Random object from the sky" button

Usage (after `python -m ml.train`):  python -m ml.export_web
"""
import json

import lightgbm as lgb
import pandas as pd

from .core import BASE, MODEL, METRICS, SAMPLE, CLASSES, LABELS, FEATURES, INPUTS

WEB = BASE.parent / "frontend" / "public" / "model"
META_KEYS = ("data_source", "rows", "rows_removed", "train_rows", "test_rows",
             "class_counts", "models", "classes", "confusion_pct", "importance")


def flatten(root: dict) -> dict:
    """Turn one nested tree into flat arrays: feature, threshold, left, right, value, default-left."""
    f, t, l, r, v, d = [], [], [], [], [], []
    order = []
    # breadth-first so children get stable indexes
    queue = [root]
    while queue:
        node = queue.pop(0)
        order.append(node)
        if "split_index" in node:
            queue.append(node["left_child"])
            queue.append(node["right_child"])
    index = {id(n): i for i, n in enumerate(order)}
    for n in order:
        if "split_index" in n:
            f.append(n["split_feature"])
            t.append(float(f"{n['threshold']:.9g}"))
            l.append(index[id(n["left_child"])])
            r.append(index[id(n["right_child"])])
            v.append(round(n["internal_value"], 6))
            d.append(1 if n.get("default_left", True) else 0)
        else:
            f.append(-1); t.append(0); l.append(-1); r.append(-1)
            v.append(round(n["leaf_value"], 6)); d.append(0)
    return {"f": f, "t": t, "l": l, "r": r, "v": v, "d": d}


def main():
    if not MODEL.exists() or not METRICS.exists():
        raise SystemExit("No trained model found. Run `python -m ml.train` first.")
    WEB.mkdir(parents=True, exist_ok=True)

    dump = lgb.Booster(model_file=str(MODEL)).dump_model()
    if dump["feature_names"] != FEATURES:
        raise SystemExit("The saved model's features don't match ml/core.py. Retrain with `python -m ml.train`.")
    model = {
        "version": 1,
        "classes": CLASSES,
        "labels": LABELS,
        "features": FEATURES,
        "num_class": dump["num_class"],
        "trees": [flatten(ti["tree_structure"]) for ti in dump["tree_info"]],
    }
    (WEB / "model.json").write_text(json.dumps(model, separators=(",", ":")))

    metrics = json.loads(METRICS.read_text())
    (WEB / "meta.json").write_text(json.dumps({k: metrics[k] for k in META_KEYS}, separators=(",", ":")))

    sample = pd.read_csv(SAMPLE)[INPUTS + ["class"]].sample(frac=1, random_state=11).head(1500)
    (WEB / "sample.json").write_text(sample.round(5).to_json(orient="records"))

    size = sum(p.stat().st_size for p in WEB.glob("*.json")) / 1e6
    print(f"Exported {len(model['trees'])} trees, metrics and {len(sample)} sample objects to {WEB} ({size:.1f} MB)")


if __name__ == "__main__":
    main()
