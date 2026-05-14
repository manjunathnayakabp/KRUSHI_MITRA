# 🌾 Krushi Mitra: Multimodal AI & IoT Agritech Platform

> **An enterprise-grade, cloud-native agricultural ecosystem bridging the gap between IoT sensor telemetry and predictive, prescriptive agronomy.**

## 📖 Overview
Modern precision agriculture often overwhelms farmers with raw sensor data without providing actionable agronomic decisions. **Krushi Mitra** is a prescriptive financial and diagnostic engine. It fuses high-frequency environmental telemetry (NPK, moisture, temperature) with real-time satellite meteorology and visual crop imagery using Google's Gemini 2.5 Flash Multimodal LLM.

Instead of just diagnosing diseases, Krushi Mitra provides actionable directives, precise Return on Investment (ROI) simulations, and features a highly accessible UI built for harsh rural environments.

## ✨ Key Features
* **🧠 Multimodal AI Diagnostics:** Fuses soil telemetry, weather data, and crop images into a single deterministic JSON prompt for highly accurate analysis.
* **💸 Predictive Financial Engine:** Calculates treatment costs vs. projected yield to simulate exact net-profit ROI for the farmer.
* **☀️ Adaptive "Field Mode" UI:** A neo-brutalist, high-contrast toggle that strips away CSS glassmorphism for absolute readability under direct sunlight.
* **🎙️ Bilingual Voice Processing:** Hands-free Speech-to-Text (STT) and Text-to-Speech (TTS) natively supporting English and Kannada to bypass literacy barriers.
* **🌍 Farmer Knowledge Network:** A decentralized community hub functioning as a regional epidemiological early-warning system.
* **🏛️ Automated Scheme Routing:** Matches crop profiles with active government subsidies (e.g., PMFBY).

## 🛠️ Tech Stack
### **Frontend (Execution Layer)**
* Next.js (React)
* Tailwind CSS (Styling & Glassmorphism)
* Recharts (Time-series data visualization)

### **Backend (Intelligence & Persistence)**
* FastAPI (Python, ASGI asynchronous routing)
* Google Gemini 2.5 Flash (Multimodal LLM via `genai` SDK)
* Open-Meteo API (Satellite meteorology)
* SQLite / PostgreSQL (ACID-compliant state management)

### **IoT Perception Layer**
* ESP32 Microcontrollers
* Soil NPK, Moisture, and Temperature Sensors

---

## 🚀 Getting Started

