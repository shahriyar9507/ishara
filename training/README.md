# Ishara — Training (Vision / ML)

Python pipeline for **Phase 1–2**: extract MediaPipe landmarks from BdSL datasets, train a small LSTM, and export to TensorFlow.js for the browser engine.

## Layout

```
training/
├── src/            # extraction + training scripts (added in Phase 1–2)
├── data/           # datasets & extracted landmarks (gitignored — see .gitignore)
│   ├── raw/        #   downloaded BdSL datasets
│   └── landmarks/  #   extracted landmark .npy/.npz
└── requirements.txt
```

## Setup (added in Phase 1)

```bash
cd training
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# Git Bash:           source .venv/Scripts/activate
pip install -r requirements.txt
```

## Pipeline (Phase 1 → 2)

1. Download BdSL datasets into `data/raw/` (Ishara-Lipi, BAUST Lipi, BdSL36, BdSL Words).
2. `extract_landmarks.py` — MediaPipe → landmark vectors → `data/landmarks/`.
3. `train_test_split.py` — split into train/test.
4. `train_lstm.py` — train the letter model (free Kaggle/Colab GPU).
5. `export_tfjs.py` — convert the Keras model to TF.js → `../web/public/models/`.

> Run training on **Kaggle/Colab free GPU**; commit only the small TF.js export, not raw data or `.h5` weights.
