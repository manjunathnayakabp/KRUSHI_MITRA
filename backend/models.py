from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from datetime import datetime
from database import Base

# --- ADD THIS NEW TABLE ---
class Farmer(Base):
    __tablename__ = "farmers"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, unique=True, index=True)
    farmer_name = Column(String)
    hashed_password = Column(String)
    farm_location = Column(String, nullable=True)

class DailyReading(Base):
    __tablename__ = "daily_readings"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, index=True) 
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    nitrogen = Column(Float)
    phosphorus = Column(Float)
    potassium = Column(Float)
    moisture = Column(Float)
    temperature = Column(Float)
    ec = Column(Float)
    
    image_url = Column(String, nullable=True)

class DailyInsight(Base):
    __tablename__ = "daily_insights"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    crop_condition = Column(String)
    precautions = Column(String)
    overall_conclusion = Column(String)

# --- ADD THIS TO THE BOTTOM OF models.py ---
class CropCycle(Base):
    __tablename__ = "crop_cycles"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(Integer, index=True)
    crop_name = Column(String)
    planting_date = Column(DateTime, default=datetime.utcnow)
    current_stage = Column(String, default="Planting") # Planting, Vegetative, Flowering, Harvest

# --- ADD THIS TO THE BOTTOM OF models.py ---
class CommunityPost(Base):
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True, index=True)
    farmer_name = Column(String)
    crop_name = Column(String)
    issue_description = Column(String)
    ai_solution = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    likes = Column(Integer, default=0)
