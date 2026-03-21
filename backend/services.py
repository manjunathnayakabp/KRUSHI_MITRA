import os
import json
import requests
from dotenv import load_dotenv
from google import genai

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

# Initialize the new genai Client
if API_KEY:
    client = genai.Client(api_key=API_KEY)
else:
    client = None

# --- NEW: NO-KEY WEATHER FUNCTION ---
def get_weather_data(location_name: str):
    if not location_name:
        return None
    try:
        # 1. Geocode the location name into Latitude & Longitude
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={location_name}&count=1"
        geo_resp = requests.get(geo_url).json()
        
        if "results" not in geo_resp:
            return None
            
        lat = geo_resp["results"][0]["latitude"]
        lon = geo_resp["results"][0]["longitude"]
        
        # 2. Fetch the current weather and tomorrow's forecast
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&daily=precipitation_sum,temperature_2m_max&timezone=auto"
        w_resp = requests.get(weather_url).json()
        
        return {
            "current_temp": w_resp["current_weather"]["temperature"],
            "rain_forecast_mm": w_resp["daily"]["precipitation_sum"][1], # Tomorrow's rain
            "max_temp_tomorrow": w_resp["daily"]["temperature_2m_max"][1]
        }
    except Exception as e:
        print(f"Weather API Error: {e}")
        return None

# --- UPDATED: AI ENGINE NOW ACCEPTS WEATHER ---
def generate_agri_insights(reading_data: dict, image_path: str = None, previous_insight: dict = None, weather_data: dict = None, bio_context: dict = None, language: str = "en", farmer_notes: str = None):
    if not client:
        return {"crop_condition": "Offline", "precautions": "No API Key", "overall_conclusion": "Offline"}

    # ... (Keep your history_context and weather_context exactly the same) ...
    history_context = ""
    if previous_insight:
        history_context = f"\nYesterday's Report: {previous_insight.get('crop_condition')} | Action Taken: {previous_insight.get('precautions')}"

    weather_context = ""
    if weather_data:
        weather_context = f"\nOutside Temp: {weather_data['current_temp']} C | Tomorrow's Rain: {weather_data['rain_forecast_mm']} mm"

    bio_str = ""
    if bio_context:
        bio_str = f"\nCrop: {bio_context['name']} | Age: {bio_context['days_old']} days old | Stage: {bio_context['stage']}"

    # --- NEW: Language Instruction ---
    lang_instruction = "You must respond entirely in English."
    if language == 'kn':
        lang_instruction = "CRITICAL: You must generate the values for 'crop_condition', 'precautions', and 'overall_conclusion' strictly and fluently in KANNADA script."

    # NEW: Create a context block for the farmer's spoken words
    notes_context = f"\nFarmer's Direct Observations: {farmer_notes}" if farmer_notes else ""

    prompt = f"""
    You are an elite, predictive agricultural AI. You don't just diagnose; you optimize financial yield for the farmer.
    
    Current Data:
    - NPK: {reading_data['nitrogen']}/{reading_data['phosphorus']}/{reading_data['potassium']}
    - Moisture: {reading_data['moisture']}%
    - Temp: {reading_data['temperature']} (C)
    {bio_str}
    {history_context}
    {weather_context}
    {notes_context} 
    
    {lang_instruction}
    
    Based on this data, provide an ACTION-FIRST recommendation. Farmers need to know exactly what to do today, why they are doing it, and your confidence level.
    
    Respond ONLY with a raw JSON object containing exactly these keys:
    "top_action": (String) A short, urgent directive (e.g., "Irrigate Field 2 within 3 hours", "Apply Nitrogen today").
    "reason": (String) The data-backed reason for this action (e.g., "Soil moisture dropped 18% in the last 3 days").
    "confidence_level": (String) "High", "Medium", or "Low".
    "crop_condition": A short health summary.
    "precautions": Specific, actionable agronomic steps.
    "overall_conclusion": A brief summary.
    "financial_simulation": A nested object containing:
        - "action_required": The primary fertilizer/treatment to buy.
        - "estimated_cost_inr": Estimated cost (Number).
        - "yield_increase_pct": Estimated percentage yield increase (Number).
        - "estimated_profit_inr": Estimated net profit (Number).
        - "roi_explanation": Why the cost is worth the profit.
    """
    
    # ... (Keep the rest of your try/except block exactly the same) ...
    contents = [prompt]
    try:
        if image_path and os.path.exists(image_path):
            contents.append(client.files.upload(file=image_path))
        response = client.models.generate_content(model='gemini-2.5-flash', contents=contents)
        return json.loads(response.text.replace('```json', '').replace('```', '').strip())
    except Exception as e:
        print(f"AI Error: {e}") 
        return {"crop_condition": "Failed", "precautions": "Error", "overall_conclusion": "Error"}

