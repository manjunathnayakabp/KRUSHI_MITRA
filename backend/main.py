import os
import shutil
from fastapi import FastAPI, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import bcrypt
import jwt
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import models, schemas
from database import engine, get_db
import services

# Security Settings
SECRET_KEY = "krushi_mitra_super_secret_key"
ALGORITHM = "HS256"

models.Base.metadata.create_all(bind=engine)
os.makedirs("uploads", exist_ok=True)

app = FastAPI(title="Krushi Mitra API - Phase 1")

# Bulletproof CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    # Allow common local/dev origins (localhost + private IP ranges)
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Krushi Mitra AI Backend!"}


# --- AUTHENTICATION SCHEMAS ---
class FarmerCreate(BaseModel):
    phone_number: str
    farmer_name: str
    password: str
    farm_location: str = ""


class FarmerLogin(BaseModel):
    phone_number: str
    password: str


# --- NEW: LIFECYCLE ENDPOINTS ---
class CropCreate(BaseModel):
    node_id: int
    crop_name: str


# --- REGISTRATION ENDPOINT ---
@app.post("/api/register")
def register_farmer(farmer: FarmerCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(models.Farmer).filter(models.Farmer.phone_number == farmer.phone_number).first()
    if existing_user:
        return {"error": "Phone number already registered."}

    # NEW: Hash password directly with bcrypt
    salt = bcrypt.gensalt()
    hashed_pw = bcrypt.hashpw(farmer.password.encode('utf-8'), salt).decode('utf-8')

    new_farmer = models.Farmer(
        phone_number=farmer.phone_number,
        farmer_name=farmer.farmer_name,
        hashed_password=hashed_pw,
        farm_location=farmer.farm_location
    )
    db.add(new_farmer)
    db.commit()
    return {"message": "Registration successful!"}


# --- LOGIN ENDPOINT ---
@app.post("/api/login")
def login_farmer(farmer: FarmerLogin, db: Session = Depends(get_db)):
    # Find user
    db_user = db.query(models.Farmer).filter(models.Farmer.phone_number == farmer.phone_number).first()

    # NEW: Verify password directly with bcrypt
    if not db_user or not bcrypt.checkpw(farmer.password.encode('utf-8'), db_user.hashed_password.encode('utf-8')):
        return {"error": "Invalid phone number or password."}

    # Generate Token
    token_data = {"sub": db_user.phone_number, "name": db_user.farmer_name, "exp": datetime.utcnow() + timedelta(days=7)}
    access_token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

    return {"access_token": access_token, "farmer_name": db_user.farmer_name}


# --- NEW: Weather Endpoint for the Frontend Tab ---
@app.get("/api/weather/{phone_number}")
def get_farmer_weather(phone_number: str, db: Session = Depends(get_db)):
    farmer = db.query(models.Farmer).filter(models.Farmer.phone_number == phone_number).first()
    if not farmer or not farmer.farm_location:
        return {"error": "Location not set"}
    
    weather = services.get_weather_data(farmer.farm_location)
    return {"location": farmer.farm_location, "weather": weather}


# --- SMART LIFECYCLE ENDPOINTS ---
@app.post("/api/lifecycle")
def start_crop_cycle(crop: CropCreate, db: Session = Depends(get_db)):
    db.query(models.CropCycle).filter(models.CropCycle.node_id == crop.node_id).delete()
    new_crop = models.CropCycle(node_id=crop.node_id, crop_name=crop.crop_name, planting_date=datetime.utcnow())
    db.add(new_crop)
    db.commit()
    return {"message": "Success"}


@app.get("/api/lifecycle/all")
def get_all_crop_cycles(db: Session = Depends(get_db)):
    crops = db.query(models.CropCycle).all()
    
    # Generic Lifecycle Timeline (Days)
    # 0-15: Seedling | 16-45: Vegetative | 46-75: Flowering | 75+: Harvest
    
    active_crops = []
    for crop in crops:
        days_active = (datetime.utcnow() - crop.planting_date).days
        
        # Auto-calculate the stage based on time!
        if days_active <= 15:
            current_stage = "Seedling"
            progress = (days_active / 15) * 25
        elif days_active <= 45:
            current_stage = "Vegetative"
            progress = 25 + ((days_active - 15) / 30) * 25
        elif days_active <= 75:
            current_stage = "Flowering"
            progress = 50 + ((days_active - 45) / 30) * 25
        else:
            current_stage = "Ready for Harvest"
            progress = 100
            
        active_crops.append({
            "node_id": crop.node_id,
            "crop_name": crop.crop_name,
            "stage": current_stage,
            "days_active": days_active,
            "progress": min(100, round(progress)), # Cap at 100%
            "planting_date": crop.planting_date.strftime("%b %d, %Y")
        })
        
    return active_crops


# --- NEW: COMMUNITY FEED ENDPOINTS ---
class PostCreate(BaseModel):
    farmer_name: str
    crop_name: str
    issue_description: str
    ai_solution: str = None


@app.post("/api/community")
def create_community_post(post: PostCreate, db: Session = Depends(get_db)):
    new_post = models.CommunityPost(
        farmer_name=post.farmer_name,
        crop_name=post.crop_name,
        issue_description=post.issue_description,
        ai_solution=post.ai_solution,
        timestamp=datetime.utcnow()
    )
    db.add(new_post)
    db.commit()
    return {"message": "Successfully shared with the community!"}


@app.get("/api/community")
def get_community_posts(db: Session = Depends(get_db)):
    # Get the 20 most recent posts
    posts = db.query(models.CommunityPost).order_by(models.CommunityPost.timestamp.desc()).limit(20).all()
    
    result = []
    for p in posts:
        result.append({
            "id": p.id,
            "farmer_name": p.farmer_name,
            "crop_name": p.crop_name,
            "issue_description": p.issue_description,
            "ai_solution": p.ai_solution,
            "likes": p.likes,
            "time_ago": f"{(datetime.utcnow() - p.timestamp).days} days ago" if (datetime.utcnow() - p.timestamp).days > 0 else "Today"
        })
    return result


@app.post("/submit-node-data/")
async def submit_node_data(
    node_id: int = Form(...),
    nitrogen: float = Form(...),
    phosphorus: float = Form(...),
    potassium: float = Form(...),
    moisture: float = Form(...),
    temperature: float = Form(...),
    ec: float = Form(...),
    image: UploadFile = File(None), 
    language: str = Form("en"),
    farmer_notes: str = Form(None),
    db: Session = Depends(get_db)
):
    image_path = None
    if image:
        file_location = f"uploads/{image.filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(image.file, file_object)
        image_path = file_location 

    # 2. Save Raw Sensor Data to the Database
    db_reading = models.DailyReading(
        node_id=node_id, nitrogen=nitrogen, phosphorus=phosphorus,
        potassium=potassium, moisture=moisture, temperature=temperature,
        ec=ec, image_url=image_path
    )
    db.add(db_reading)
    db.commit()

    # --- NEW: Fetch the most recent past insight for this exact node ---
    past_insight = db.query(models.DailyInsight)\
                     .filter(models.DailyInsight.node_id == node_id)\
                     .order_by(models.DailyInsight.timestamp.desc())\
                     .first()
                     
    prev_dict = None
    if past_insight:
        prev_dict = {
            "crop_condition": past_insight.crop_condition,
            "precautions": past_insight.precautions,
            "overall_conclusion": past_insight.overall_conclusion
        }

    # 3. Fetch Farmer Location & Weather for AI Context
    # (Assuming we have a way to know which farmer is submitting. For Phase 1, we can pass location as a form field, or fetch a default).
    # Since we don't pass phone_number in the form yet, let's just grab the first farmer in the DB for the prototype!
    first_farmer = db.query(models.Farmer).first()
    weather_context = None
    if first_farmer and first_farmer.farm_location:
        weather_context = services.get_weather_data(first_farmer.farm_location)

    reading_dict = {
        "nitrogen": nitrogen, "phosphorus": phosphorus, "potassium": potassium,
        "moisture": moisture, "temperature": temperature, "ec": ec
    }
    
    # NEW: Fetch biological crop data
    active_crop = db.query(models.CropCycle).filter(models.CropCycle.node_id == node_id).first()
    bio_context = None
    if active_crop:
        days_old = (datetime.utcnow() - active_crop.planting_date).days
        if days_old <= 15:
            current_stage = "Seedling"
        elif days_old <= 45:
            current_stage = "Vegetative"
        elif days_old <= 75:
            current_stage = "Flowering"
        else:
            current_stage = "Ready for Harvest"
        bio_context = {
            "name": active_crop.crop_name,
            "stage": current_stage,
            "days_old": days_old
        }

    # Send reading, image, memory, weather, bio, language, AND farmer_notes to Gemini!
    ai_response = services.generate_agri_insights(reading_dict, image_path, prev_dict, weather_context, bio_context, language, farmer_notes)

    # --- BULLETPROOF FIX: Helper function to ensure everything is a string ---
    def ensure_string(value):
        if isinstance(value, list):
            # Force every item inside the list to become a string before joining
            return "\n".join([str(item) for item in value])
        elif isinstance(value, dict):
            # If Gemini returns a pure dictionary, convert it to a string
            return str(value)
        elif value is None:
            return "No data provided."
        # Fallback for plain text or numbers
        return str(value)

    # 4. Save AI Insight to Database (Safely)
    db_insight = models.DailyInsight(
        node_id=node_id,
        crop_condition=ensure_string(ai_response.get("crop_condition")),
        precautions=ensure_string(ai_response.get("precautions")),
        overall_conclusion=ensure_string(ai_response.get("overall_conclusion"))
    )
    db.add(db_insight)
    db.commit()

    # NEW: Fetch eligible schemes based on the active crop
    crop_name = bio_context["name"] if bio_context else None
    eligible_schemes = services.get_government_schemes(crop_name)

    # NEW: Fetch Marketplace Products based on the AI's financial advice
    financial_sim = ai_response.get("financial_simulation")
    recommended_action = financial_sim.get("action_required", "") if financial_sim else ""
    local_vendors = services.get_local_vendors(recommended_action)

    return {
        "message": "Data processed successfully",
        "insight": {
            "top_action": ai_response.get("top_action"),
            "reason": ai_response.get("reason"),
            "confidence_level": ai_response.get("confidence_level"),
            "crop_condition": db_insight.crop_condition,
            "precautions": db_insight.precautions,
            "overall_conclusion": db_insight.overall_conclusion,
            "financial_simulation": financial_sim
        },
        "schemes": eligible_schemes,
        "marketplace": local_vendors
    }


# --- Add this to the bottom of backend/main.py ---

@app.get("/api/chart-data/{node_id}")
def get_chart_data(node_id: int, db: Session = Depends(get_db)):
    # Fetch the last 7 readings for this specific node, newest first
    readings = db.query(models.DailyReading)\
                 .filter(models.DailyReading.node_id == node_id)\
                 .order_by(models.DailyReading.timestamp.desc())\
                 .limit(7).all()
    
    # Reverse the list so the chart reads left-to-right (oldest to newest)
    readings.reverse()
    
    # Format the data for the Recharts frontend
    chart_data = []
    for r in readings:
        chart_data.append({
            "date": r.timestamp.strftime("%b %d"), # Formats as "Mar 20"
            "nitrogen": r.nitrogen,
            "phosphorus": r.phosphorus,
            "potassium": r.potassium,
            "moisture": r.moisture,
            "temperature": r.temperature,
        })
        
    return chart_data
