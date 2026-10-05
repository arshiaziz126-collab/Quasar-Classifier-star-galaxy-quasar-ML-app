"""Create a SYNTHETIC file shaped like the SDSS17 stellar classification dataset.

The numbers imitate the real survey closely enough to run the whole app, but they
are not real measurements. Replace data/raw/star_classification.csv with the real
Kaggle file before you present any results (see README).

Usage:  python -m ml.make_demo_data
"""
import numpy as np
import pandas as pd

from .core import RAW_CSV, DEMO_MARKER

N = 100_000
SHARES = {"GALAXY": 0.5945, "STAR": 0.2159, "QSO": 0.1896}
rng = np.random.default_rng(17)


def block(cls: str, n: int) -> pd.DataFrame:
    if cls == "STAR":
        z = rng.normal(0, 0.0004, n)
        r = rng.uniform(14.5, 21.5, n)
        ug, gr, ri, iz = rng.normal(1.35, .55, n), rng.normal(.62, .38, n), rng.normal(.24, .2, n), rng.normal(.12, .12, n)
    elif cls == "GALAXY":
        z = np.clip(rng.normal(.45, .3, n), .005, 2.0)
        r = rng.uniform(16.5, 23, n)
        ug = rng.normal(1.75, .5, n)
        gr = rng.normal(1.05, .4, n) + .55 * z
        ri, iz = rng.normal(.48, .24, n), rng.normal(.3, .2, n)
    else:  # QSO
        near = rng.random(n) < .28
        z = np.where(near, rng.normal(.95, .4, n), rng.normal(1.95, .85, n))
        z = np.clip(z, .08, 6.5)
        r = rng.uniform(17, 22.8, n)
        ug = rng.normal(.38, .33, n) + np.where(z > 2.6, 1.1 * (z - 2.6), 0)
        gr, ri, iz = rng.normal(.24, .26, n), rng.normal(.14, .2, n), rng.normal(.1, .2, n)
        # some quasars hide in their host galaxy's light and look galaxy-like
        hidden = rng.random(n) < .14
        z = np.where(hidden, np.clip(rng.normal(.55, .28, n), .05, 1.5), z)
        ug = np.where(hidden, rng.normal(1.3, .55, n), ug)
        gr = np.where(hidden, rng.normal(.95, .45, n) + .4 * z, gr)
    g = r + gr
    u = g + ug
    i = r - ri
    zz = i - iz
    return pd.DataFrame({
        "obj_ID": rng.integers(1_237_645_000_000_000_000, 1_237_680_000_000_000_000, n, dtype=np.int64),
        "alpha": rng.uniform(0, 360, n).round(6), "delta": rng.uniform(-18, 83, n).round(6),
        "u": u.round(5), "g": g.round(5), "r": r.round(5), "i": i.round(5), "z": zz.round(5),
        "run_ID": rng.integers(109, 8162, n), "rerun_ID": 301, "cam_col": rng.integers(1, 7, n),
        "field_ID": rng.integers(11, 990, n), "spec_obj_ID": rng.integers(10**17, 10**19 // 1.2, n, dtype=np.int64),
        "class": cls, "redshift": z.round(6), "plate": rng.integers(266, 12547, n),
        "MJD": rng.integers(51608, 58932, n), "fiber_ID": rng.integers(1, 1000, n),
    })


def main():
    counts = {k: int(round(v * N)) for k, v in SHARES.items()}
    counts["GALAXY"] += N - sum(counts.values())
    df = pd.concat([block(c, n) for c, n in counts.items()], ignore_index=True)
    df.loc[rng.integers(0, N), ["u", "g", "z"]] = -9999.0   # the real file has one broken row like this
    df = df.sample(frac=1, random_state=3).reset_index(drop=True)
    df.to_csv(RAW_CSV, index=False)
    DEMO_MARKER.write_text("synthetic\n")
    print(f"Synthetic demo data written to {RAW_CSV} ({len(df):,} rows).")
    print("Replace it with the real Kaggle file before presenting results.")


if __name__ == "__main__":
    main()
