import os
import sqlite3
import math
import uuid
import re
from datetime import datetime, timedelta
from urllib.parse import urlencode
from urllib.request import urlopen
import json
from flask import Flask, render_template, request, redirect, url_for, session, flash, g, jsonify
from markupsafe import Markup, escape
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from functools import wraps

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

def load_env_sources():
    if not load_dotenv:
        return

    app_dir = os.path.dirname(__file__)
    workspace_dir = os.path.dirname(app_dir)

    def maybe_load(path_value):
        if not path_value:
            return
        normalized = os.path.normpath(path_value)
        if os.path.isfile(normalized):
            load_dotenv(normalized, override=False)

    maybe_load(os.path.join(app_dir, ".env"))
    maybe_load(os.path.join(app_dir, ".flaskenv"))

    settings_paths = [
        os.path.join(app_dir, ".vscode", "settings.json"),
        os.path.join(workspace_dir, ".vscode", "settings.json"),
    ]

    appdata = os.getenv("APPDATA", "").strip()
    if appdata:
        settings_paths.extend([
            os.path.join(appdata, "Code", "User", "settings.json"),
            os.path.join(appdata, "Code - Insiders", "User", "settings.json"),
        ])

    for settings_path in settings_paths:
        try:
            if not os.path.isfile(settings_path):
                continue

            with open(settings_path, "r", encoding="utf-8") as settings_file:
                settings_data = json.load(settings_file)

            env_file = (settings_data.get("python.envFile") or "").strip()
            if not env_file:
                continue

            resolved = env_file.replace("${workspaceFolder}", workspace_dir)
            if not os.path.isabs(resolved):
                resolved = os.path.join(workspace_dir, resolved)

            maybe_load(resolved)
        except Exception:
            continue


load_env_sources()


def get_env_var(name, default=""):
    value = os.getenv(name, "").strip()
    if value:
        return value

    if os.name == "nt":
        try:
            import winreg

            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment") as user_key:
                user_value, _ = winreg.QueryValueEx(user_key, name)
                if user_value and str(user_value).strip():
                    return str(user_value).strip()
        except Exception:
            pass

    return default

app = Flask(__name__)
app.secret_key = get_env_var("SECRET_KEY", "dev-secret-change-this")

DATABASE = os.path.join(os.path.dirname(__file__), "rideshare.db")
GOOGLE_MAPS_API_KEY = get_env_var("GOOGLE_MAPS_API_KEY", "")
SCHOOL_NAME = get_env_var("SCHOOL_NAME", "My School")
SCHOOL_ADDRESS = get_env_var("SCHOOL_ADDRESS", "960 W Hedding St, San Jose, CA 95126")

BASE_SCHOOL_OPTIONS = [
    "Bellarmine College Preparatory",
    "Archbishop Mitty High School",
    "Saint Francis High School",
    "Presentation High School",
    "Notre Dame High School (San Jose)",
    "Pioneer High School",
    "Willow Glen High School",
    "Abraham Lincoln High School",
    "Bret Harte Middle School",
    "Willow Glen Middle School",
    "Castillero Middle School",
    "Monroe Middle School",
    "Other",
]

_school_cache = {"timestamp": None, "items": []}
_school_destination_cache = {}
_school_coords_cache = {"coords": None}
_address_geocode_cache = {}


def get_school_coordinates():
    cached = _school_coords_cache.get("coords")
    if cached:
        return cached

    _, school_lat, school_lng = geocode_address(SCHOOL_ADDRESS)
    if school_lat is None or school_lng is None:
        return None, None

    _school_coords_cache["coords"] = (school_lat, school_lng)
    return school_lat, school_lng


def resolve_address_with_coords(address):
    text = (address or "").strip()
    if not text:
        return "", None, None

    key = text.lower()
    cached = _address_geocode_cache.get(key)
    if cached:
        return cached

    formatted, lat, lng = geocode_address(text)
    if formatted and lat is not None and lng is not None:
        value = (formatted, lat, lng)
        _address_geocode_cache[key] = value
        return value

    value = (text, None, None)
    _address_geocode_cache[key] = value
    return value

BAY_AREA_CHAT_AREAS = [
    "95126 | San Jose Unified / Bellarmine Area",
    "95129 | Campbell Union / Mitty Area",
    "95014 | Fremont Union (Cupertino)",
    "94087 | Fremont Union (Sunnyvale)",
    "95032 | Los Gatos-Saratoga Union",
    "95051 | Santa Clara Unified",
    "94588 | Pleasanton Unified",
    "94538 | Fremont Unified",
    "Other District Area Code",
]
DEFAULT_CHAT_AREA = BAY_AREA_CHAT_AREAS[0]

BAY_AREA_WATCH_SECTIONS = [
    ("politics", "Politics"),
    ("school_events", "School Events"),
    ("community_issues", "Community Issues"),
    ("public_safety", "Public Safety"),
    ("transportation", "Transportation"),
    ("housing", "Housing"),
    ("jobs_economy", "Jobs and Economy"),
    ("environment", "Environment"),
    ("other", "Other"),
]
BAY_AREA_WATCH_SECTION_LABELS = {key: label for key, label in BAY_AREA_WATCH_SECTIONS}

ALLOWED_CHAT_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
ALLOWED_DRIVER_ID_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "pdf"}
ALLOWED_WATCH_UPLOAD_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "pdf", "doc", "docx", "txt"}
WATCH_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
WATCH_MENTION_REGEX = re.compile(r"(?<![\w.])@([A-Za-z][A-Za-z0-9_.-]{1,30})")


def is_allowed_chat_image(filename):
    if not filename or "." not in filename:
        return False
    extension = filename.rsplit(".", 1)[1].lower()
    return extension in ALLOWED_CHAT_IMAGE_EXTENSIONS


def save_uploaded_chat_image(file_storage):
    if not file_storage or not file_storage.filename:
        return None
    if not is_allowed_chat_image(file_storage.filename):
        return None

    safe_name = secure_filename(file_storage.filename)
    extension = safe_name.rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{extension}"

    upload_dir = os.path.join(os.path.dirname(__file__), "static", "uploads", "chat")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_name)
    file_storage.save(file_path)

    return f"uploads/chat/{unique_name}"


def save_uploaded_driver_id(file_storage):
    if not file_storage or not file_storage.filename:
        return None

    safe_name = secure_filename(file_storage.filename)
    if "." not in safe_name:
        return None

    extension = safe_name.rsplit(".", 1)[1].lower()
    if extension not in ALLOWED_DRIVER_ID_EXTENSIONS:
        return None

    unique_name = f"{uuid.uuid4().hex}.{extension}"
    upload_dir = os.path.join(os.path.dirname(__file__), "static", "uploads", "driver_ids")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_name)
    file_storage.save(file_path)
    return f"uploads/driver_ids/{unique_name}"


def save_uploaded_watch_file(file_storage):
    if not file_storage or not file_storage.filename:
        return None

    safe_name = secure_filename(file_storage.filename)
    if "." not in safe_name:
        return None

    extension = safe_name.rsplit(".", 1)[1].lower()
    if extension not in ALLOWED_WATCH_UPLOAD_EXTENSIONS:
        return None

    unique_name = f"{uuid.uuid4().hex}.{extension}"
    upload_dir = os.path.join(os.path.dirname(__file__), "static", "uploads", "bay_watch")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_name)
    file_storage.save(file_path)
    return f"uploads/bay_watch/{unique_name}"