# --- NEW: GOVERNMENT SCHEMES KNOWLEDGE BASE ---
def get_government_schemes(crop_name: str = None):
    # Base national schemes
    schemes = [
        {
            "name": "PM-Kisan Samman Nidhi",
            "benefit": "₹6,000 per year minimum income support.",
            "eligibility": "All landholding farmer families.",
            "link": "https://pmkisan.gov.in/"
        },
        {
            "name": "Krishi Bhagya Scheme (Karnataka)",
            "benefit": "Up to 80% subsidy for Krishi Hondas (farm ponds), polythene linings, and micro-irrigation.",
            "eligibility": "Farmers in rain-fed agricultural zones.",
            "link": "https://raitamitra.karnataka.gov.in/"
        }
    ]
    
    # Add crop-specific schemes if a crop is registered
    if crop_name:
        schemes.append({
            "name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
            "benefit": "Comprehensive crop insurance against non-preventable natural risks.",
            "eligibility": f"Active cultivators growing notified crops like {crop_name}.",
            "link": "https://pmfby.gov.in/"
        })
        
    return schemes

# --- NEW: LOCAL FERTILIZER MARKETPLACE ENGINE ---
def get_local_vendors(action_required: str):
    if not action_required:
        return []
        
    action = action_required.lower()
    recommendations = []
    
    # Bengaluru / Karnataka Localized Mock Database
    if "urea" in action or "nitrogen" in action:
        recommendations.extend([
            {"product": "IFFCO Urea (46% N)", "vendor": "Kisan Seva Kendra, Yelahanka", "price": 266, "unit": "45kg Bag", "distance": "3.2 km", "rating": 4.8},
            {"product": "Coromandel Godavari Urea", "vendor": "Agri-Input Hub, Hebbal", "price": 270, "unit": "45kg Bag", "distance": "5.5 km", "rating": 4.5}
        ])
    
    if "potassium" in action or "potash" in action or "mop" in action:
        recommendations.extend([
            {"product": "IPL Muriate of Potash (MOP)", "vendor": "Raita Samparka Kendra, Doddaballapura", "price": 850, "unit": "50kg Bag", "distance": "4.1 km", "rating": 4.9}
        ])
        
    if "phosphorus" in action or "dap" in action:
        recommendations.extend([
            {"product": "Grover DAP (18:46:0)", "vendor": "Sri Sai Fertilizers, Devanahalli", "price": 1350, "unit": "50kg Bag", "distance": "6.8 km", "rating": 4.6}
        ])
        
    if "pest" in action or "fung" in action or "mildew" in action or "blight" in action:
        recommendations.extend([
            {"product": "Bayer Nativo Fungicide", "vendor": "Agri-Input Hub, Hebbal", "price": 950, "unit": "250g", "distance": "5.5 km", "rating": 4.7},
            {"product": "Cold-Pressed Neem Oil", "vendor": "Organic Solutions, Yelahanka", "price": 320, "unit": "1 Liter", "distance": "2.1 km", "rating": 4.9}
        ])
        
    # Default fallback if no specific chemical is matched
    if not recommendations:
        recommendations.extend([
            {"product": "All-Purpose NPK 19:19:19", "vendor": "Kisan Seva Kendra, Yelahanka", "price": 145, "unit": "1kg Pouch", "distance": "3.2 km", "rating": 4.4}
        ])
        
    return recommendations
