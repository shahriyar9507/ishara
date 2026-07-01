# Datasets

Download BdSL datasets into `training/data/raw/<dataset>/<label>/*.jpg` (folder per Bangla character).
Raw data is **gitignored** — never commit it. Only the small extracted landmark `.npz` and the final
TF.js model are versioned.

| Dataset | Content | Source |
|---|---|---|
| **Ishara-Lipi** | First open BdSL character set | ICBSLP 2018 |
| **BAUST Lipi** | 36 letters, ~18,000 images | arXiv:2408.10518 |
| **BdSL36** | 36 Bangla letters/digits | arXiv:2110.00869 |
| **BdSL Words** | 10 everyday words | open dataset |

## Expected layout

```
training/data/raw/
├── bdsl36/
│   ├── অ/  img001.jpg ...
│   ├── আ/  ...
│   └── ...
└── baust_lipi/
    └── <label>/ ...
```

## Pipeline

```bash
cd training
# 1) extract landmarks (per dataset)
python -m src.extract_landmarks --dataset bdsl36
# 2) train/test split
python -m src.train_test_split --dataset bdsl36
```

Produces `data/landmarks/bdsl36.npz` and `data/landmarks/bdsl36_split.npz`, ready for Phase 2 training.