### Prerequisites
Before you begin, ensure you have the following installed:
* [Node.js](https://nodejs.org/) (v18.0 or higher)
* [Python](https://www.python.org/) (v3.9 or higher)
* A Google Gemini API Key

### 1. Clone the Repository
\`\`\`bash
git clone https://github.com/yourusername/krushi-mitra.git
cd krushi-mitra
\`\`\`

### 2. Backend Setup (FastAPI)
Navigate to the backend directory, set up your virtual environment, and run the server.

\`\`\`bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use \`venv\Scripts\activate\`
pip install -r requirements.txt
\`\`\`

**Set your Environment Variables:**
Create a `.env` file in the `backend` folder and add:
\`\`\`env
GEMINI_API_KEY=your_google_gemini_api_key_here
DATABASE_URL=sqlite:///./krushimitra.db
\`\`\`

**Start the API Server:**
\`\`\`bash
uvicorn main:app --reload
\`\`\`
*The backend will be running at `http://localhost:8000`*

### 3. Frontend Setup (Next.js)
Open a new terminal, navigate to the frontend directory, and start the client.

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`
*The frontend will be running at `http://localhost:3000`*

---

## 📡 Hardware / IoT Integration
To integrate physical sensors, flash the provided C++ scripts in the `/hardware` folder to your ESP32 modules. Ensure the ESP32 is configured to send POST requests containing JSON telemetry to the FastAPI endpoint: `http://<YOUR_BACKEND_IP>:8000/api/telemetry`

**Sample Payload:**
\`\`\`json
{
  "node_id": 1,
  "nitrogen": 45.5,
  "phosphorus": 20.1,
  "potassium": 30.2,
  "moisture": 65.0,
  "temperature": 28.5,
  "ec": 1.2
}
\`\`\`

To get the **Smart Agriculture Assistant** up and running, you will need to set up the three distinct layers of the architecture: the ESP32 Hardware, the FastAPI Python Backend, and the Next.js Frontend.

Here is the step-by-step developer guide, structured exactly like a professional GitHub `README.md`.

### Prerequisites

Before you begin, ensure you have the following installed on your machine:

* **Python 3.9+** (For the FastAPI backend and Machine Learning)
* **Node.js (v18+) & npm** (For the Next.js frontend)
* **Arduino IDE** (For flashing the ESP32 microcontroller)
* **Tesseract OCR Engine** (Must be installed on your OS level. E.g., `sudo apt install tesseract-ocr` for Linux, or via the `.exe` installer for Windows).

---

### Step 1: Hardware Setup (ESP32 Edge Node)

1. Open the **Arduino IDE**.
2. Go to **File > Preferences** and add the ESP32 board manager URL.
3. Install the required libraries via the Library Manager:
* `DHT sensor library` (for temperature/humidity)
* `Firebase ESP32 Client` (to push data to your database)
* `Arduino_JSON`


4. Connect your ESP32 to your computer via USB.
5. Open your `esp32_telemetry.ino` file. Update the Wi-Fi credentials and Firebase API keys at the top of the file:
```cpp
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define FIREBASE_HOST "your-project.firebaseio.com"
#define FIREBASE_AUTH "your_database_secret"

```


6. Select your ESP32 board and COM port, then click **Upload**.

---

### Step 2: Backend Setup (FastAPI & Machine Learning)

This layer handles the OCR processing, the Random Forest model, and the database routing.

1. Open your terminal and navigate to the backend folder:
```bash
cd krushi-mitra-backend

```


2. Create and activate a Python virtual environment:
```bash
# On Windows
python -m venv venv
.\venv\Scripts\activate

# On Mac/Linux
python3 -m venv venv
source venv/bin/activate

```


3. Install the required Python dependencies:
```bash
pip install fastapi uvicorn opencv-python pytesseract scikit-learn python-dotenv firebase-admin

```


4. Create a `.env` file in the root of the backend folder and add your API keys:
```env
GEMINI_API_KEY="your_google_gemini_key_here"
FIREBASE_CREDENTIALS_PATH="./firebase-adminsdk.json"

```


5. Start the FastAPI server using Uvicorn:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000

```


*(Your backend is now running at `http://localhost:8000`. You can view the API documentation at `http://localhost:8000/docs`).*

---

### Step 3: Frontend Setup (Next.js PWA)

This layer provides the Action-First UI and the Community Hub for the farmers.

1. Open a new terminal window and navigate to your frontend directory:
```bash
cd krushi-mitra-frontend

```


2. Install the Node modules and dependencies:
```bash
npm install

```


3. Create a `.env.local` file in the root of the frontend folder to link it to your backend:
```env
NEXT_PUBLIC_BACKEND_API_URL="http://localhost:8000"

```


4. Start the development server:
```bash
npm run dev

```



---

### Step 4: System Verification

1. Open your browser and go to `http://localhost:3000`. You should see your Next.js dashboard.
2. Check the **Telemetry Widget** on the screen; if your ESP32 is powered on and connected to Wi-Fi, the moisture and temperature dials should update automatically every few seconds.
3. Test the **OCR Pipeline**: Click "Upload Soil Report", select an image of a soil health card, and wait 1–2 seconds. You should see the extracted NPK numbers populate on the screen, followed by the AI's final crop and fertilizer recommendation.

You are now fully up and running! Let me know if you hit any bugs or environment path errors while installing Tesseract or the Python packages.

## 🔬 System Architecture
The architecture is logically partitioned into four distinct layers:
1. **Perception:** ESP32 hardware and Open-Meteo virtual sensors.
2. **Persistence:** Normalized relational DBMS maintaining a Biological Digital Twin.
3. **Intelligence:** FastAPI orchestrating the Multimodal Prompt Matrix to Gemini.
4. **Execution:** Next.js PWA delivering sub-second DOM rendering and Field-Mode UX.

## 🤝 Contributing
Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