# --- Database ---

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            school TEXT NOT NULL,
            grade TEXT,
            phone TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS rides (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            driver_id INTEGER NOT NULL,
            origin TEXT NOT NULL,
            origin_lat REAL,
            origin_lng REAL,
            destination TEXT NOT NULL,
            destination_lat REAL,
            destination_lng REAL,
            depart_time TEXT NOT NULL,
            seats_available INTEGER NOT NULL DEFAULT 3,
            seats_taken INTEGER NOT NULL DEFAULT 0,
            notes TEXT,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (driver_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ride_id INTEGER NOT NULL,
            rider_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (ride_id) REFERENCES rides(id),
            FOREIGN KEY (rider_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS ride_parent_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ride_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL,
            message_text TEXT NOT NULL,
            image_path TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (ride_id) REFERENCES rides(id),
            FOREIGN KEY (sender_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS saved_locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            label TEXT NOT NULL,
            address TEXT NOT NULL,
            lat REAL,
            lng REAL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS community_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            area TEXT NOT NULL,
            message_text TEXT NOT NULL,
            image_path TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS driver_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            car_model TEXT NOT NULL,
            license_plate TEXT NOT NULL,
            driver_id_image_path TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (datetime('now')),
            reviewed_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS bay_area_watch_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            section TEXT NOT NULL,
            title TEXT NOT NULL,
            post_text TEXT NOT NULL,
            attachment_path TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS bay_area_watch_replies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            reply_text TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (post_id) REFERENCES bay_area_watch_posts(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)

    try:
        db.execute("ALTER TABLE ride_parent_messages ADD COLUMN image_path TEXT")
    except sqlite3.OperationalError:
        pass

    try:
        db.execute("ALTER TABLE community_messages ADD COLUMN image_path TEXT")
    except sqlite3.OperationalError:
        pass

    try:
        db.execute("ALTER TABLE bay_area_watch_posts ADD COLUMN attachment_path TEXT")
    except sqlite3.OperationalError:
        pass

    db.commit()
    db.close()


def get_nearby_schools():
    now = datetime.utcnow()
    cached_at = _school_cache.get("timestamp")
    if cached_at and (now - cached_at).total_seconds() < 12 * 3600 and _school_cache.get("items"):
        return _school_cache["items"]

    if not GOOGLE_MAPS_API_KEY:
        return BASE_SCHOOL_OPTIONS

    school_lat, school_lng = get_school_coordinates()
    if school_lat is None or school_lng is None:
        return BASE_SCHOOL_OPTIONS

    params = {
        "location": f"{school_lat},{school_lng}",
        "radius": 20000,
        "type": "school",
        "key": GOOGLE_MAPS_API_KEY,
    }
    url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?{urlencode(params)}"

    try:
        with urlopen(url, timeout=4) as response:
            payload = json.loads(response.read().decode("utf-8"))

        places = payload.get("results", [])
        names = []
        for place in places:
            name = str(place.get("name", "")).strip()
            if name and name not in names:
                names.append(name)
            if len(names) >= 18:
                break

        combined = []
        for school in names + BASE_SCHOOL_OPTIONS:
            if school not in combined:
                combined.append(school)

        if "Other" not in combined:
            combined.append("Other")

        _school_cache["timestamp"] = now
        _school_cache["items"] = combined
        return combined
    except Exception:
        return BASE_SCHOOL_OPTIONS


def normalize_school_destination(address):
    text = (address or "").strip()
    if not text:
        return "", None, None

    lowered = text.lower()
    school_tokens = [
        SCHOOL_NAME.lower() if SCHOOL_NAME else "",
        "bellarmine",
        "college preparatory",
        "my school",
    ]

    if any(token and token in lowered for token in school_tokens):
        canonical_school = (SCHOOL_ADDRESS or text).strip()
        cache_key = canonical_school.lower()
        cached_coords = _school_destination_cache.get(cache_key)
        if cached_coords:
            return canonical_school, cached_coords[0], cached_coords[1]

        school_lat, school_lng = get_school_coordinates()
        if school_lat is None or school_lng is None:
            _, school_lat, school_lng = geocode_address(canonical_school)
        if school_lat is not None and school_lng is not None:
            _school_destination_cache[cache_key] = (school_lat, school_lng)
        return canonical_school, school_lat, school_lng

    return text, None, None


def geocode_address(address):
    text = (address or "").strip()
    if not text or not GOOGLE_MAPS_API_KEY:
        return None, None, None

    params = {
        "address": text,
        "key": GOOGLE_MAPS_API_KEY,
    }
    url = f"https://maps.googleapis.com/maps/api/geocode/json?{urlencode(params)}"

    try:
        with urlopen(url, timeout=4) as response:
            payload = json.loads(response.read().decode("utf-8"))

        results = payload.get("results", [])
        if not results:
            return None, None, None

        first = results[0]
        loc = (first.get("geometry") or {}).get("location") or {}
        lat = loc.get("lat")
        lng = loc.get("lng")
        formatted = first.get("formatted_address") or text
        if lat is None or lng is None:
            return None, None, None
        return formatted, float(lat), float(lng)
    except Exception:
        return None, None, None


def get_user_saved_locations(user_id):
    db = get_db()
    rows = db.execute(
        """
        SELECT id, label, address, lat, lng
        FROM saved_locations
        WHERE user_id = ?
        ORDER BY created_at DESC
        """,
        (user_id,),
    ).fetchall()
    return rows


def maybe_save_location(user_id, label, address, lat=None, lng=None):
    if not label or not address:
        return
    clean_label = label.strip()[:60]
    clean_address = address.strip()[:220]
    if not clean_label or not clean_address:
        return

    db = get_db()
    existing = db.execute(
        "SELECT id FROM saved_locations WHERE user_id = ? AND lower(label) = lower(?)",
        (user_id, clean_label),
    ).fetchone()

    if existing:
        db.execute(
            "UPDATE saved_locations SET address = ?, lat = ?, lng = ? WHERE id = ?",
            (clean_address, lat, lng, existing["id"]),
        )
    else:
        db.execute(
            "INSERT INTO saved_locations (user_id, label, address, lat, lng) VALUES (?, ?, ?, ?, ?)",
            (user_id, clean_label, clean_address, lat, lng),
        )
    db.commit()


DEMO_USERS = [
    {"name": "Alex Rivera",   "email": "alex@demo.school", "password": "demo1234", "school": SCHOOL_NAME or "Demo High", "grade": "12", "phone": "(408) 555-0101"},
    {"name": "Jordan Kim",    "email": "jordan@demo.school","password": "demo1234", "school": SCHOOL_NAME or "Demo High", "grade": "11", "phone": "(408) 555-0202"},
    {"name": "Sam Torres",    "email": "sam@demo.school",   "password": "demo1234", "school": SCHOOL_NAME or "Demo High", "grade": "10", "phone": "(408) 555-0303"},
    {"name": "Demo Student",  "email": "demo@demo.school",  "password": "demo1234", "school": SCHOOL_NAME or "Demo High", "grade": "11", "phone": "(408) 555-0000"},
]

# San Jose / Bellarmine-area coordinates
DEMO_RIDES = [
    {
        "driver_email": "alex@demo.school",
        "origin": "Willow Glen, San Jose, CA",
        "origin_lat": 37.2890,
        "origin_lng": -121.8863,
        "destination": "960 W Hedding St, San Jose, CA 95126",
        "offset_hours": 8, "seats": 3,
        "notes": "Leaving near Lincoln Ave and Curtner. Pickup window 7:35-7:45.",
    },
    {
        "driver_email": "jordan@demo.school",
        "origin": "Almaden Valley, San Jose, CA",
        "origin_lat": 37.2258,
        "origin_lng": -121.8754,
        "destination": "960 W Hedding St, San Jose, CA 95126",
        "offset_hours": 7, "seats": 2,
        "notes": "Route up Almaden Expy. Can pick up near Oakridge around 7:20.",
    },
    {
        "driver_email": "sam@demo.school",
        "origin": "Los Gatos, CA",
        "origin_lat": 37.2358,
        "origin_lng": -121.9624, 
        "destination": "960 W Hedding St, San Jose, CA 95126",
        "offset_hours": 9, "seats": 4,
        "notes": "Taking Hwy 17 then I-280. Quiet ride, room for backpacks.",
    },
    {
        "driver_email": "demo@demo.school",
        "origin": "Rose Garden, San Jose",
        "origin_lat": 37.3327,
        "origin_lng": -121.9316,
        "destination": "960 W Hedding St, San Jose, CA 95126",
        "offset_hours": 7, "offset_minutes": 35, "seats": 3,
        "notes": "Demo ride so you can test incoming requests.",
        "seed_pending_request": True,
    },
    {
        "driver_email": "alex@demo.school",
        "origin": "Campbell, CA",
        "origin_lat": 37.2872,
        "origin_lng": -121.9500,
        "destination": "960 W Hedding St, San Jose, CA 95126",
        "offset_hours": 7, "offset_minutes": 40, "seats": 3,
        "notes": "Start near Downtown Campbell. Pickup by Campbell Ave at 7:30.",
    },
    {
        "driver_email": "jordan@demo.school",
        "origin": "Cupertino, CA",
        "origin_lat": 37.3229,
        "origin_lng": -122.0322,
        "destination": "Archbishop Mitty High School, 5000 Mitty Ave, San Jose, CA 95129",
        "offset_hours": 8, "offset_minutes": 10, "seats": 2,
        "notes": "De Anza Blvd route toward Mitty. Good for west-side pickups.",
    },
]


def init_demo_data():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    user_ids = {}
    for u in DEMO_USERS:
        existing = db.execute("SELECT id FROM users WHERE email = ?", (u["email"],)).fetchone()
        if existing:
            db.execute(
                "UPDATE users SET name = ?, school = ?, grade = ?, phone = ? WHERE id = ?",
                (u["name"], u["school"], u["grade"], u["phone"], existing["id"]),
            )
            user_ids[u["email"]] = existing["id"]
        else:
            hashed = generate_password_hash(u["password"])
            cur = db.execute(
                "INSERT INTO users (name, email, password, school, grade, phone) VALUES (?, ?, ?, ?, ?, ?)",
                (u["name"], u["email"], hashed, u["school"], u["grade"], u["phone"])
            )
            user_ids[u["email"]] = cur.lastrowid

    demo_driver_ids = sorted({user_ids[r["driver_email"]] for r in DEMO_RIDES if r["driver_email"] in user_ids})
    if demo_driver_ids:
        placeholders = ",".join("?" for _ in demo_driver_ids)
        db.execute(
            f"DELETE FROM bookings WHERE ride_id IN (SELECT id FROM rides WHERE driver_id IN ({placeholders}))",
            demo_driver_ids,
        )
        db.execute(
            f"DELETE FROM rides WHERE status = 'active' AND driver_id IN ({placeholders})",
            demo_driver_ids,
        )

    # Add deterministic demo rides
    tomorrow = datetime.now() + timedelta(days=1)
    demo_pending_ride_id = None
    for r in DEMO_RIDES:
        driver_id = user_ids.get(r["driver_email"])
        if not driver_id:
            continue

        origin = r["origin"]
        origin_lat = r.get("origin_lat")
        origin_lng = r.get("origin_lng")
        if origin_lat is None or origin_lng is None:
            geocoded_origin, geo_origin_lat, geo_origin_lng = resolve_address_with_coords(origin)
            if geocoded_origin and geo_origin_lat is not None and geo_origin_lng is not None:
                origin = geocoded_origin
                origin_lat = geo_origin_lat
                origin_lng = geo_origin_lng

        destination = r["destination"]
        destination_lat = r.get("destination_lat")
        destination_lng = r.get("destination_lng")

        if destination_lat is None or destination_lng is None:
            normalized_destination, normalized_lat, normalized_lng = normalize_school_destination(destination)
            destination = normalized_destination
            if normalized_lat is not None and normalized_lng is not None:
                destination_lat = normalized_lat
                destination_lng = normalized_lng
            else:
                geocoded_destination, geo_dest_lat, geo_dest_lng = geocode_address(destination)
                if geocoded_destination and geo_dest_lat is not None and geo_dest_lng is not None:
                    destination = geocoded_destination
                    destination_lat = geo_dest_lat
                    destination_lng = geo_dest_lng

        depart = tomorrow.replace(hour=r["offset_hours"], minute=0, second=0, microsecond=0)
        if "offset_minutes" in r:
            depart = depart.replace(minute=r["offset_minutes"])
        cur = db.execute("""
            INSERT INTO rides (driver_id, origin, origin_lat, origin_lng,
                               destination, destination_lat, destination_lng,
                               depart_time, seats_available, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (driver_id, origin, origin_lat, origin_lng,
              destination, destination_lat, destination_lng,
              depart.isoformat(), r["seats"], r["notes"]))
        if r.get("seed_pending_request"):
            demo_pending_ride_id = cur.lastrowid

    if demo_pending_ride_id:
        rider_id = user_ids.get("alex@demo.school")
        if rider_id:
            db.execute(
                "INSERT INTO bookings (ride_id, rider_id, status) VALUES (?, ?, 'pending')",
                (demo_pending_ride_id, rider_id),
            )

    demo_user_id_values = [uid for uid in user_ids.values() if uid is not None]
    if demo_user_id_values:
        placeholders = ",".join("?" for _ in demo_user_id_values)
        db.execute(
            f"DELETE FROM community_messages WHERE user_id IN ({placeholders})",
            demo_user_id_values,
        )

        demo_watch_post_rows = db.execute(
            f"SELECT id FROM bay_area_watch_posts WHERE user_id IN ({placeholders})",
            demo_user_id_values,
        ).fetchall()
        demo_watch_post_ids = [row["id"] for row in demo_watch_post_rows]
        if demo_watch_post_ids:
            post_placeholders = ",".join("?" for _ in demo_watch_post_ids)
            db.execute(
                f"DELETE FROM bay_area_watch_replies WHERE post_id IN ({post_placeholders})",
                demo_watch_post_ids,
            )

        db.execute(
            f"DELETE FROM bay_area_watch_posts WHERE user_id IN ({placeholders})",
            demo_user_id_values,
        )

    community_seed_messages = [
        ("alex@demo.school", "95126 | San Jose Unified / Bellarmine Area", "Morning carpool from Willow Glen to Bellarmine on weekdays. I can pick up near Curtner around 7:35 AM."),
        ("jordan@demo.school", "95126 | San Jose Unified / Bellarmine Area", "I can cover Tuesday and Thursday afternoon returns if anyone needs a ride after practice."),
        ("sam@demo.school", "95014 | Fremont Union (Cupertino)", "Anyone heading from Cupertino to Mitty tomorrow? I have two seats and leave at 7:10 AM."),
        ("demo@demo.school", "95014 | Fremont Union (Cupertino)", "I usually wait near De Anza and Stevens Creek. Happy to coordinate a shared pickup point."),
        ("alex@demo.school", "95032 | Los Gatos-Saratoga Union", "Traffic on Highway 17 has been heavy. Leaving 10 minutes earlier helped this week."),
    ]

    for email, area, message_text in community_seed_messages:
        author_id = user_ids.get(email) or user_ids.get("demo@demo.school")
        if author_id:
            db.execute(
                "INSERT INTO community_messages (user_id, area, message_text) VALUES (?, ?, ?)",
                (author_id, area, message_text),
            )

    watch_seed_posts = [
        ("alex@demo.school", "school_events", "Volunteer carpool plan for open house", "Let’s coordinate evening pickups for families attending open house next Wednesday. Share which neighborhoods you can cover."),
        ("jordan@demo.school", "community_issues", "Drop-off lane safety reminders", "Can we pin a quick checklist for safe drop-off? Keeping crosswalks clear would reduce a lot of morning confusion."),
        ("sam@demo.school", "politics", "Student transit feedback for city council", "The city is collecting transportation feedback this month. We should submit student commuting priorities as a group."),
        ("demo@demo.school", "transportation", "Caltrain + carpool transfer ideas", "If you connect from Caltrain, post your timing here so drivers can coordinate station pickups."),
    ]

    seeded_post_ids = []
    for email, section, title, post_text in watch_seed_posts:
        author_id = user_ids.get(email) or user_ids.get("demo@demo.school")
        if not author_id:
            continue
        cur = db.execute(
            "INSERT INTO bay_area_watch_posts (user_id, section, title, post_text) VALUES (?, ?, ?, ?)",
            (author_id, section, title, post_text),
        )
        seeded_post_ids.append(cur.lastrowid)

    watch_seed_replies = [
        (0, "jordan@demo.school", "I can help with the open house rides from the Cupertino side."),
        (0, "sam@demo.school", "Count me in for return trips after 8:30 PM."),
        (1, "alex@demo.school", "Good idea. We should also add a reminder about not blocking bike lanes."),
        (2, "demo@demo.school", "I can draft a short summary and share it before the deadline."),
    ]

    for post_index, email, reply_text in watch_seed_replies:
        if post_index >= len(seeded_post_ids):
            continue
        author_id = user_ids.get(email) or user_ids.get("demo@demo.school")
        if not author_id:
            continue
        db.execute(
            "INSERT INTO bay_area_watch_replies (post_id, user_id, reply_text) VALUES (?, ?, ?)",
            (seeded_post_ids[post_index], author_id, reply_text),
        )
    db.commit()
    db.close()
    return user_ids.get("demo@demo.school")


def estimate_drive_minutes(origin_lat, origin_lng, destination_lat, destination_lng):
    if None in (origin_lat, origin_lng, destination_lat, destination_lng):
        return None
    try:
        lat1 = math.radians(float(origin_lat))
        lng1 = math.radians(float(origin_lng))
        lat2 = math.radians(float(destination_lat))
        lng2 = math.radians(float(destination_lng))
    except (TypeError, ValueError):
        return None

    d_lat = lat2 - lat1
    d_lng = lng2 - lng1
    a = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    miles = 3958.8 * c
    avg_city_speed_mph = 28
    minutes = max(5, round((miles / avg_city_speed_mph) * 60))
    return minutes


def format_eta(minutes):
    if minutes is None:
        return "ETA unavailable"
    if minutes < 60:
        return f"~{minutes} min"
    hours = minutes // 60
    rem = minutes % 60
    if rem == 0:
        return f"~{hours} hr"
    return f"~{hours} hr {rem} min"


# --- Auth helpers ---

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated


def current_user():
    if "user_id" not in session:
        return None
    db = get_db()
    return db.execute("SELECT * FROM users WHERE id = ?", (session["user_id"],)).fetchone()


def is_demo_mode_session():
    return bool(session.get("is_demo_mode"))


def get_driver_application_status(user_id):
    db = get_db()
    latest = db.execute(
        """
        SELECT status
        FROM driver_applications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    if not latest:
        return "not_applied"
    return str(latest["status"] or "pending").strip().lower() or "pending"


def can_user_offer_rides(user_id):
    return get_driver_application_status(user_id) == "approved"


@app.context_processor
def inject_driver_permissions():
    can_offer_rides = False
    if "user_id" in session:
        try:
            can_offer_rides = can_user_offer_rides(session["user_id"])
        except Exception:
            can_offer_rides = False
    return {"can_offer_rides": can_offer_rides}


# --- Routes: Auth ---

@app.route("/")
def index():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        db = get_db()
        user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if user and check_password_hash(user["password"], password):
            session["user_id"] = user["id"]
            session["user_name"] = user["name"]
            session["is_demo_mode"] = False
            return redirect(url_for("dashboard"))
        flash("Invalid email or password.", "error")
    return render_template("login.html", school_name=SCHOOL_NAME, maps_key=GOOGLE_MAPS_API_KEY)


@app.route("/demo")
def demo_login():
    """One-click demo: seeds sample data and logs in as Demo Student."""
    demo_user_id = init_demo_data()
    if not demo_user_id:
        flash("Demo setup failed.", "error")
        return redirect(url_for("login"))
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id = ?", (demo_user_id,)).fetchone()
    session["user_id"] = user["id"]
    session["user_name"] = user["name"]
    session["is_demo_mode"] = True
    flash("You're viewing a demo. Sample rides have been loaded.", "info")
    return redirect(url_for("dashboard"))


@app.route("/register", methods=["GET", "POST"])
def register():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    school_options = get_nearby_schools()
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        school = request.form.get("school", "").strip()
        school_other = request.form.get("school_other", "").strip()
        grade = request.form.get("grade", "").strip()
        phone = request.form.get("phone", "").strip()

        if school.lower() == "other":
            school = school_other

        if not name or not email or not password or not school or not grade or not phone:
            flash("Please fill in all required fields.", "error")
            return render_template("register.html", school_name=SCHOOL_NAME,
                                   school_options=school_options,
                                   maps_key=GOOGLE_MAPS_API_KEY)

        db = get_db()
        existing = db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            flash("An account with that email already exists.", "error")
            return render_template("register.html", school_name=SCHOOL_NAME,
                                   school_options=school_options,
                                   maps_key=GOOGLE_MAPS_API_KEY)

        hashed = generate_password_hash(password)
        db.execute(
            "INSERT INTO users (name, email, password, school, grade, phone) VALUES (?, ?, ?, ?, ?, ?)",
            (name, email, hashed, school, grade, phone)
        )
        db.commit()
        flash("Account created! Please log in.", "success")
        return redirect(url_for("login"))
    return render_template("register.html", school_name=SCHOOL_NAME,
                           school_options=school_options,
                           maps_key=GOOGLE_MAPS_API_KEY)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/driver/apply", methods=["GET", "POST"])
@login_required
def driver_apply():
    user = current_user()
    db = get_db()

    latest_application = db.execute(
        """
        SELECT *
        FROM driver_applications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (user["id"],),
    ).fetchone()

    driver_status = latest_application["status"] if latest_application else "not_applied"

    if request.method == "POST":
        car_model = request.form.get("car_model", "").strip()
        license_plate = request.form.get("license_plate", "").strip().upper()
        id_file = request.files.get("driver_id_image")
        id_image_path = save_uploaded_driver_id(id_file)

        if not car_model or not license_plate or not id_image_path:
            flash("Car, license plate, and a valid ID image/file are required.", "error")
            return render_template(
                "driver_apply.html",
                user=user,
                school_name=SCHOOL_NAME,
                driver_status=driver_status,
            )

        db.execute(
            """
            INSERT INTO driver_applications (user_id, car_model, license_plate, driver_id_image_path, status)
            VALUES (?, ?, ?, ?, 'pending')
            """,
            (user["id"], car_model, license_plate, id_image_path),
        )
        db.commit()

        flash("Driver application submitted. Approval is required before becoming an active driver.", "info")
        return redirect(url_for("driver_apply"))

    return render_template(
        "driver_apply.html",
        user=user,
        school_name=SCHOOL_NAME,
        driver_status=driver_status,
    )


# --- Routes: Dashboard ---

@app.route("/dashboard")
@login_required
def dashboard():
    db = get_db()
    user = current_user()
    school_lat, school_lng = get_school_coordinates()

    # Recent available rides (not the user's own, active, future)
    rides = db.execute("""
         SELECT r.*, u.name as driver_name, u.school as driver_school,
               u.grade as driver_grade
        FROM rides r
        JOIN users u ON r.driver_id = u.id
        WHERE r.driver_id != ?
          AND r.status = 'active'
          AND r.seats_available > r.seats_taken
          AND r.depart_time >= datetime('now')
        ORDER BY r.depart_time ASC
        LIMIT 5
    """, (user["id"],)).fetchall()

    # All rides with coordinates for the map (all active, future)
    map_rides = db.execute("""
        SELECT r.id, r.origin, r.destination, r.origin_lat, r.origin_lng,
               r.destination_lat, r.destination_lng,
               r.depart_time, r.seats_available, r.seats_taken,
               u.name as driver_name, u.grade as driver_grade, u.school as driver_school
        FROM rides r
        JOIN users u ON r.driver_id = u.id
        WHERE r.status = 'active'
            AND r.origin IS NOT NULL
            AND trim(r.origin) != ''
    """, ()).fetchall()

    map_rides_json = []
    updated_any_ride_coords = False

    for r in map_rides:
        origin = r["origin"]
        origin_lat = r["origin_lat"]
        origin_lng = r["origin_lng"]
        destination = r["destination"]
        destination_lat = r["destination_lat"]
        destination_lng = r["destination_lng"]

        if (origin_lat is None or origin_lng is None) and origin:
            geocoded_origin, geo_origin_lat, geo_origin_lng = resolve_address_with_coords(origin)
            if geocoded_origin and geo_origin_lat is not None and geo_origin_lng is not None:
                origin = geocoded_origin
                origin_lat = geo_origin_lat
                origin_lng = geo_origin_lng
                db.execute(
                    "UPDATE rides SET origin = ?, origin_lat = ?, origin_lng = ? WHERE id = ?",
                    (origin, origin_lat, origin_lng, r["id"]),
                )
                updated_any_ride_coords = True

        if (destination_lat is None or destination_lng is None) and destination:
            geocoded_destination, geo_dest_lat, geo_dest_lng = resolve_address_with_coords(destination)
            if geocoded_destination and geo_dest_lat is not None and geo_dest_lng is not None:
                destination = geocoded_destination
                destination_lat = geo_dest_lat
                destination_lng = geo_dest_lng
                db.execute(
                    "UPDATE rides SET destination = ?, destination_lat = ?, destination_lng = ? WHERE id = ?",
                    (destination, destination_lat, destination_lng, r["id"]),
                )
                updated_any_ride_coords = True

        map_rides_json.append(
            {
                "id": r["id"],
                "origin": origin,
                "destination": destination,
                "lat": origin_lat,
                "lng": origin_lng,
                "dest_lat": destination_lat,
                "dest_lng": destination_lng,
                "driver": r["driver_name"],
                "grade": r["driver_grade"] or "",
                "school": r["driver_school"] or "",
                "seats_left": r["seats_available"] - r["seats_taken"],
                "depart": r["depart_time"],
                "is_own": r["driver_name"] == user["name"],
            }
        )

    if updated_any_ride_coords:
        db.commit()

    sample_start_points = []
    seen_sample_points = set()
    for sample in DEMO_RIDES:
        sample_origin = (sample.get("origin") or "").strip()
        if not sample_origin:
            continue

        sample_lat = sample.get("origin_lat")
        sample_lng = sample.get("origin_lng")
        normalized_origin = sample_origin

        if sample_lat is None or sample_lng is None:
            geocoded_origin, geo_lat, geo_lng = resolve_address_with_coords(sample_origin)
            if not geocoded_origin or geo_lat is None or geo_lng is None:
                continue
            normalized_origin = geocoded_origin
            sample_lat = geo_lat
            sample_lng = geo_lng

        key = (round(float(sample_lat), 6), round(float(sample_lng), 6))
        if key in seen_sample_points:
            continue
        seen_sample_points.add(key)
        sample_start_points.append({
            "origin": normalized_origin,
            "lat": float(sample_lat),
            "lng": float(sample_lng),
        })

    # User's own rides
    my_rides = db.execute("""
        SELECT r.*, COUNT(b.id) as booking_count
        FROM rides r
        LEFT JOIN bookings b ON b.ride_id = r.id AND b.status = 'approved'
        WHERE r.driver_id = ? AND r.status = 'active'
        GROUP BY r.id
        ORDER BY r.depart_time ASC
    """, (user["id"],)).fetchall()

    # Rides user has booked
    booked = db.execute("""
        SELECT r.*, u.name as driver_name, u.phone as driver_phone, b.status as booking_status
        FROM bookings b
        JOIN rides r ON b.ride_id = r.id
        JOIN users u ON r.driver_id = u.id
        WHERE b.rider_id = ? AND r.status = 'active'
        ORDER BY r.depart_time ASC
    """, (user["id"],)).fetchall()

    incoming_requests = db.execute("""
        SELECT b.id as booking_id,
               b.status as booking_status,
               b.created_at as requested_at,
               r.id as ride_id,
               r.origin,
               r.destination,
               r.depart_time,
               u.name as rider_name,
               u.grade as rider_grade
        FROM bookings b
        JOIN rides r ON r.id = b.ride_id
        JOIN users u ON u.id = b.rider_id
        WHERE r.driver_id = ?
          AND r.status = 'active'
          AND b.status = 'pending'
        ORDER BY r.depart_time ASC, b.created_at ASC
    """, (user["id"],)).fetchall()

    rides_with_eta = []
    for ride in rides:
        eta_minutes = estimate_drive_minutes(
            ride["origin_lat"], ride["origin_lng"], ride["destination_lat"], ride["destination_lng"]
        )
        rides_with_eta.append({"ride": ride, "eta": format_eta(eta_minutes)})

    my_rides_with_eta = []
    for ride in my_rides:
        eta_minutes = estimate_drive_minutes(
            ride["origin_lat"], ride["origin_lng"], ride["destination_lat"], ride["destination_lng"]
        )
        my_rides_with_eta.append({"ride": ride, "eta": format_eta(eta_minutes)})

    booked_with_eta = []
    for ride in booked:
        eta_minutes = estimate_drive_minutes(
            ride["origin_lat"], ride["origin_lng"], ride["destination_lat"], ride["destination_lng"]
        )
        booked_with_eta.append({"ride": ride, "eta": format_eta(eta_minutes)})

    schedule_items = []
    for item in my_rides_with_eta:
        ride = item["ride"]
        schedule_items.append({
            "type": "driver",
            "title": "You are driving",
            "origin": ride["origin"],
            "destination": ride["destination"],
            "depart_time": ride["depart_time"],
            "status": "active",
            "eta": item["eta"],
            "ride_id": ride["id"],
        })

    for item in booked_with_eta:
        ride = item["ride"]
        schedule_items.append({
            "type": "rider",
            "title": f"Ride with {ride['driver_name']}",
            "origin": ride["origin"],
            "destination": ride["destination"],
            "depart_time": ride["depart_time"],
            "status": ride["booking_status"],
            "eta": item["eta"],
            "ride_id": ride["id"],
        })

    schedule_items.sort(key=lambda row: row["depart_time"])
    schedule_items = schedule_items[:5]

    schedule_events = []
    for item in my_rides_with_eta:
        ride = item["ride"]
        schedule_events.append({
            "ride_id": ride["id"],
            "title": "Driving",
            "origin": ride["origin"],
            "destination": ride["destination"],
            "depart_time": ride["depart_time"],
            "status": "active",
            "eta": item["eta"],
        })

    for item in booked_with_eta:
        ride = item["ride"]
        schedule_events.append({
            "ride_id": ride["id"],
            "title": f"Ride with {ride['driver_name']}",
            "origin": ride["origin"],
            "destination": ride["destination"],
            "depart_time": ride["depart_time"],
            "status": ride["booking_status"],
            "eta": item["eta"],
        })

    schedule_events.sort(key=lambda row: row["depart_time"])

    return render_template("dashboard.html",
                           user=user,
                           rides=rides_with_eta,
                           my_rides=my_rides_with_eta,
                           booked=booked_with_eta,
                           incoming_requests=incoming_requests,
                           schedule_items=schedule_items,
                           schedule_events=schedule_events,
                           map_rides=map_rides_json,
                           sample_start_points=sample_start_points,
                           school_name=SCHOOL_NAME,
                           maps_key=GOOGLE_MAPS_API_KEY,
                           school_address=SCHOOL_ADDRESS,
                           school_lat=school_lat,
                           school_lng=school_lng)


@app.route("/community-chat", methods=["GET", "POST"])
@login_required
def community_chat():
    user = current_user()
    db = get_db()

    selected_area = request.values.get("area", DEFAULT_CHAT_AREA).strip()
    if selected_area not in BAY_AREA_CHAT_AREAS:
        selected_area = "Other District Area Code"

    if request.method == "POST":
        message_text = request.form.get("message_text", "").strip()
        image_file = request.files.get("message_image")
        image_path = save_uploaded_chat_image(image_file)

        if not message_text and not image_path:
            flash("Add a message or attach an image.", "error")
        elif len(message_text) > 500:
            flash("Please keep chat messages under 500 characters.", "error")
        elif image_file and image_file.filename and not image_path:
            flash("Unsupported image type. Use png, jpg, jpeg, gif, or webp.", "error")
        else:
            db.execute(
                "INSERT INTO community_messages (user_id, area, message_text, image_path) VALUES (?, ?, ?, ?)",
                (user["id"], selected_area, message_text, image_path),
            )
            db.commit()
            return redirect(url_for("community_chat", area=selected_area))

    messages = db.execute(
        """
        SELECT * FROM (
            SELECT m.*, u.name as sender_name, u.grade as sender_grade
            FROM community_messages m
            JOIN users u ON u.id = m.user_id
            WHERE m.area = ?
            ORDER BY m.id DESC
            LIMIT 60
        ) recent
        ORDER BY recent.id ASC
        """,
        (selected_area,),
    ).fetchall()

    return render_template(
        "community_chat.html",
        user=user,
        area_options=BAY_AREA_CHAT_AREAS,
        selected_area=selected_area,
        messages=messages,
        school_name=SCHOOL_NAME,
    )


@app.route("/bay-area-watch", methods=["GET", "POST"])
@login_required
def bay_area_watch():
    user = current_user()
    db = get_db()

    selected_section = request.values.get("section", BAY_AREA_WATCH_SECTIONS[0][0]).strip().lower()
    if selected_section not in BAY_AREA_WATCH_SECTION_LABELS:
        selected_section = BAY_AREA_WATCH_SECTIONS[0][0]
    focus_post_id = request.values.get("focus_post", "").strip()

    if request.method == "POST":
        form_type = request.form.get("form_type", "post").strip().lower()

        if form_type == "reply":
            reply_section = request.form.get("section", selected_section).strip().lower()
            if reply_section not in BAY_AREA_WATCH_SECTION_LABELS:
                reply_section = selected_section

            post_id_raw = request.form.get("post_id", "").strip()
            reply_text = request.form.get("reply_text", "").strip()

            post = None
            try:
                post_id = int(post_id_raw)
                post = db.execute(
                    "SELECT id, section FROM bay_area_watch_posts WHERE id = ?",
                    (post_id,),
                ).fetchone()
            except Exception:
                post = None

            if not post:
                flash("Post not found for reply.", "error")
                return redirect(url_for("bay_area_watch", section=reply_section))

            if not reply_text:
                flash("Reply text is required.", "error")
            elif len(reply_text) > 1200:
                flash("Please keep replies under 1200 characters.", "error")
            else:
                db.execute(
                    "INSERT INTO bay_area_watch_replies (post_id, user_id, reply_text) VALUES (?, ?, ?)",
                    (post["id"], user["id"], reply_text),
                )
                db.commit()
                return redirect(url_for("bay_area_watch", section=post["section"], focus_post=post["id"]))
        else:
            section = request.form.get("section", "").strip().lower()
            title = request.form.get("title", "").strip()
            post_text = request.form.get("post_text", "").strip()
            attachment = request.files.get("attachment")
            attachment_path = save_uploaded_watch_file(attachment)

            if section not in BAY_AREA_WATCH_SECTION_LABELS:
                flash("Please choose a valid Bay Area Watch section.", "error")
            elif not title or not post_text:
                flash("Title and post content are required.", "error")
            elif len(title) > 120:
                flash("Please keep the title under 120 characters.", "error")
            elif len(post_text) > 2000:
                flash("Please keep posts under 2000 characters.", "error")
            elif attachment and attachment.filename and not attachment_path:
                flash("Unsupported attachment type. Use png, jpg, jpeg, gif, webp, pdf, doc, docx, or txt.", "error")
            else:
                db.execute(
                    "INSERT INTO bay_area_watch_posts (user_id, section, title, post_text, attachment_path) VALUES (?, ?, ?, ?, ?)",
                    (user["id"], section, title, post_text, attachment_path),
                )
                db.commit()
                return redirect(url_for("bay_area_watch", section=section))

    mention_candidates = db.execute(
        "SELECT name FROM users WHERE name IS NOT NULL AND trim(name) != '' ORDER BY name ASC LIMIT 100"
    ).fetchall()

    posts = db.execute(
        """
        SELECT p.*, u.name AS author_name, u.grade AS author_grade
        FROM bay_area_watch_posts p
        JOIN users u ON u.id = p.user_id
        ORDER BY p.id DESC
        LIMIT 180
        """
    ).fetchall()

    posts_by_section = {key: [] for key, _ in BAY_AREA_WATCH_SECTIONS}
    visible_post_ids = []
    for row in posts:
        section = str(row["section"] or "").strip().lower()
        if section in posts_by_section and len(posts_by_section[section]) < 40:
            posts_by_section[section].append(row)
            if section == selected_section:
                visible_post_ids.append(row["id"])

    replies_by_post = {}
    if visible_post_ids:
        placeholders = ",".join("?" for _ in visible_post_ids)
        reply_rows = db.execute(
            f"""
            SELECT r.*, u.name AS author_name, u.grade AS author_grade
            FROM bay_area_watch_replies r
            JOIN users u ON u.id = r.user_id
            WHERE r.post_id IN ({placeholders})
            ORDER BY r.id ASC
            """,
            visible_post_ids,
        ).fetchall()
        for reply in reply_rows:
            replies_by_post.setdefault(reply["post_id"], []).append(reply)

    return render_template(
        "bay_area_watch.html",
        user=user,
        section_options=BAY_AREA_WATCH_SECTIONS,
        section_labels=BAY_AREA_WATCH_SECTION_LABELS,
        selected_section=selected_section,
        focus_post_id=focus_post_id,
        posts_by_section=posts_by_section,
        replies_by_post=replies_by_post,
        mention_candidates=[row["name"] for row in mention_candidates],
        watch_image_extensions=WATCH_IMAGE_EXTENSIONS,
        school_name=SCHOOL_NAME,
    )


# --- Routes: Rides ---

@app.route("/rides/create", methods=["GET", "POST"])
@login_required
def create_ride():
    user = current_user()
    school_options = get_nearby_schools()
    driver_status = get_driver_application_status(user["id"])

    if driver_status != "approved":
        if driver_status == "pending":
            flash("Your driver application is still pending approval. You cannot offer rides yet.", "error")
        elif driver_status == "denied":
            flash("Your driver application was denied. Submit a new application to offer rides.", "error")
        else:
            flash("You must complete and get approved in Become a Driver before offering rides.", "error")
        return redirect(url_for("driver_apply"))

    if request.method == "POST":
        origin = request.form.get("origin", "").strip()
        origin_lat = request.form.get("origin_lat", "")
        origin_lng = request.form.get("origin_lng", "")
        destination = request.form.get("destination", "").strip()
        destination_lat = request.form.get("destination_lat", "")
        destination_lng = request.form.get("destination_lng", "")
        depart_time = request.form.get("depart_time", "")
        seats = request.form.get("seats", "3")
        notes = request.form.get("notes", "").strip()

        if not origin or not destination or not depart_time:
            flash("Please fill in origin, destination, and departure time.", "error")
            return render_template("create_ride.html", user=user, school_name=SCHOOL_NAME,
                                   maps_key=GOOGLE_MAPS_API_KEY, school_address=SCHOOL_ADDRESS,
                                   school_options=school_options)

        normalized_destination, forced_dest_lat, forced_dest_lng = normalize_school_destination(destination)
        destination = normalized_destination
        if forced_dest_lat is not None and forced_dest_lng is not None:
            destination_lat = forced_dest_lat
            destination_lng = forced_dest_lng

        if not origin_lat or not origin_lng:
            geocoded_origin, geo_origin_lat, geo_origin_lng = geocode_address(origin)
            if geocoded_origin and geo_origin_lat is not None and geo_origin_lng is not None:
                origin = geocoded_origin
                origin_lat = geo_origin_lat
                origin_lng = geo_origin_lng

        if not destination_lat or not destination_lng:
            geocoded_destination, geo_dest_lat, geo_dest_lng = geocode_address(destination)
            if geocoded_destination and geo_dest_lat is not None and geo_dest_lng is not None:
                destination = geocoded_destination
                destination_lat = geo_dest_lat
                destination_lng = geo_dest_lng

        db = get_db()
        db.execute("""
            INSERT INTO rides (driver_id, origin, origin_lat, origin_lng,
                               destination, destination_lat, destination_lng,
                               depart_time, seats_available, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user["id"], origin, origin_lat or None, origin_lng or None,
              destination, destination_lat or None, destination_lng or None,
              depart_time, int(seats), notes))
        db.commit()
        flash("Ride posted successfully!", "success")
        return redirect(url_for("dashboard"))

    return render_template("create_ride.html", user=user, school_name=SCHOOL_NAME,
                           maps_key=GOOGLE_MAPS_API_KEY, school_address=SCHOOL_ADDRESS,
                           school_options=school_options)


@app.route("/rides/find")
@login_required
def find_rides():
    user = current_user()
    db = get_db()
    search = request.args.get("q", "").strip()
    destination_choice = request.args.get("destination_choice", "").strip()
    destination_custom = request.args.get("destination_custom", "").strip()
    school_options = get_nearby_schools()
    saved_locations = get_user_saved_locations(user["id"])

    destination_filter = ""
    if destination_choice.startswith("saved:"):
        try:
            saved_id = int(destination_choice.split(":", 1)[1])
            selected_saved = db.execute(
                "SELECT address FROM saved_locations WHERE id = ? AND user_id = ?",
                (saved_id, user["id"]),
            ).fetchone()
            if selected_saved:
                destination_filter = selected_saved["address"]
        except Exception:
            destination_filter = ""
    elif destination_choice and destination_choice not in ("custom", "other"):
        destination_filter = destination_choice
    elif destination_custom:
        destination_filter = destination_custom

    query = """
        SELECT r.*, u.name as driver_name, u.school as driver_school, u.grade as driver_grade
        FROM rides r
        JOIN users u ON r.driver_id = u.id
        WHERE r.driver_id != ?
          AND r.status = 'active'
          AND r.seats_available > r.seats_taken
          AND r.depart_time >= datetime('now')
    """
    params = [user["id"]]

    if search:
        query += " AND (r.origin LIKE ? OR r.destination LIKE ?)"
        params += [f"%{search}%", f"%{search}%"]

    if destination_filter:
        query += " AND r.destination LIKE ?"
        params.append(f"%{destination_filter}%")

    query += " ORDER BY r.depart_time ASC"
    rides = db.execute(query, params).fetchall()

    return render_template("find_rides.html", user=user, rides=rides, search=search,
                           school_name=SCHOOL_NAME, maps_key=GOOGLE_MAPS_API_KEY,
                           school_address=SCHOOL_ADDRESS,
                           school_options=school_options,
                           saved_locations=saved_locations,
                           destination_choice=destination_choice,
                           destination_custom=destination_custom)


@app.route("/rides/<int:ride_id>")
@login_required
def ride_detail(ride_id):
    user = current_user()
    db = get_db()
    school_lat, school_lng = get_school_coordinates()
    ride = db.execute("""
        SELECT r.*, u.name as driver_name, u.school as driver_school,
               u.grade as driver_grade, u.phone as driver_phone
        FROM rides r
        JOIN users u ON r.driver_id = u.id
        WHERE r.id = ?
    """, (ride_id,)).fetchone()

    if not ride:
        flash("Ride not found.", "error")
        return redirect(url_for("find_rides"))

    existing_booking = db.execute(
        "SELECT * FROM bookings WHERE ride_id = ? AND rider_id = ?",
        (ride_id, user["id"])
    ).fetchone()

    bookings = db.execute("""
        SELECT b.*, u.name as rider_name, u.grade as rider_grade
        FROM bookings b
        JOIN users u ON b.rider_id = u.id
        WHERE b.ride_id = ?
        ORDER BY b.created_at ASC
    """, (ride_id,)).fetchall()

    can_parent_chat = (
        ride["driver_id"] == user["id"]
        or existing_booking is not None
        or (ride["status"] == "active" and ride["seats_available"] > ride["seats_taken"])
    )

    parent_messages = db.execute("""
        SELECT m.*, u.name as sender_name
        FROM ride_parent_messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.ride_id = ?
        ORDER BY m.created_at ASC
    """, (ride_id,)).fetchall()

    return render_template("ride_detail.html", user=user, ride=ride,
                           existing_booking=existing_booking, bookings=bookings,
                           can_parent_chat=can_parent_chat,
                           parent_messages=parent_messages,
                           school_name=SCHOOL_NAME, maps_key=GOOGLE_MAPS_API_KEY,
                           school_address=SCHOOL_ADDRESS,
                           school_lat=school_lat, school_lng=school_lng)


@app.route("/rides/<int:ride_id>/messages", methods=["POST"])
@login_required
def post_parent_message(ride_id):
    user = current_user()
    db = get_db()
    ride = db.execute("SELECT * FROM rides WHERE id = ?", (ride_id,)).fetchone()

    if not ride:
        flash("Ride not found.", "error")
        return redirect(url_for("find_rides"))

    existing_booking = db.execute(
        "SELECT id FROM bookings WHERE ride_id = ? AND rider_id = ?",
        (ride_id, user["id"])
    ).fetchone()

    can_parent_chat = (
        ride["driver_id"] == user["id"]
        or existing_booking is not None
        or (ride["status"] == "active" and ride["seats_available"] > ride["seats_taken"])
    )

    if not can_parent_chat:
        flash("You can only message for active rides.", "error")
        return redirect(url_for("ride_detail", ride_id=ride_id))

    message_text = request.form.get("message_text", "").strip()
    if not message_text:
        flash("Message cannot be empty.", "error")
        return redirect(url_for("ride_detail", ride_id=ride_id, _anchor="parent-chat"))

    if len(message_text) > 500:
        flash("Please keep messages under 500 characters.", "error")
        return redirect(url_for("ride_detail", ride_id=ride_id, _anchor="parent-chat"))

    db.execute(
        "INSERT INTO ride_parent_messages (ride_id, sender_id, message_text) VALUES (?, ?, ?)",
        (ride_id, user["id"], message_text)
    )
    db.commit()
    return redirect(url_for("ride_detail", ride_id=ride_id, _anchor="parent-chat"))


@app.route("/rides/<int:ride_id>/book", methods=["POST"])
@login_required
def book_ride(ride_id):
    user = current_user()
    db = get_db()
    ride = db.execute("SELECT * FROM rides WHERE id = ?", (ride_id,)).fetchone()

    if not ride or ride["driver_id"] == user["id"]:
        flash("Cannot book this ride.", "error")
        return redirect(url_for("find_rides"))

    existing = db.execute(
        "SELECT * FROM bookings WHERE ride_id = ? AND rider_id = ?",
        (ride_id, user["id"])
    ).fetchone()

    if existing:
        flash("You already requested this ride.", "error")
        return redirect(url_for("ride_detail", ride_id=ride_id))

    db.execute(
        "INSERT INTO bookings (ride_id, rider_id, status) VALUES (?, ?, 'pending')",
        (ride_id, user["id"])
    )
    db.commit()
    flash("Ride request sent! The driver will confirm.", "success")
    return redirect(url_for("dashboard"))


@app.route("/bookings/<int:booking_id>/approve", methods=["POST"])
@login_required
def approve_booking(booking_id):
    user = current_user()
    db = get_db()
    booking = db.execute("""
        SELECT b.*, r.driver_id, r.seats_available, r.seats_taken
        FROM bookings b JOIN rides r ON b.ride_id = r.id
        WHERE b.id = ?
    """, (booking_id,)).fetchone()

    if not booking or booking["driver_id"] != user["id"]:
        flash("Not authorized.", "error")
        return redirect(url_for("dashboard"))

    if booking["seats_taken"] >= booking["seats_available"]:
        flash("No seats available.", "error")
        return redirect(url_for("dashboard"))

    db.execute("UPDATE bookings SET status = 'approved' WHERE id = ?", (booking_id,))
    db.execute("UPDATE rides SET seats_taken = seats_taken + 1 WHERE id = ?", (booking["ride_id"],))
    db.commit()
    flash("Booking approved!", "success")
    return redirect(url_for("dashboard"))


@app.route("/bookings/<int:booking_id>/deny", methods=["POST"])
@login_required
def deny_booking(booking_id):
    user = current_user()
    db = get_db()
    booking = db.execute("""
        SELECT b.*, r.driver_id FROM bookings b JOIN rides r ON b.ride_id = r.id
        WHERE b.id = ?
    """, (booking_id,)).fetchone()

    if not booking or booking["driver_id"] != user["id"]:
        flash("Not authorized.", "error")
        return redirect(url_for("dashboard"))

    db.execute("UPDATE bookings SET status = 'denied' WHERE id = ?", (booking_id,))
    db.commit()
    flash("Booking denied.", "success")
    return redirect(url_for("dashboard"))


@app.route("/rides/<int:ride_id>/cancel", methods=["POST"])
@login_required
def cancel_ride(ride_id):
    user = current_user()
    db = get_db()
    ride = db.execute("SELECT * FROM rides WHERE id = ?", (ride_id,)).fetchone()

    if not ride or ride["driver_id"] != user["id"]:
        flash("Not authorized.", "error")
        return redirect(url_for("dashboard"))

    db.execute("UPDATE rides SET status = 'cancelled' WHERE id = ?", (ride_id,))
    db.commit()
    flash("Ride cancelled.", "success")
    return redirect(url_for("dashboard"))


@app.template_filter("fmt_dt")
def fmt_dt(value):
    try:
        dt = datetime.fromisoformat(value)
        # Cross-platform: remove leading zeros manually
        return dt.strftime("%a, %b %d at %I:%M %p").replace(" 0", " ")
    except Exception:
        return value


@app.template_filter("render_mentions")
def render_mentions(value):
    text = "" if value is None else str(value)
    escaped_text = str(escape(text)).replace("\r\n", "\n").replace("\r", "\n")
    escaped_text = escaped_text.replace("\n", "<br>")
    rendered = WATCH_MENTION_REGEX.sub(r'<span class="watch-mention">@\1</span>', escaped_text)
    return Markup(rendered)


if __name__ == "__main__":
    init_db()
    app.run(debug=False)
