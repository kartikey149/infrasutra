import sqlite3
import json
import os
import re
import sys
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional, List

import hmac
import base64
import time

from fastapi import FastAPI, HTTPException, Query, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Import email notification service
SERVICES_PATH = Path(__file__).parent.parent / "services"
if str(SERVICES_PATH) not in sys.path:
    sys.path.insert(0, str(SERVICES_PATH))
from email_service import send_supervisor_assignment_email

# Optional dependencies
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

try:
    from rapidfuzz import fuzz
    HAS_RAPIDFUZZ = True
except ImportError:
    HAS_RAPIDFUZZ = False

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

app = FastAPI(title="SIH26122 AI & DB Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = Path(__file__).parent.parent / "data" / "sih_database.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.row_factory = sqlite3.Row
    return conn

def ensure_schema_columns():
    try:
        conn = sqlite3.connect(DB_PATH, timeout=30.0)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(pending_updates)")
        existing_cols = [col[1] for col in cursor.fetchall()]
        cols_to_add = [
            ("photo_data", "TEXT"),
            ("photo_hash", "TEXT"),
            ("latitude", "REAL"),
            ("longitude", "REAL"),
            ("accuracy", "REAL"),
            ("location_address", "TEXT"),
            ("geofence_status", "TEXT"),
            ("work_start", "TEXT"),
            ("work_end", "TEXT"),
            ("logged_at", "TEXT"),
            ("delay_detected", "INTEGER DEFAULT 0"),
            ("delay_category", "TEXT"),
            ("delay_root_cause_notes", "TEXT"),
            ("mitigation_action_proposed", "TEXT")
        ]
        for col_name, col_type in cols_to_add:
            if col_name not in existing_cols:
                cursor.execute(f"ALTER TABLE pending_updates ADD COLUMN {col_name} {col_type}")
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB SCHEMA WARNING] {e}")

ensure_schema_columns()


# =============================================================
# Cryptographic Token & Authorization Layer
# =============================================================
AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "oilindia_infrasutra_auth_secret_2026_supersecure")

def create_access_token(user_id: int, role: str, expires_delta_hours: int = 72) -> str:
    """Generate tamper-proof HMAC-SHA256 authenticated session token."""
    payload = {
        "sub": user_id,
        "role": role,
        "exp": int(time.time()) + expires_delta_hours * 3600
    }
    payload_json = json.dumps(payload, separators=(',', ':'))
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode().rstrip('=')
    sig = hmac.new(AUTH_SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"

def verify_token(token: str) -> Optional[dict]:
    """Verify HMAC signature and expiration."""
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        payload_b64, sig = parts
        expected_sig = hmac.new(AUTH_SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        padded = payload_b64 + '=' * ((4 - len(payload_b64) % 4) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Dependency: Extract authenticated user from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Authentication required. Please provide a valid Bearer token in the Authorization header."
        )
    token = authorization.split("Bearer ", 1)[1].strip()
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=401, 
            detail="Invalid or expired session token. Please sign in again."
        )
    
    conn = get_db_connection()
    user = conn.execute("SELECT id, name, email, role FROM users WHERE id = ?", (payload["sub"],)).fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=401, detail="User account not found.")
    return dict(user)

def get_user_authorized_projects(conn, user_id: int) -> List[dict]:
    """Return projects accessible by this user."""
    user_row = conn.execute("SELECT role FROM users WHERE id = ?", (user_id,)).fetchone()
    if user_row and str(user_row["role"]).lower() in ["planner", "manager", "admin"]:
        rows = conn.execute("SELECT * FROM projects ORDER BY id ASC").fetchall()
        return [dict(r) for r in rows]
    rows = conn.execute("""
        SELECT p.* FROM projects p
        INNER JOIN project_assignments pa ON p.id = pa.project_id
        WHERE pa.user_id = ?
        ORDER BY p.id ASC
    """, (user_id,)).fetchall()
    return [dict(r) for r in rows]

def check_project_authorization(conn, user_id: int, project_id: str):
    """Verify that the user has an assignment to this project, or has planner/manager privileges."""
    user_row = conn.execute("SELECT role FROM users WHERE id = ?", (user_id,)).fetchone()
    if user_row and str(user_row["role"]).lower() in ["planner", "manager", "admin"]:
        return
    row = conn.execute(
        "SELECT 1 FROM project_assignments WHERE user_id = ? AND project_id = ?",
        (user_id, project_id)
    ).fetchone()
    if not row:
        raise HTTPException(
            status_code=403, 
            detail=f"Forbidden: You are not authorized or assigned to access project '{project_id}'."
        )

# =============================================================
# Request / Response Models
# =============================================================
class ExtractRequest(BaseModel):
    text: str

class MatchRequest(BaseModel):
    extracted_task: str
    discipline: str = ""
    project_id: str = ""

class FieldUpdateRequest(BaseModel):
    text: str
    source_type: str = "text"
    project_id: str = "PRJ-01"
    submitted_by: str = "Site Supervisor"
    photo_data: Optional[str] = None
    photo_hash: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None
    location_address: Optional[str] = None
    geofence_status: Optional[str] = None
    work_start: Optional[str] = None
    work_end: Optional[str] = None
    logged_at: Optional[str] = None
    event_type: Optional[str] = None
    percent_complete: Optional[int] = None
    delay_detected: Optional[bool] = False
    delay_category: Optional[str] = None
    delay_root_cause_notes: Optional[str] = None
    mitigation_action_proposed: Optional[str] = None


class UpdateSubmissionRequest(BaseModel):
    raw_input: Optional[str] = None
    extracted_discipline: Optional[str] = None
    extracted_task: Optional[str] = None
    event_type: Optional[str] = None
    location_zone: Optional[str] = None
    matched_activity_id: Optional[str] = None
    status: Optional[str] = None
    photo_data: Optional[str] = None
    photo_hash: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None
    location_address: Optional[str] = None
    work_start: Optional[str] = None
    work_end: Optional[str] = None
    delay_detected: Optional[bool] = None
    delay_category: Optional[str] = None
    delay_root_cause_notes: Optional[str] = None
    mitigation_action_proposed: Optional[str] = None

class DelayReasonRequest(BaseModel):
    delay_category: str
    delay_root_cause_notes: Optional[str] = ""
    mitigation_action_proposed: Optional[str] = ""

class ForecastSimulationRequest(BaseModel):
    project_id: str = "PRJ-01"
    target_spi: Optional[float] = None

class RecoveryPlanRequest(BaseModel):
    project_id: str = "PRJ-01"

class ApprovalActionRequest(BaseModel):
    reason: str = ""

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "manager"

class ProjectCreateRequest(BaseModel):
    name: str
    location: str
    budget: str = "₹50.0 Cr"
    startDate: str = "2026-04-01"
    endDate: str = "2026-12-31"
    supervisor: str = "Site Engineer"
    supervisor_id: Optional[int] = None
    status: str = "On Track"
    description: str = ""
    projectManager: str = ""
    safetyOfficer: str = ""
    contractor: str = ""
    department: str = ""
    priority: str = "High"
    contractType: str = "EPC"
    workersOnSite: int = 0
    clientName: str = "Oil India Limited"

class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    budget: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    supervisor: Optional[str] = None
    supervisor_id: Optional[int] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    varianceDays: Optional[int] = None
    description: Optional[str] = None
    projectManager: Optional[str] = None
    safetyOfficer: Optional[str] = None
    contractor: Optional[str] = None
    department: Optional[str] = None
    priority: Optional[str] = None
    contractType: Optional[str] = None
    workersOnSite: Optional[int] = None
    clientName: Optional[str] = None

class ScheduleActivityUpdateRequest(BaseModel):
    activity_name: Optional[str] = None
    discipline: Optional[str] = None
    planned_start: Optional[str] = None
    planned_end: Optional[str] = None
    actual_start: Optional[str] = None
    actual_end: Optional[str] = None
    status: Optional[str] = None
    percent_complete: Optional[int] = None
    location_zone: Optional[str] = None
    challenges_summary: Optional[str] = None
    key_focus_areas: Optional[str] = None
    historical_reference: Optional[str] = None

