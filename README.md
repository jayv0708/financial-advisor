# Intelligent Personal Finance Advisor — ML Pipeline Edition 🇮🇳

A **portfolio-grade** machine learning project demonstrating a complete pipeline:
**Python training → JSON export → Browser inference** — with zero backend required at runtime.

---

## 🏛️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   TRAINING PIPELINE (Python)                    │
│   transactions.csv ──→ preprocess.py ──→ train_classifier.py   │
│   monthly_spending.csv ──→ train_regressor.py                   │
│   market_prices.csv ──→ train_trend_model.py                    │
│                          ↓ evaluate.py                          │
│                          ↓ export_model.py                      │
│          /training_pipeline/models/  +  /public/models/         │
└─────────────────────────────────────────────────────────────────┘
                               │
                    JSON model files copied to
                      /public/models/*.json
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                  FRONTEND APPLICATION (React)                   │
│   fetch('/models/classifier_model_v1.json')                     │
│       → JS TF-IDF + LogReg inference → category + confidence   │
│   fetch('/models/regression_model_v1.json')                     │
│       → JS polynomial prediction → next month ₹ spend          │
│   fetch('/models/trend_model_v1.json')                          │
│       → JS StandardScaler + LogReg → Uptrend/Stable/Downtrend  │
│       → investment-engine.js → allocation % per risk profile   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Part 1: Training Pipeline (Python)

### Setup

```bash
cd training_pipeline
pip install -r requirements.txt
```

### Run Full Export Pipeline

```bash
# From repo root
python training_pipeline/scripts/export_model.py
```

This trains all 3 models and writes versioned JSON to **both**:
- `training_pipeline/models/` (for versioning / archiving)
- `public/models/` (served statically to the React frontend)

### Individual Scripts

| Script | What it does |
|---|---|
| `preprocess.py` | Text cleaning, TF-IDF builder, feature engineering |
| `train_classifier.py` | TF-IDF + Logistic Regression expense categorizer |
| `train_regressor.py` | Polynomial Linear Regression spending predictor |
| `train_trend_model.py` | StatScaler + LogReg market trend classifier |
| `evaluate.py` | Cross-validation metrics for all 3 models |
| `export_model.py` | **Master script** — trains + exports everything |

### Model Export Format

**`classifier_model_v1.json`**
```json
{ "vocabulary": {"swiggy": 42, ...}, "idf": [...], "classes": ["Bills","Food",...], "coef": [[...]], "intercept": [...] }
```

**`regression_model_v1.json`**
```json
{ "coef": [1075.4, -22.75], "intercept": 29043.25, "n_training_months": 24 }
```

**`trend_model_v1.json`**
```json
{ "scaler_mean": [...], "scaler_scale": [...], "classes": ["Downtrend","Stable","Uptrend"], "coef": [[...]], "intercept": [...] }
```

---

## 🌐 Part 2: Frontend Application (React)

### Setup

```bash
npm install
npm run dev
```

Open http://localhost:5174/ in your browser.

### How Frontend Uses the Models

1. **Expense Categorizer** (`src/ml-model/categorizer.js`):
   - Fetches `classifier_model_v1.json` once on startup
   - Reproduces TF-IDF vectorization (tokenize → TF → IDF weight → L2-normalize) in pure JS
   - Runs dot-product LogReg inference → softmax → argmax

2. **Spending Predictor** (`src/ml-model/predictor.js`):
   - Fetches `regression_model_v1.json`
   - Evaluates `coef[0]*x + coef[1]*x² + intercept` with user's local month index
   - Blends Python model prediction with user's own recent data (60/40 blend)

3. **Market Trend Classifier** (`src/ml-model/market-trend.js`):
   - Fetches `trend_model_v1.json`
   - Computes 4 features (price_change_pct, volatility, momentum_3m, momentum_6m) from `/src/data/market-data.json`
   - Applies StandardScaler (using stored mean/scale) → LogReg inference → trend label

---

## 💰 Investment Advisor

- **Risk Profile**: Low / Medium / High buttons update allocation weights
- **ML-adjusted**: If Nifty50 is in Uptrend → stocks allocation gets +5%; if Bitcoin is Downtrend → crypto weight halved, surplus moved to Cash
- **SIP Projection**: Uses compound interest formula `FV = SIP × [((1+r)^n - 1)/r] × (1+r)` with historical CAGR estimates
- **Goal Tracking**: Enter your savings target and see if your projection reaches it

---

## ⚠️ Limitations

- Market data is synthetic (24-month simulation). Real integrations can replace `/src/data/market-data.json` and re-run `export_model.py`.
- Classifier training set is 80 samples. Accuracy improves significantly with more labelled data.
- Projections are illustrative only — not financial advice.

---

## 🚀 Deployment

### Vercel
```bash
npx vercel
```

### Netlify
```bash
npx netlify deploy --dir=dist
```

The `public/models/` JSON files are automatically included in the static build.
