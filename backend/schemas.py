from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ReadingBase(BaseModel):
    node_id: int
    nitrogen: float
    phosphorus: float
    potassium: float
    moisture: float
    temperature: float
    ec: float
    image_url: Optional[str] = None

class ReadingCreate(ReadingBase):
    pass

class ReadingResponse(ReadingBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True