class ScheduleActivityCreateRequest(BaseModel):
    activity_id: str
    project_id: str = "PRJ-01"
    activity_name: str
    discipline: str
    planned_start: str
    planned_end: str
    planned_duration_days: int = 10
    location_zone: str = "Zone-1"
    wbs_level: int = 5
    wbs_path: str = ""
    challenges_summary: str = ""
    key_focus_areas: str = ""
    historical_reference: str = ""

# =============================================================
# Schedule Caching for Fast Matching
# =============================================================
cached_activities = []
tfidf_vectorizer = None
tfidf_matrix = None

def reload_cache():
    global cached_activities, tfidf_vectorizer, tfidf_matrix
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM schedule_activities").fetchall()
    cached_activities = [dict(r) for r in rows]
    conn.close()

    if HAS_SKLEARN and cached_activities:
        activity_names = [a["activity_name"].lower() for a in cached_activities]
        tfidf_vectorizer = TfidfVectorizer(
            analyzer='char_wb',
            ngram_range=(2, 4),
            max_features=10000
        )
        tfidf_matrix = tfidf_vectorizer.fit_transform(activity_names)
    print(f"[CACHE] Loaded and indexed {len(cached_activities)} activities from SQLite DB.")

# =============================================================
# LLM Extraction Logic
# =============================================================
SYSTEM_PROMPT = """You are an AI Site Supervisor Log Normalizer for heavy engineering projects. Transcribe and translate any field audio input directly into clear, professional, concise English. Accurately identify engineering metrics (e.g., cubic meters, metric tons, linear meters, manpower count, equipment tags). Never output text in Hindi/Devanagari or regional scripts.

CRITICAL: ALL extracted fields MUST be in standard professional English, regardless of the input language (Hindi, Hinglish, Punjabi, Bengali, Tamil, Bhojpuri, English, etc.).
- Translate any Hindi, Hinglish, or regional language content into clear, professional English.
- Keep technical construction/engineering terms in standard English (e.g., pipeline, welding, trenching, excavation, compressor, DCS panel).
- Preserve zone names (Zone-4, Sector-4A, Unit-2), percentages, cubic meters, metric tons, and linear meters exactly as stated.

Extract the following fields and output ONLY valid JSON:
{
  "discipline": "one of: Piping, Civil, Electrical, Instrumentation, Mechanical, Fire Protection, Structural Steel",
  "extracted_task": "the core construction activity described — MUST be in English",
  "event_type": "one of: Actual Start, Actual Finish",
  "timestamp": "ISO 8601 datetime string",
  "location_zone": "zone or unit identifier"
}"""

def extract_with_groq(text: str) -> dict:
    groq_key = os.environ.get("GROQ_API_KEY", "")
    if not groq_key or not HAS_OPENAI:
        return extract_with_rules(text)
    try:
        client = OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1")
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text}
            ],
            temperature=0.1,
            max_tokens=256
        )
        content = response.choices[0].message.content.strip()
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()
        return json.loads(content)
    except Exception as e:
        print(f"Groq extraction fallback: {e}")
        return extract_with_rules(text)

def extract_with_rules(text: str) -> dict:
    text_lower = text.lower()
    discipline_map = {
        "Piping": ["pipe", "piping", "spool", "welding", "weld", "pressure test", "valve", "flange", "pipeline", "line "],
        "Civil": ["foundation", "concrete", "rebar", "excavat", "trench", "backfill", "road", "civil", "shuttering", "cement", "plinth"],
        "Electrical": ["cable", "electrical", "transformer", "switchgear", "panel", "wiring", "motor", "lighting", "earthing"],
        "Instrumentation": ["instrument", "impulse", "junction box", "transmitter", "dcs", "calibrat", "tubing", "sensor"],
        "Mechanical": ["pump", "compressor", "heat exchanger", "equipment", "mechanical", "turbine", "skid", "alignment"],
        "Fire Protection": ["fire", "hydrant", "sprinkler", "alarm", "extinguisher", "deluge", "foam"],
        "Structural Steel": ["steel", "erection", "bolting", "grouting", "structural", "rack", "derrick", "support"]
    }
    discipline = "Unknown"
    for d, keywords in discipline_map.items():
        if any(k in text_lower for k in keywords):
            discipline = d
            break

    start_keywords = ["start", "shuru", "chalu", "begin", "lagaya", "commence", "progress"]
    finish_keywords = ["complete", "finish", "done", "khatam", "ho gaya", "over", "kar diya", "poora", "successful"]
    event_type = "Actual Finish"
    for k in start_keywords:
        if k in text_lower:
            event_type = "Actual Start"
            break
    for k in finish_keywords:
        if k in text_lower:
            event_type = "Actual Finish"
            break

    time_match = re.search(r'(\d{1,2})[:\s]*(\d{2})\s*(am|pm|AM|PM)?', text)
    now = datetime.now()
    if time_match:
        hour = int(time_match.group(1))
        minute = int(time_match.group(2))
        ampm = time_match.group(3)
        if ampm and ampm.lower() == 'pm' and hour < 12:
            hour += 12
        timestamp = now.replace(hour=min(hour, 23), minute=minute, second=0).isoformat()
    else:
        timestamp = now.isoformat()

    zone_match = re.search(r'(Zone[- ]?\d+|Unit[- ]?\d+|Sector[- ]?\d+[A-Za-z]?|Station[- ]?\d+|Control[- ]?Room|Compressor[- ]?Area|Substation[- ]?[A-Za-z]?)', text, re.IGNORECASE)
    location_zone = zone_match.group(0) if zone_match else "Unknown"

    extracted_task = text.strip()
    for filler in ["aaj", "subah", "shaam", "dopahar", "kal", "abhi", "sir", "update", "report", "quick note", "morning update", "status updated", "kaam ho gaya", "ka kaam", "successful"]:
        extracted_task = re.sub(r'\b' + filler + r'\b', '', extracted_task, flags=re.IGNORECASE)
    extracted_task = re.sub(r'\s+', ' ', extracted_task).strip()
    extracted_task = re.sub(r'at\s+\d{1,2}[:\s]*\d{2}\s*(am|pm)?', '', extracted_task, flags=re.IGNORECASE).strip()
    extracted_task = re.sub(r'@\s*\d{1,2}[:\s]*\d{2}', '', extracted_task).strip()
    if len(extracted_task) < 5:
        extracted_task = text.strip()

    return {
        "discipline": discipline,
        "extracted_task": extracted_task,
        "event_type": event_type,
        "timestamp": timestamp,
        "location_zone": location_zone
    }

# =============================================================
# Semantic Matching Logic (Project-Aware)
# =============================================================
def perform_matching(query: str, discipline_filter: str = "", project_id: str = "", top_k: int = 5) -> list[dict]:
    if not cached_activities:
        reload_cache()
    if not cached_activities:
        return []
    
    candidates = cached_activities
    # Filter candidates by active project
    if project_id:
        proj_candidates = [a for a in candidates if a.get("project_id") == project_id]
        if proj_candidates:
            candidates = proj_candidates

    # Filter candidates by discipline if known
    if discipline_filter and discipline_filter.lower() != "unknown":
        filtered = [a for a in candidates if a["discipline"].lower() == discipline_filter.lower()]
        if filtered:
            candidates = filtered

    results = []
    if HAS_SKLEARN and tfidf_vectorizer is not None:
        query_vec = tfidf_vectorizer.transform([query.lower()])
        cand_indices = [cached_activities.index(a) for a in candidates]
        from scipy.sparse import vstack
        cand_matrix = vstack([tfidf_matrix[i] for i in cand_indices])
        sims = cosine_similarity(query_vec, cand_matrix).flatten()
        for idx, cos_score in enumerate(sims):
            act = candidates[idx]
            if HAS_RAPIDFUZZ:
                fuzzy_score = fuzz.token_set_ratio(query.lower(), act["activity_name"].lower()) / 100.0
                score = max(fuzzy_score, 0.4 * cos_score + 0.6 * fuzzy_score)
            else:
                score = cos_score
            results.append({
                "activity_id": act["activity_id"],
                "project_id": act.get("project_id", ""),
                "activity_name": act["activity_name"],
                "discipline": act["discipline"],
                "confidence": round(min(score, 1.0), 3)
            })
    else:
        for act in candidates:
            if HAS_RAPIDFUZZ:
                score = fuzz.token_set_ratio(query.lower(), act["activity_name"].lower()) / 100.0
            else:
                q_words = set(query.lower().split())
                n_words = set(act["activity_name"].lower().split())
                score = len(q_words & n_words) / max(len(n_words), 1)
            results.append({
                "activity_id": act["activity_id"],
                "project_id": act.get("project_id", ""),
                "activity_name": act["activity_name"],
                "discipline": act["discipline"],
                "confidence": round(min(score, 1.0), 3)
            })

    results.sort(key=lambda x: x["confidence"], reverse=True)
    return results[:top_k]

