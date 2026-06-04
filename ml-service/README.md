# 🧠 SentinelX — Machine Learning Anomaly Detection Service

This directory contains the FastAPI-based Python microservice responsible for unsupervised anomaly detection and risk scoring in SentinelX.

---

## 👨‍💻 Author & License

*   **Author:** Ajinkya Deshmukh <ajinkyadeshmukh8686@gmail.com> ([GitHub Profile](https://github.com/Ajinkya-909))
*   **License:** MIT License (refer to root `LICENSE` file)

---

## 🛠️ Models & Features

The service processes entity log data extracted from the Node.js/TypeScript normalization engine:
1.  **Isolation Forest:** Detects structural outliers (`contamination=0.05`, `n_estimators=100`).
2.  **DBSCAN:** Identifies clusters (`eps=0.3`, `min_samples=5`). Points outside dense structures are classified as high-risk anomalies (`BEHAVIORAL_OUTLIER`).

### Feature Vector Space (31 Dimensions)
*   **IP features (11)**
*   **User features (10)**
*   **Session features (10)**

---

## 🔌 API Endpoints

*   **`GET /health`:** Health check endpoint returning service status.
*   **`POST /analyze`:** Receives normalized feature lists and returns anomaly scores (0-1) and cluster designations.

---

## 🚀 Local Development Setup

### 1. Create Virtual Environment
```bash
python -m venv venv
venv\Scripts\activate  # On Windows
# source venv/bin/activate  # On macOS/Linux
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Service
Using Uvicorn:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The API documentation will be available at `http://localhost:8000/docs`.