# =============================================================
# Startup & Health Check
# =============================================================
@app.on_event("startup")
async def startup():
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())
    reload_cache()

@app.get("/api/health")
def health():
    conn = get_db_connection()
    projects_count = conn.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
    conn.close()
    return {
        "status": "OK",
        "database": "Active SQLite (sih_database.db)",
        "projects_count": projects_count,
        "activities_count": len(cached_activities)
    }

# =============================================================
# Projects Endpoints (Authorized by Database Assignment)
# =============================================================
@app.get("/api/projects")
def api_get_projects(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    projects = get_user_authorized_projects(conn, current_user["id"])
    conn.close()
    return {"success": True, "count": len(projects), "projects": projects}

@app.get("/api/projects/{project_id}")
def api_get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    check_project_authorization(conn, current_user["id"], project_id)
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
    return {"success": True, "project": dict(row)}

@app.post("/api/projects")
def api_create_project(req: ProjectCreateRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()

    supervisor_user = None
    supervisor_display = req.supervisor or "Unassigned"

    # Backend supervisor validation (Requirement 2 & 3)
    if req.supervisor_id is not None and req.supervisor_id > 0:
        sup_row = cursor.execute(
            "SELECT id, name, email, role FROM users WHERE id = ?",
            (req.supervisor_id,)
        ).fetchone()
        if not sup_row:
            conn.close()
            raise HTTPException(status_code=400, detail="Selected supervisor does not exist.")
        if sup_row["role"] != "supervisor":
            conn.close()
            raise HTTPException(status_code=400, detail="Selected user is not a valid supervisor.")
        supervisor_user = dict(sup_row)
        supervisor_display = supervisor_user["name"]
    elif req.supervisor_id == 0:
        supervisor_display = "Unassigned"

    count = cursor.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
    new_id = f"PRJ-{str(count + 1).zfill(2)}"
    cursor.execute("""
    INSERT INTO projects (
        id, name, location, budget, startDate, endDate, supervisor, status, 
        progress, varianceDays, description, tasksCount,
        projectManager, safetyOfficer, contractor, department,
        priority, contractType, workersOnSite, clientName
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        new_id, req.name, req.location, req.budget, req.startDate, req.endDate,
        supervisor_display, req.status, req.description,
        req.projectManager or current_user.get("name", "Project Planner"),
        req.safetyOfficer, req.contractor, req.department,
        req.priority, req.contractType, req.workersOnSite, req.clientName
    ))

    # Automatically register planner/creator assignment in project_assignments
    cursor.execute("""
    INSERT OR IGNORE INTO project_assignments (user_id, project_id, role)
    VALUES (?, ?, ?)
    """, (current_user["id"], new_id, current_user["role"]))

    # If valid supervisor selected, store assignment & in-app notification
    if supervisor_user:
        cursor.execute("""
        INSERT OR IGNORE INTO project_assignments (user_id, project_id, role)
        VALUES (?, ?, 'supervisor')
        """, (supervisor_user["id"], new_id))

        notif_msg = f"🔔 You have been assigned to Project '{req.name}' ({new_id})."
        cursor.execute("""
        INSERT INTO notifications (user_id, project_id, message, notification_type, is_read)
        VALUES (?, ?, ?, 'assignment', 0)
        """, (supervisor_user["id"], new_id, notif_msg))

    conn.commit()

    # Attempt email notification (Failure NEVER breaks assignment or rolls back DB)
    if supervisor_user:
        try:
            send_supervisor_assignment_email(
                supervisor_name=supervisor_user["name"],
                supervisor_email=supervisor_user.get("email"),
                project_name=req.name,
                project_id=new_id,
                assigned_by_name=current_user.get("name", "Project Planner"),
                is_reassignment=False
            )
        except Exception as email_err:
            print(f"[EMAIL NOTIFICATION WARNING] {email_err}")

    row = cursor.execute("SELECT * FROM projects WHERE id = ?", (new_id,)).fetchone()
    conn.close()
    return {"success": True, "project": dict(row) if row else {"id": new_id}}

@app.put("/api/projects/{project_id}")
def api_update_project(project_id: str, req: ProjectUpdateRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    check_project_authorization(conn, current_user["id"], project_id)
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

    current = dict(row)
    project_name = req.name if req.name is not None else current["name"]

    # Validate supervisor if supervisor_id is passed
    new_supervisor_user = None
    supervisor_display = req.supervisor if req.supervisor is not None else current["supervisor"]

    if req.supervisor_id is not None:
        if req.supervisor_id > 0:
            sup_row = cursor.execute(
                "SELECT id, name, email, role FROM users WHERE id = ?",
                (req.supervisor_id,)
            ).fetchone()
            if not sup_row:
                conn.close()
                raise HTTPException(status_code=400, detail="Selected supervisor does not exist.")
            if sup_row["role"] != "supervisor":
                conn.close()
                raise HTTPException(status_code=400, detail="Selected user is not a valid supervisor.")
            new_supervisor_user = dict(sup_row)
            supervisor_display = new_supervisor_user["name"]
        elif req.supervisor_id == 0:
            supervisor_display = "Unassigned"

    # Find currently assigned supervisor
    old_sup_row = cursor.execute(
        "SELECT user_id FROM project_assignments WHERE project_id = ? AND role = 'supervisor'",
        (project_id,)
    ).fetchone()
    old_supervisor_id = old_sup_row["user_id"] if old_sup_row else None

    # Handle Reassignment (Requirement 10)
    reassigned = False
    if req.supervisor_id is not None:
        if new_supervisor_user and new_supervisor_user["id"] != old_supervisor_id:
            reassigned = True
            # Old supervisor loses access
            if old_supervisor_id:
                cursor.execute(
                    "DELETE FROM project_assignments WHERE project_id = ? AND user_id = ? AND role = 'supervisor'",
                    (project_id, old_supervisor_id)
                )
                # In-app notification for old supervisor
                old_notif_msg = f"Project '{project_name}' ({project_id}) has been reassigned to another supervisor."
                cursor.execute("""
                INSERT INTO notifications (user_id, project_id, message, notification_type, is_read)
                VALUES (?, ?, ?, 'reassignment', 0)
                """, (old_supervisor_id, project_id, old_notif_msg))

            # New supervisor gains access
            cursor.execute("""
            INSERT OR IGNORE INTO project_assignments (user_id, project_id, role)
            VALUES (?, ?, 'supervisor')
            """, (new_supervisor_user["id"], project_id))

            # In-app notification for new supervisor
            new_notif_msg = f"🔔 You have been assigned to Project '{project_name}' ({project_id})."
            cursor.execute("""
            INSERT INTO notifications (user_id, project_id, message, notification_type, is_read)
            VALUES (?, ?, ?, 'assignment', 0)
            """, (new_supervisor_user["id"], project_id, new_notif_msg))

        elif req.supervisor_id == 0 and old_supervisor_id:
            # Unassigned
            cursor.execute(
                "DELETE FROM project_assignments WHERE project_id = ? AND user_id = ? AND role = 'supervisor'",
                (project_id, old_supervisor_id)
            )

    updated = {
        "name": project_name,
        "location": req.location if req.location is not None else current["location"],
        "budget": req.budget if req.budget is not None else current["budget"],
        "startDate": req.startDate if req.startDate is not None else current["startDate"],
        "endDate": req.endDate if req.endDate is not None else current["endDate"],
        "supervisor": supervisor_display,
        "status": req.status if req.status is not None else current["status"],
        "progress": req.progress if req.progress is not None else current["progress"],
        "varianceDays": req.varianceDays if req.varianceDays is not None else current["varianceDays"],
        "description": req.description if req.description is not None else current.get("description", ""),
        "projectManager": req.projectManager if req.projectManager is not None else current.get("projectManager", ""),
        "safetyOfficer": req.safetyOfficer if req.safetyOfficer is not None else current.get("safetyOfficer", ""),
        "contractor": req.contractor if req.contractor is not None else current.get("contractor", ""),
        "department": req.department if req.department is not None else current.get("department", ""),
        "priority": req.priority if req.priority is not None else current.get("priority", "High"),
        "contractType": req.contractType if req.contractType is not None else current.get("contractType", "EPC"),
        "workersOnSite": req.workersOnSite if req.workersOnSite is not None else current.get("workersOnSite", 0),
        "clientName": req.clientName if req.clientName is not None else current.get("clientName", "Oil India Limited"),
    }

    cursor.execute("""
    UPDATE projects 
    SET name = ?, location = ?, budget = ?, startDate = ?, endDate = ?, supervisor = ?, 
        status = ?, progress = ?, varianceDays = ?, description = ?,
        projectManager = ?, safetyOfficer = ?, contractor = ?, department = ?,
        priority = ?, contractType = ?, workersOnSite = ?, clientName = ?
    WHERE id = ?
    """, (
        updated["name"], updated["location"], updated["budget"], updated["startDate"],
        updated["endDate"], updated["supervisor"], updated["status"], updated["progress"],
        updated["varianceDays"], updated["description"],
        updated["projectManager"], updated["safetyOfficer"], updated["contractor"], updated["department"],
        updated["priority"], updated["contractType"], updated["workersOnSite"], updated["clientName"],
        project_id
    ))
    conn.commit()

    # Send email notification to new supervisor if reassigned
    if reassigned and new_supervisor_user:
        try:
            send_supervisor_assignment_email(
                supervisor_name=new_supervisor_user["name"],
                supervisor_email=new_supervisor_user.get("email"),
                project_name=project_name,
                project_id=project_id,
                assigned_by_name=current_user.get("name", "Project Planner"),
                is_reassignment=True
            )
        except Exception as email_err:
            print(f"[EMAIL REASSIGNMENT WARNING] {email_err}")

    conn.close()
    return {"success": True, "project": {**updated, "id": project_id}}

@app.delete("/api/projects/{project_id}")
def api_delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    check_project_authorization(conn, current_user["id"], project_id)
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

    cursor.execute("DELETE FROM schedule_activities WHERE project_id = ?", (project_id,))
    cursor.execute("DELETE FROM pending_updates WHERE project_id = ?", (project_id,))
    cursor.execute("DELETE FROM project_assignments WHERE project_id = ?", (project_id,))
    cursor.execute("DELETE FROM notifications WHERE project_id = ?", (project_id,))
    cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    conn.commit()
    conn.close()
    reload_cache()
    return {"success": True, "message": f"Project '{project_id}' and all associated activities/records deleted successfully."}

@app.post("/api/projects/{project_id}/abandon")
def api_abandon_project(project_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    check_project_authorization(conn, current_user["id"], project_id)
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

    cursor.execute("UPDATE projects SET status = 'Shut Down' WHERE id = ?", (project_id,))
    cursor.execute("UPDATE schedule_activities SET status = 'Suspended' WHERE project_id = ? AND status != 'Completed'", (project_id,))
    conn.commit()
    row = cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    conn.close()
    reload_cache()
    return {"success": True, "message": f"Project '{project_id}' has been marked as Shut Down / Abandoned.", "project": dict(row)}

# =============================================================
# User Authentication Endpoints (SQLite DB + Signed Tokens)
# =============================================================
@app.post("/api/auth/login")
def api_login(req: LoginRequest):
    conn = get_db_connection()
    pw_hash = hashlib.sha256(req.password.encode()).hexdigest()
    user = conn.execute(
        "SELECT id, name, email, role FROM users WHERE LOWER(email) = LOWER(?) AND password_hash = ?",
        (req.email.strip(), pw_hash)
    ).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_dict = dict(user)
    token = create_access_token(user_dict["id"], user_dict["role"])
    assigned_projects = get_user_authorized_projects(conn, user_dict["id"])
    conn.close()

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user_dict["id"],
            "name": user_dict["name"],
            "email": user_dict["email"],
            "role": user_dict["role"],
            "roleKey": user_dict["role"],
            "assigned_project_ids": [p["id"] for p in assigned_projects]
        }
    }

@app.post("/api/auth/signup")
def api_signup(req: SignupRequest):
    if not req.name.strip() or not req.email.strip() or not req.password:
        raise HTTPException(status_code=400, detail="All fields are required")

    conn = get_db_connection()
    cursor = conn.cursor()

    existing = cursor.execute(
        "SELECT id FROM users WHERE LOWER(email) = LOWER(?)",
        (req.email.strip(),)
    ).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")

    pw_hash = hashlib.sha256(req.password.encode()).hexdigest()
    cursor.execute("""
    INSERT INTO users (name, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    """, (req.name.strip(), req.email.strip(), pw_hash, req.role))
    user_id = cursor.lastrowid
    token = create_access_token(user_id, req.role)
    conn.commit()
    conn.close()

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user_id,
            "name": req.name.strip(),
            "email": req.email.strip(),
            "role": req.role,
            "roleKey": req.role,
            "assigned_project_ids": []
        }
    }

# =============================================================
# Supervisor Directory & In-App Notifications Endpoints
# =============================================================
@app.get("/api/users/supervisors")
def api_get_supervisors(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT id, name, email FROM users WHERE role = 'supervisor' ORDER BY name ASC"
    ).fetchall()
    conn.close()
    return {"success": True, "count": len(rows), "supervisors": [dict(r) for r in rows]}

@app.get("/api/notifications")
def api_get_notifications(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50",
        (current_user["id"],)
    ).fetchall()
    unread_count = conn.execute(
        "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0",
        (current_user["id"],)
    ).fetchone()[0]
    conn.close()
    return {"success": True, "unread_count": unread_count, "notifications": [dict(r) for r in rows]}

@app.put("/api/notifications/{notification_id}/read")
def api_mark_notification_read(notification_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    conn.execute(
        "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
        (notification_id, current_user["id"])
    )
    conn.commit()
    conn.close()
    return {"success": True}

@app.put("/api/notifications/read-all")
def api_mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    conn.execute(
        "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
        (current_user["id"],)
    )
    conn.commit()
    conn.close()
    return {"success": True}

# =============================================================
# AI Extraction & Matching Endpoints
# =============================================================
@app.post("/api/extract")
def api_extract(req: ExtractRequest):
    return extract_with_groq(req.text)

@app.post("/api/match")
def api_match(req: MatchRequest):
    return {"matches": perform_matching(req.extracted_task, req.discipline, req.project_id)}

# Core Pipeline: Field Input -> AI Extract -> Semantic Match -> Pending DB Queue
@app.post("/api/field-update")
def api_field_update(req: FieldUpdateRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    check_project_authorization(conn, current_user["id"], req.project_id)

    extracted = extract_with_groq(req.text)
    matches = perform_matching(
        query=extracted["extracted_task"],
        discipline_filter=extracted.get("discipline", ""),
        project_id=req.project_id
    )
    best_match = matches[0] if matches else None
    confidence = best_match["confidence"] if best_match else 0.0

    # Auto-Push to Database if Confidence >= 90% (0.90)
    auto_approved = False
    initial_status = "pending"
    reviewed_at = None
    
    if confidence >= 0.90 and best_match and best_match.get("activity_id"):
        auto_approved = True
        initial_status = "approved"
        reviewed_at = datetime.now().isoformat()

    # Intelligent Delay Detection Logic
    delay_detected = bool(req.delay_detected)
    detected_category = req.delay_category
    
    # Check text for stoppage or delay keywords
    text_lower = req.text.lower()
    delay_keywords = [
        "delay", "stoppage", "stopped", "halt", "halted", "stuck", "breakdown",
        "failure", "shortage", "waterlog", "flood", "rain", "monsoon", "dispute",
        "protest", "issue", "problem", "blocker", "slow", "lag", "clearance", "pending drawing"
    ]
    if any(kw in text_lower for kw in delay_keywords):
        delay_detected = True
        if not detected_category:
            if any(w in text_lower for w in ["rain", "monsoon", "waterlog", "flood", "weather"]):
                detected_category = "Weather / Monsoon / Waterlogging"
            elif any(w in text_lower for w in ["breakdown", "rig", "crane", "machine", "equipment", "fault"]):
                detected_category = "Equipment Breakdown / Rig Failure"
            elif any(w in text_lower for w in ["row", "land", "farmer", "clearance", "dispute", "protest"]):
                detected_category = "Right of Way (ROW) / Land Clearance Issues"
            elif any(w in text_lower for w in ["material", "supply", "pipe", "cement", "shortage", "stock"]):
                detected_category = "Material / Pipe Supply Shortage"
            elif any(w in text_lower for w in ["labor", "labour", "manpower", "worker", "strike"]):
                detected_category = "Manpower / Labor Shortage or Dispute"
            elif any(w in text_lower for w in ["drawing", "clarification", "engineering", "approval", "design"]):
                detected_category = "Engineering / Drawing Clarification Pending"

    # Schedule lag / SPI check on matched activity
    if best_match and best_match.get("activity_id"):
        act_row = conn.execute("SELECT planned_end, percent_complete, status FROM schedule_activities WHERE activity_id = ?", (best_match["activity_id"],)).fetchone()
        if act_row:
            p_end = act_row["planned_end"]
            current_date_str = datetime.now().strftime("%Y-%m-%d")
            if p_end and p_end < current_date_str and act_row["status"] != "Completed":
                delay_detected = True
            elif req.percent_complete is not None and req.percent_complete < 50 and p_end and p_end <= current_date_str:
                delay_detected = True

    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO pending_updates (
        project_id, raw_input, extracted_discipline, extracted_task, event_type, 
        extracted_timestamp, location_zone, matched_activity_id, 
        matched_activity_name, confidence, source_type, status, created_at, reviewed_at, submitted_by,
        photo_data, photo_hash, latitude, longitude, accuracy, location_address, geofence_status,
        work_start, work_end, logged_at, delay_detected, delay_category, delay_root_cause_notes, mitigation_action_proposed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        req.project_id,
        req.text,
        extracted.get("discipline", "Unknown"),
        extracted.get("extracted_task", req.text),
        req.event_type or extracted.get("event_type", "Actual Finish"),
        extracted.get("timestamp", datetime.now().isoformat()),
        extracted.get("location_zone", "Unknown"),
        best_match["activity_id"] if best_match else None,
        best_match["activity_name"] if best_match else None,
        confidence,
        req.source_type,
        initial_status,
        datetime.now().isoformat(),
        reviewed_at,
        current_user.get("name", req.submitted_by),
        req.photo_data,
        req.photo_hash,
        req.latitude,
        req.longitude,
        req.accuracy,
        req.location_address,
        req.geofence_status,
        req.work_start,
        req.work_end,
        req.logged_at or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        1 if delay_detected else 0,
        detected_category or req.delay_category,
        req.delay_root_cause_notes or "",
        req.mitigation_action_proposed or ""
    ))
    update_id = cursor.lastrowid

    # If confidence >= 90%, immediately execute the schedule update in SQLite!
    if auto_approved and best_match and best_match.get("activity_id"):
        date_str = extracted.get("timestamp", datetime.now().isoformat()).split("T")[0]
        eff_event = req.event_type or extracted.get("event_type", "Actual Finish")
        act_start = req.work_start or date_str
        act_end = req.work_end or date_str
        pct_comp = req.percent_complete if req.percent_complete is not None else 50
        
        if eff_event == "Actual Start":
            cursor.execute("""
            UPDATE schedule_activities 
            SET actual_start = ?, status = 'In Progress', percent_complete = CASE WHEN percent_complete < ? THEN ? ELSE percent_complete END
            WHERE activity_id = ? AND project_id = ?
            """, (act_start, pct_comp, pct_comp, best_match["activity_id"], req.project_id))
        elif eff_event == "Work in Progress":
            cursor.execute("""
            UPDATE schedule_activities 
            SET actual_start = COALESCE(actual_start, ?), status = 'In Progress', percent_complete = ?
            WHERE activity_id = ? AND project_id = ?
            """, (act_start, pct_comp, best_match["activity_id"], req.project_id))
        else:
            cursor.execute("""
            UPDATE schedule_activities 
            SET actual_end = ?, status = 'Completed', percent_complete = 100
            WHERE activity_id = ? AND project_id = ?
            """, (act_end, best_match["activity_id"], req.project_id))
        conn.commit()
        reload_cache()

    conn.commit()
    conn.close()

    return {
        "success": True,
        "pending_update_id": update_id,
        "project_id": req.project_id,
        "extracted": extracted,
        "best_match": best_match,
        "all_matches": matches,
        "confidence": confidence,
        "confidence_level": "high" if confidence >= 0.85 else "medium" if confidence >= 0.65 else "low",
        "auto_approved": auto_approved,
        "status": initial_status,
        "delay_detected": delay_detected,
        "delay_category": detected_category or req.delay_category,
        "delay_prompt": f"Delay detected for activity {best_match.get('activity_name') if best_match else extracted.get('extracted_task')}. Please specify the root cause category and reason." if delay_detected else None,
        "message": f"⚡ High confidence ({round(confidence * 100)}% >= 90%): Automatically pushed and committed to Primavera schedule database!" if auto_approved else "Queued in schedule pending queue for Planner review."
    }

# =============================================================
# Schedule Activities Endpoints (Authorized by Project Assignment)
# =============================================================
@app.get("/api/schedule/activities")
def api_get_activities(
    project_id: Optional[str] = None,
    discipline: Optional[str] = None,
    status: Optional[str] = None,
    zone: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    conn = get_db_connection()
    if project_id:
        check_project_authorization(conn, current_user["id"], project_id)
        query = "SELECT * FROM schedule_activities WHERE project_id = ?"
        params = [project_id]
    else:
        query = "SELECT * FROM schedule_activities WHERE project_id IN (SELECT project_id FROM project_assignments WHERE user_id = ?)"
        params = [current_user["id"]]

    if discipline and discipline != "All":
        query += " AND discipline = ?"
        params.append(discipline)
    if status and status != "All":
        query += " AND status = ?"
        params.append(status)
    if zone and zone != "All":
        query += " AND location_zone = ?"
        params.append(zone)

    query += " ORDER BY planned_start ASC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return {"success": True, "count": len(rows), "activities": [dict(r) for r in rows]}

@app.post("/api/schedule/activities")
def api_create_activity(req: ScheduleActivityCreateRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    check_project_authorization(conn, current_user["id"], req.project_id)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO schedule_activities (
        activity_id, project_id, wbs_level, wbs_path, activity_name, discipline,
        planned_start, planned_end, planned_duration_days, status, percent_complete, location_zone,
        challenges_summary, key_focus_areas, historical_reference
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Not Started', 0, ?, ?, ?, ?)
    """, (
        req.activity_id, req.project_id, req.wbs_level, req.wbs_path or f"{req.project_id} > {req.discipline} > {req.activity_name}",
        req.activity_name, req.discipline, req.planned_start, req.planned_end,
        req.planned_duration_days, req.location_zone,
        req.challenges_summary, req.key_focus_areas, req.historical_reference
    ))
    conn.commit()
    conn.close()
    reload_cache()
    return {"success": True, "activity_id": req.activity_id}

@app.put("/api/schedule/activities/{activity_id}")
def api_update_activity(activity_id: str, req: ScheduleActivityUpdateRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM schedule_activities WHERE activity_id = ?", (activity_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Activity not found")

    act_proj_id = row["project_id"]
    check_project_authorization(conn, current_user["id"], act_proj_id)

    cur = dict(row)
    updated = {
        "activity_name": req.activity_name if req.activity_name is not None else cur["activity_name"],
        "discipline": req.discipline if req.discipline is not None else cur["discipline"],
        "planned_start": req.planned_start if req.planned_start is not None else cur["planned_start"],
        "planned_end": req.planned_end if req.planned_end is not None else cur["planned_end"],
        "actual_start": req.actual_start if req.actual_start is not None else cur["actual_start"],
        "actual_end": req.actual_end if req.actual_end is not None else cur["actual_end"],
        "status": req.status if req.status is not None else cur["status"],
        "percent_complete": req.percent_complete if req.percent_complete is not None else cur["percent_complete"],
        "location_zone": req.location_zone if req.location_zone is not None else cur["location_zone"],
        "challenges_summary": req.challenges_summary if req.challenges_summary is not None else cur.get("challenges_summary", ""),
        "key_focus_areas": req.key_focus_areas if req.key_focus_areas is not None else cur.get("key_focus_areas", ""),
        "historical_reference": req.historical_reference if req.historical_reference is not None else cur.get("historical_reference", ""),
    }

    cursor = conn.cursor()
    cursor.execute("""
    UPDATE schedule_activities 
    SET activity_name = ?, discipline = ?, planned_start = ?, planned_end = ?, actual_start = ?, actual_end = ?, 
        status = ?, percent_complete = ?, location_zone = ?,
        challenges_summary = ?, key_focus_areas = ?, historical_reference = ?
    WHERE activity_id = ?
    """, (
        updated["activity_name"], updated["discipline"], updated["planned_start"],
        updated["planned_end"], updated["actual_start"], updated["actual_end"],
        updated["status"], updated["percent_complete"], updated["location_zone"],
        updated["challenges_summary"], updated["key_focus_areas"], updated["historical_reference"],
        activity_id
    ))
    conn.commit()
    conn.close()
    reload_cache()
    return {"success": True, "activity": {**updated, "activity_id": activity_id}}

# =============================================================
# Pending Updates & Edit Previous Work (Supervisors & Planners)
# =============================================================
@app.get("/api/pending-updates")
def api_get_pending_updates(
    project_id: Optional[str] = None, 
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    conn = get_db_connection()
    if project_id:
        check_project_authorization(conn, current_user["id"], project_id)
        query = "SELECT * FROM pending_updates WHERE project_id = ?"
        params = [project_id]
    else:
        query = "SELECT * FROM pending_updates WHERE project_id IN (SELECT project_id FROM project_assignments WHERE user_id = ?)"
        params = [current_user["id"]]

    if status and status != "all":
        query += " AND status = ?"
        params.append(status)

    query += " ORDER BY id DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return {"success": True, "count": len(rows), "updates": [dict(r) for r in rows]}

# EDIT PREVIOUS WORK SUBMISSION
@app.put("/api/pending-updates/{id}")
def api_edit_submission(id: int, req: UpdateSubmissionRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM pending_updates WHERE id = ?", (id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Submission record not found")

    check_project_authorization(conn, current_user["id"], row["project_id"])

    cur = dict(row)
    new_raw = req.raw_input if req.raw_input is not None else cur["raw_input"]
    new_disc = req.extracted_discipline if req.extracted_discipline is not None else cur["extracted_discipline"]
    new_task = req.extracted_task if req.extracted_task is not None else cur["extracted_task"]
    new_event = req.event_type if req.event_type is not None else cur["event_type"]
    new_zone = req.location_zone if req.location_zone is not None else cur["location_zone"]
    new_matched_id = req.matched_activity_id if req.matched_activity_id is not None else cur["matched_activity_id"]
    new_status = req.status if req.status is not None else cur["status"]
    new_photo_data = req.photo_data if req.photo_data is not None else cur.get("photo_data")
    new_photo_hash = req.photo_hash if req.photo_hash is not None else cur.get("photo_hash")
    new_lat = req.latitude if req.latitude is not None else cur.get("latitude")
    new_lng = req.longitude if req.longitude is not None else cur.get("longitude")
    new_acc = req.accuracy if req.accuracy is not None else cur.get("accuracy")
    new_addr = req.location_address if req.location_address is not None else cur.get("location_address")
    new_start = req.work_start if req.work_start is not None else cur.get("work_start")
    new_end = req.work_end if req.work_end is not None else cur.get("work_end")

    # Re-lookup matched activity name if matched ID changed
    matched_name = cur["matched_activity_name"]
    if new_matched_id != cur["matched_activity_id"] and new_matched_id:
        act_row = cursor.execute("SELECT activity_name FROM schedule_activities WHERE activity_id = ?", (new_matched_id,)).fetchone()
        if act_row:
            matched_name = act_row["activity_name"]

    new_delay_detected = 1 if req.delay_detected else (0 if req.delay_detected is False else cur.get("delay_detected", 0))
    new_delay_category = req.delay_category if req.delay_category is not None else cur.get("delay_category")
    new_delay_notes = req.delay_root_cause_notes if req.delay_root_cause_notes is not None else cur.get("delay_root_cause_notes")
    new_mitigation = req.mitigation_action_proposed if req.mitigation_action_proposed is not None else cur.get("mitigation_action_proposed")

    cursor.execute("""
    UPDATE pending_updates 
    SET raw_input = ?, extracted_discipline = ?, extracted_task = ?, event_type = ?, 
        location_zone = ?, matched_activity_id = ?, matched_activity_name = ?, status = ?,
        photo_data = ?, photo_hash = ?, latitude = ?, longitude = ?, accuracy = ?, location_address = ?,
        work_start = ?, work_end = ?, delay_detected = ?, delay_category = ?, delay_root_cause_notes = ?, mitigation_action_proposed = ?
    WHERE id = ?
    """, (
        new_raw, new_disc, new_task, new_event, new_zone, new_matched_id, matched_name, new_status,
        new_photo_data, new_photo_hash, new_lat, new_lng, new_acc, new_addr,
        new_start, new_end, new_delay_detected, new_delay_category, new_delay_notes, new_mitigation, id
    ))
    conn.commit()
    conn.close()
    return {"success": True, "id": id, "message": "Submission updated successfully"}

# UPDATE DELAY REASON & ROOT CAUSE WORKFLOW
@app.put("/api/pending-updates/{id}/delay-reason")
def api_update_delay_reason(id: int, req: DelayReasonRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT project_id FROM pending_updates WHERE id = ?", (id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Pending update not found")
    check_project_authorization(conn, current_user["id"], row["project_id"])

    cursor.execute("""
        UPDATE pending_updates
        SET delay_detected = 1, delay_category = ?, delay_root_cause_notes = ?, mitigation_action_proposed = ?
        WHERE id = ?
    """, (req.delay_category, req.delay_root_cause_notes or "", req.mitigation_action_proposed or "", id))
    conn.commit()
    conn.close()
    return {
        "success": True, 
        "id": id, 
        "delay_detected": True, 
        "delay_category": req.delay_category,
        "delay_root_cause_notes": req.delay_root_cause_notes or "",
        "mitigation_action_proposed": req.mitigation_action_proposed or "",
        "message": "Delay root-cause captured successfully"
    }

@app.delete("/api/pending-updates/{id}")
def api_delete_submission(id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    row = conn.execute("SELECT project_id FROM pending_updates WHERE id = ?", (id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Submission record not found")
    check_project_authorization(conn, current_user["id"], row["project_id"])
    cursor = conn.cursor()
    cursor.execute("DELETE FROM pending_updates WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return {"success": True, "id": id, "message": "Submission deleted"}

# Approve update -> updates schedule_activities
@app.post("/api/pending-updates/{id}/approve")
def api_approve_update(id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM pending_updates WHERE id = ?", (id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Pending update not found")
    
    check_project_authorization(conn, current_user["id"], row["project_id"])

    update = dict(row)
    now_str = datetime.now().isoformat()
    cursor.execute("UPDATE pending_updates SET status = 'approved', reviewed_at = ? WHERE id = ?", (now_str, id))
    
    if update["matched_activity_id"]:
        date_str = update["extracted_timestamp"].split("T")[0] if update["extracted_timestamp"] else datetime.now().strftime("%Y-%m-%d")
        act_start = update["work_start"] or date_str
        act_end = update["work_end"] or date_str
        if update["event_type"] == "Actual Start":
            cursor.execute("""
            UPDATE schedule_activities 
            SET actual_start = ?, status = 'In Progress', percent_complete = CASE WHEN percent_complete < 50 THEN 50 ELSE percent_complete END
            WHERE activity_id = ?
            """, (act_start, update["matched_activity_id"]))
        elif update["event_type"] == "Work in Progress":
            cursor.execute("""
            UPDATE schedule_activities 
            SET actual_start = COALESCE(actual_start, ?), status = 'In Progress', percent_complete = CASE WHEN percent_complete < 50 THEN 50 ELSE percent_complete END
            WHERE activity_id = ?
            """, (act_start, update["matched_activity_id"]))
        else:
            cursor.execute("""
            UPDATE schedule_activities 
            SET actual_end = ?, status = 'Completed', percent_complete = 100
            WHERE activity_id = ?
            """, (act_end, update["matched_activity_id"]))
        conn.commit()
        reload_cache()

    conn.commit()
    conn.close()
    return {"success": True, "status": "approved", "id": id}

# Reject update
@app.post("/api/pending-updates/{id}/reject")
def api_reject_update(id: int, req: ApprovalActionRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    row = conn.execute("SELECT project_id FROM pending_updates WHERE id = ?", (id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Pending update not found")
    check_project_authorization(conn, current_user["id"], row["project_id"])

    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    cursor.execute("UPDATE pending_updates SET status = 'rejected', reviewed_at = ?, rejection_reason = ? WHERE id = ?", (now_str, req.reason, id))
    conn.commit()
    conn.close()
    return {"success": True, "status": "rejected", "id": id}

# =============================================================
# Project-Specific Analytics Summary
# =============================================================
@app.get("/api/analytics/summary")
def api_get_analytics(project_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    
    if project_id:
        check_project_authorization(conn, current_user["id"], project_id)
        where_clause = " WHERE project_id = ?"
        params = [project_id]
    else:
        where_clause = " WHERE project_id IN (SELECT project_id FROM project_assignments WHERE user_id = ?)"
        params = [current_user["id"]]

    total = conn.execute(f"SELECT COUNT(*) FROM schedule_activities{where_clause}", params).fetchone()[0]
    
    comp_query = f"SELECT COUNT(*) FROM schedule_activities{where_clause} AND status = 'Completed'" if where_clause else "SELECT COUNT(*) FROM schedule_activities WHERE status = 'Completed'"
    completed = conn.execute(comp_query, params).fetchone()[0]
    
    prog_query = f"SELECT COUNT(*) FROM schedule_activities{where_clause} AND status = 'In Progress'" if where_clause else "SELECT COUNT(*) FROM schedule_activities WHERE status = 'In Progress'"
    in_progress = conn.execute(prog_query, params).fetchone()[0]
    
    not_query = f"SELECT COUNT(*) FROM schedule_activities{where_clause} AND status = 'Not Started'" if where_clause else "SELECT COUNT(*) FROM schedule_activities WHERE status = 'Not Started'"
    not_started = conn.execute(not_query, params).fetchone()[0]
    
    delayed_query = "SELECT activity_id, discipline, planned_end, actual_end FROM schedule_activities WHERE actual_end IS NOT NULL AND actual_end > planned_end"
    if project_id: delayed_query += " AND project_id = ?"
    delayed_rows = conn.execute(delayed_query, params).fetchall()
    delayed = len(delayed_rows)

    disc_query = f"SELECT DISTINCT discipline FROM schedule_activities{where_clause}"
    disc_rows = conn.execute(disc_query, params).fetchall()
    by_disc = []
    for (d,) in disc_rows:
        d_params = [d]
        d_where = "discipline = ?"
        if project_id:
            d_where += " AND project_id = ?"
            d_params.append(project_id)

        d_tot = conn.execute(f"SELECT COUNT(*) FROM schedule_activities WHERE {d_where}", d_params).fetchone()[0]
        d_comp = conn.execute(f"SELECT COUNT(*) FROM schedule_activities WHERE {d_where} AND status = 'Completed'", d_params).fetchone()[0]
        d_delays = conn.execute(f"SELECT planned_end, actual_end FROM schedule_activities WHERE {d_where} AND actual_end IS NOT NULL AND actual_end > planned_end", d_params).fetchall()
        
        diffs = []
        for p_end, a_end in d_delays:
            try:
                dt_p = datetime.strptime(p_end, "%Y-%m-%d")
                dt_a = datetime.strptime(a_end, "%Y-%m-%d")
                diffs.append((dt_a - dt_p).days)
            except Exception:
                pass
        avg_d = round(sum(diffs) / len(diffs), 1) if diffs else 0.0

        by_disc.append({
            "discipline": d,
            "total": d_tot,
            "completed": d_comp,
            "delayed": len(d_delays),
            "avgDelayDays": avg_d
        })
    conn.close()

    return {
        "success": True,
        "project_id": project_id or "all",
        "analytics": {
            "total": total,
            "completed": completed,
            "inProgress": in_progress,
            "notStarted": not_started,
            "delayed": delayed,
            "byDiscipline": by_disc
        }
    }

# =============================================================
# AI Schedule Simulation & EVM Completion Forecaster
# =============================================================
@app.post("/api/schedule/forecast-simulation")
def api_forecast_simulation(req: ForecastSimulationRequest, current_user: dict = Depends(get_current_user)):
    from datetime import timedelta
    conn = get_db_connection()
    check_project_authorization(conn, current_user["id"], req.project_id)

    proj = conn.execute("SELECT * FROM projects WHERE id = ?", (req.project_id,)).fetchone()
    activities = conn.execute(
        "SELECT activity_id, activity_name, discipline, planned_start, planned_end, actual_start, actual_end, status, percent_complete, location_zone FROM schedule_activities WHERE project_id = ?",
        (req.project_id,)
    ).fetchall()

    start_date_str = proj["startDate"] if proj and proj["startDate"] else "2026-04-01"
    end_date_str = proj["endDate"] if proj and proj["endDate"] else "2026-11-30"

    p_starts = [a["planned_start"] for a in activities if a["planned_start"]]
    p_ends = [a["planned_end"] for a in activities if a["planned_end"]]
    if p_starts:
        start_date_str = min(p_starts)
    if p_ends:
        end_date_str = max(p_ends)

    try:
        dt_start = datetime.strptime(start_date_str, "%Y-%m-%d")
        dt_end = datetime.strptime(end_date_str, "%Y-%m-%d")
    except Exception:
        dt_start = datetime(2026, 4, 1)
        dt_end = datetime(2026, 11, 30)

    baseline_duration = max((dt_end - dt_start).days, 30)

    # Calculate EVM metrics: Cumulative SPI = Actual Execution / Planned Baseline Completion
    total_acts = len(activities)
    if total_acts > 0:
        total_actual_pct = sum(a["percent_complete"] or 0 for a in activities) / total_acts
        now_dt = datetime.now()
        if now_dt <= dt_start:
            planned_pct = 10.0
        elif now_dt >= dt_end:
            planned_pct = 100.0
        else:
            elapsed = (now_dt - dt_start).days
            planned_pct = min(max((elapsed / baseline_duration) * 100.0, 10.0), 100.0)

        calc_spi = round(total_actual_pct / max(planned_pct, 1.0), 2)
        current_cumulative_spi = max(calc_spi, 0.43)
    else:
        current_cumulative_spi = 0.43

    effective_spi = float(req.target_spi) if req.target_spi is not None and req.target_spi > 0 else current_cumulative_spi
    effective_spi = max(min(effective_spi, 2.0), 0.1)

    # Standard EVM formula: Projected Total Duration = Baseline Duration / SPI
    projected_duration = int(round(baseline_duration / effective_spi))
    forecasted_delay_days = projected_duration - baseline_duration
    projected_finish_date = dt_start + timedelta(days=projected_duration)

    # Lagging tasks
    lagging_tasks = []
    for a in activities:
        p_e = a["planned_end"]
        pct = a["percent_complete"] or 0
        stat = a["status"]
        if p_e and stat != "Completed":
            try:
                dt_pe = datetime.strptime(p_e, "%Y-%m-%d")
                days_slip = (datetime.now() - dt_pe).days
                if days_slip > 0 or pct < 50:
                    lagging_tasks.append({
                        "activity_id": a["activity_id"],
                        "name": a["activity_name"],
                        "discipline": a["discipline"],
                        "zone": a["location_zone"],
                        "current_slip_days": max(days_slip, 8),
                        "percent_complete": pct,
                        "status": stat
                    })
            except Exception:
                pass

    conn.close()

    return {
        "success": True,
        "project_id": req.project_id,
        "baseline_start": dt_start.strftime("%Y-%m-%d"),
        "baseline_end": dt_end.strftime("%Y-%m-%d"),
        "baseline_finish_formatted": dt_end.strftime("%b %d, %Y"),
        "baseline_duration_days": baseline_duration,
        "current_cumulative_spi": current_cumulative_spi,
        "simulated_spi": round(effective_spi, 2),
        "projected_duration_days": projected_duration,
        "forecasted_delay_days": forecasted_delay_days,
        "projected_finish_date": projected_finish_date.strftime("%Y-%m-%d"),
        "projected_finish_formatted": projected_finish_date.strftime("%b %d, %Y"),
        "trajectory_message": f"At current execution velocity (SPI {effective_spi:.2f}), project will slip by {'+' if forecasted_delay_days >= 0 else ''}{forecasted_delay_days} calendar days.",
        "lagging_tasks_count": len(lagging_tasks),
        "lagging_tasks": lagging_tasks[:6]
    }

# =============================================================
# AI Heavy-Engineering Recovery Strategy Generator
# =============================================================
@app.post("/api/schedule/generate-recovery-plan")
def api_generate_recovery_plan(req: RecoveryPlanRequest, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    check_project_authorization(conn, current_user["id"], req.project_id)
    
    proj = conn.execute("SELECT * FROM projects WHERE id = ?", (req.project_id,)).fetchone()
    activities = conn.execute(
        "SELECT activity_id, activity_name, discipline, location_zone, percent_complete, status FROM schedule_activities WHERE project_id = ? AND status != 'Completed' LIMIT 8",
        (req.project_id,)
    ).fetchall()
    conn.close()

    proj_name = proj["name"] if proj else "Oil India Pipeline PS-122"
    lag_summary = ", ".join([f"{a['activity_id']} ({a['activity_name']} in {a['location_zone']})" for a in activities]) or "Mainline Pipeline Stringing and Hydrotesting"

    prompt_text = f"""You are a Lead Project Controls & Pipeline Construction Engineer for Oil India Limited.
Project: {proj_name}
Lagging Critical Path Activities: {lag_summary}
Generate 3 actionable, heavy-engineering schedule recovery strategies to crash or fast-track the pipeline construction schedule.
Output strictly valid JSON with key 'strategies' containing an array of 3 objects with:
- id: string (e.g. 'crash-critical-path', 'fast-track-welding', 'night-shift-surge')
- title: string (short engineering title)
- action: string (specific operational method e.g. mobilizing automatic welding bug crews, parallel trenching)
- impact: string (e.g. 'Recovers 14 Days')
- impactDays: number (e.g. 14)
- costImpact: string (e.g. '+₹5.2 Lakhs')
- targetSpiBoost: number (e.g. 0.25)
- status: string ('Recommended' or 'Viable')
"""

    strategies = None
    if HAS_OPENAI:
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            try:
                client = OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1")
                resp = client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[
                        {"role": "system", "content": "You are a master construction scheduler. Return only valid JSON."},
                        {"role": "user", "content": prompt_text}
                    ],
                    temperature=0.2,
                    max_tokens=500
                )
                raw_text = resp.choices[0].message.content.strip()
                if "```json" in raw_text:
                    raw_text = raw_text.split("```json")[1].split("```")[0].strip()
                elif "```" in raw_text:
                    raw_text = raw_text.split("```")[1].split("```")[0].strip()
                parsed = json.loads(raw_text)
                if isinstance(parsed, dict) and "strategies" in parsed:
                    strategies = parsed["strategies"]
                elif isinstance(parsed, list):
                    strategies = parsed
            except Exception as e:
                print(f"[RECOVERY PLAN AI ERROR] {e}")

    if not strategies or len(strategies) < 2:
        strategies = [
            {
                "id": "crash-critical-path",
                "title": "Crash Critical Path: Dual Automatic Welding Crews",
                "action": "Mobilize 2 dual automatic welding bug crews in Sector 4 to double daily joint completion and recover 14 days on mainline pipeline.",
                "impact": "Recovers 14 Days",
                "impactDays": 14,
                "costImpact": "+₹5.2 Lakhs",
                "targetSpiBoost": 0.32,
                "status": "Recommended"
            },
            {
                "id": "fast-track-trenching",
                "title": "Fast-Track Pipe Trenching & Stringing Concurrently",
                "action": "Fast-track Pipe Trenching and Stringing concurrently across Zone 3 by deploying supplementary dewatering pumps and secondary CAT excavators.",
                "impact": "Recovers 9 Days",
                "impactDays": 9,
                "costImpact": "+₹3.6 Lakhs",
                "targetSpiBoost": 0.20,
                "status": "Recommended"
            },
            {
                "id": "night-shift-foundation",
                "title": "24/7 Extended Night Shift for HDD River Crossing & Substation",
                "action": "Deploy high-mast mobile floodlights and alternating 12-hour operator shifts for continuous horizontal directional drilling (HDD).",
                "impact": "Recovers 6 Days",
                "impactDays": 6,
                "costImpact": "+₹2.4 Lakhs",
                "targetSpiBoost": 0.15,
                "status": "Viable"
            }
        ]

    return {
        "success": True,
        "project_id": req.project_id,
        "strategies": strategies
    }

# =============================================================
# Delay Reason & Root Cause Breakdown Analytics
# =============================================================
@app.get("/api/analytics/delay-breakdown")
def api_get_delay_breakdown(project_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    if project_id:
        check_project_authorization(conn, current_user["id"], project_id)
        where_clause = "WHERE (delay_detected = 1 OR delay_category IS NOT NULL) AND project_id = ?"
        params = [project_id]
    else:
        where_clause = "WHERE (delay_detected = 1 OR delay_category IS NOT NULL) AND project_id IN (SELECT project_id FROM project_assignments WHERE user_id = ?)"
        params = [current_user["id"]]

    query = f"SELECT delay_category, COUNT(*) as count FROM pending_updates {where_clause} GROUP BY delay_category"
    rows = conn.execute(query, params).fetchall()
    
    cat_counts = {r["delay_category"]: r["count"] for r in rows if r["delay_category"]}
    total_db_delays = sum(cat_counts.values())

    STANDARD_CATEGORIES = [
        {"name": "Weather / Monsoon / Waterlogging", "color": "#38bdf8", "defaultPct": 38, "defaultCount": 15},
        {"name": "Equipment Breakdown / Rig Failure", "color": "#f43f5e", "defaultPct": 25, "defaultCount": 10},
        {"name": "Right of Way (ROW) / Land Clearance Issues", "color": "#eab308", "defaultPct": 17, "defaultCount": 7},
        {"name": "Material / Pipe Supply Shortage", "color": "#a855f7", "defaultPct": 10, "defaultCount": 4},
        {"name": "Manpower / Labor Shortage or Dispute", "color": "#f97316", "defaultPct": 6, "defaultCount": 2},
        {"name": "Engineering / Drawing Clarification Pending", "color": "#10b981", "defaultPct": 4, "defaultCount": 2}
    ]

    breakdown = []
    if total_db_delays >= 3:
        for cat in STANDARD_CATEGORIES:
            cnt = cat_counts.get(cat["name"], 0)
            pct = round((cnt / total_db_delays) * 100, 1) if total_db_delays else 0
            breakdown.append({
                "category": cat["name"],
                "count": cnt,
                "percentage": pct,
                "color": cat["color"]
            })
        total_delays = total_db_delays
    else:
        total_delays = sum(c["defaultCount"] for c in STANDARD_CATEGORIES)
        for cat in STANDARD_CATEGORIES:
            breakdown.append({
                "category": cat["name"],
                "count": cat["defaultCount"],
                "percentage": cat["defaultPct"],
                "color": cat["color"]
            })

    conn.close()
    return {
        "success": True,
        "project_id": project_id or "all",
        "total_delays": total_delays,
        "categories": breakdown
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
