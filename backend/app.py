from flask import Flask, jsonify, request, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from pathlib import Path
import sqlite3
import re
import uuid
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "users.db"
UPLOAD_DIR = BASE_DIR / "uploads"

app = Flask(__name__)
app.config["SECRET_KEY"] = "bath-hack-dev-secret-change-later"
app.config["SUPPORTS_CORS"] = True
app.config["SUPPORTS_CREDENTIALS"] = True
# Allow large uploads (e.g. video files). Set to 300MB.
app.config["MAX_CONTENT_LENGTH"] = 300 * 1024 * 1024



CORS(app, supports_credentials=True)

UPLOAD_DIR.mkdir(exist_ok=True)
(UPLOAD_DIR / "audio").mkdir(exist_ok=True)
(UPLOAD_DIR / "video").mkdir(exist_ok=True)


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    # Prefer executing SQL from schema.sql so schema can be managed separately.
    schema_path = BASE_DIR / "schema.sql"

    schema = schema_path.read_text(encoding="utf-8")

    # Ensure statements end with semicolons for executescript.
    try:
        schema = re.sub(r"\)\s*(\n|$)", ");\n", schema)
    except Exception:
        # if something goes wrong with normalization, fall back to raw schema
        pass

    conn.executescript(schema)
    conn.commit()

    # Ensure users table contains the expected columns when schema evolves.
    expected_columns = {
        "recording_time_seconds": "INTEGER DEFAULT 60",
        "prep_time_seconds": "INTEGER DEFAULT 15",
        "bio": "TEXT",
        "camera_enabled": "BOOLEAN DEFAULT TRUE",
        "gaze_enabled": "BOOLEAN DEFAULT TRUE",
        "disfluency_enabled": "BOOLEAN DEFAULT TRUE",
        "report_metrics_enabled": "BOOLEAN DEFAULT TRUE",
    }

    existing_columns = {row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()}

    for col, col_def in expected_columns.items():
        if col not in existing_columns:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col} {col_def}")
            conn.commit()

    conn.close()


def validate_username(username):
    if len(username) < 3:
        return "Username must be at least 3 characters long."

    if len(username) > 30:
        return "Username must be 30 characters or fewer."

    if not re.fullmatch(r"[A-Za-z0-9_]+", username):
        return "Username can only contain letters, numbers, and underscores."

    return None


def validate_password(password):
    if len(password) < 6:
        return "Password must be at least 6 characters long."

    return None


def count_words(text):
    return len(re.findall(r"\b[\w']+\b", text))


def count_filler_words(text):
    lowered = text.lower()
    total = 0

    multi_word_fillers = [
        "you know",
        "sort of",
        "kind of",
    ]

    single_word_fillers = [
        "um",
        "uh",
        "like",
        "basically",
        "actually",
        "literally",
    ]

    for phrase in multi_word_fillers:
        total += len(re.findall(rf"\b{re.escape(phrase)}\b", lowered))

    for word in single_word_fillers:
        total += len(re.findall(rf"\b{re.escape(word)}\b", lowered))

    return total


def estimate_long_pauses(text):
    return text.count("...") + text.count("—") + text.count("--")


def calculate_wpm(transcript, duration_seconds):
    words = count_words(transcript)

    if duration_seconds <= 0:
        return 0

    minutes = duration_seconds / 60
    return round(words / minutes)


def calculate_eye_contact_score(eye_contact_ratio):
    if eye_contact_ratio is None:
        return 80

    try:
        ratio = float(eye_contact_ratio)
    except (TypeError, ValueError):
        return 80

    ratio = max(0.0, min(1.0, ratio))
    return round(ratio * 100)


def calculate_overall_score(wpm, filler_words, long_pauses, eye_contact_score):
    score = 100

    if wpm < 100:
        score -= 10
    elif wpm > 170:
        score -= 8

    score -= min(filler_words * 2, 20)
    score -= min(long_pauses * 3, 15)

    if eye_contact_score < 75:
        score -= 10
    elif eye_contact_score < 80:
        score -= 5

    return max(score, 0)


def build_flags(wpm, filler_words, long_pauses, eye_contact_score):
    flags = []

    if wpm < 100:
        flags.append("Speaking too slowly")
    elif wpm > 170:
        flags.append("Speaking too quickly")

    if filler_words >= 5:
        flags.append("High filler-word usage")

    if long_pauses >= 3:
        flags.append("Frequent long pauses")

    if eye_contact_score < 75:
        flags.append("Low eye-contact score")

    if not flags:
        flags.append("No major issues detected")

    return flags


init_db()


@app.get("/api/hello")
def hello():
    return jsonify(
        {
            "message": "Backend is running",
            "features": [
                "register",
                "login",
                "logout",
                "me",
                "upload-video",
                "analyse",
            ],
        }
    )


@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}

    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))

    username_error = validate_username(username)
    if username_error:
        return jsonify({"error": username_error}), 400

    password_error = validate_password(password)
    if password_error:
        return jsonify({"error": password_error}), 400

    password_hash = generate_password_hash(password)

    conn = get_db_connection()

    try:
        cursor = conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, password_hash),
        )
        conn.commit()
        user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "Username already exists."}), 409

    conn.close()

    session.clear()
    session["user_id"] = user_id
    session["username"] = username

    return jsonify(
        {
            "message": "Account created successfully.",
            "user": {
                "id": user_id,
                "username": username,
            },
        }
    )


@app.route("/api/login", methods=["GET", "POST"])
def login():
    
    data = request.get_json(silent=True) or {}

    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    conn = get_db_connection()
    user = conn.execute(
        "SELECT id, username, password_hash FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    conn.close()

    if user is None:
        return jsonify({"error": "Invalid username or password."}), 401

    if not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid username or password."}), 401
    
    session["user_id"] = user["id"]
    session["username"] = user["username"]

    return jsonify(
        {
            "message": "Login successful.",
            "user": {
                "id": user["id"],
                "username": user["username"],
            },
        }
    )


@app.get("/api/me")
def me():
    user_id = session.get("user_id")
    username = session.get("username")

    if not user_id or not username:
        return jsonify(
            {
                "loggedIn": False,
                "user": None,
            }
        )

    return jsonify(
        {
            "loggedIn": True,
            "user": {
                "id": user_id,
                "username": username,
            },
        }
    )


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully."})


@app.post("/api/upload-video")
def upload_video():
    if "video" not in request.files:
        return jsonify({"error": "No video file provided. Use field name 'video'."}), 400

    video_file = request.files["video"]

    if video_file.filename == "":
        return jsonify({"error": "No video file selected."}), 400
    safe_name = secure_filename(video_file.filename)
    ext = Path(safe_name).suffix or ".webm"
    uniquefilename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{session.get('user_id','anon')}_{uuid.uuid4().hex}{ext}"
    save_path = UPLOAD_DIR / "video" / uniquefilename

    video_file.save(save_path)

    return jsonify(
        {
            "message": "Video uploaded successfully.",
            "filename": uniquefilename,
        }
    )


@app.post("/api/upload")
def upload():
    # Generic upload endpoint used by the frontend. Expects form field 'file'.
    if 'file' not in request.files:
        return jsonify({"error": "No file provided. Use field name 'file'."}), 400

    f = request.files['file']
    if f.filename == "":
        return jsonify({"error": "No file selected."}), 400

    safe_name = secure_filename(f.filename)
    ext = Path(safe_name).suffix or ''

    # Determine target subfolder by mimetype or extension
    content_type = (f.mimetype or '').lower()
    if content_type.startswith('audio') or ext in ['.mp3', '.wav', '.m4a', '.aac', '.ogg']:
        sub = 'audio'
    else:
        sub = 'video'

    uniquefilename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{session.get('user_id','anon')}_{uuid.uuid4().hex}{ext}"
    save_path = UPLOAD_DIR / sub / uniquefilename

    f.save(save_path)

    return jsonify({"message": "File uploaded successfully.", "filename": uniquefilename})


@app.post("/api/analyse")
def analyse():
    data = request.get_json(silent=True) or {}

    prompt = str(data.get("prompt", ""))
    transcript = str(data.get("transcript", ""))
    duration_seconds = data.get("durationSeconds", 60)
    eye_contact_ratio = data.get("eyeContactRatio")

    try:
        duration_seconds = float(duration_seconds)
    except (TypeError, ValueError):
        duration_seconds = 60

    wpm = calculate_wpm(transcript, duration_seconds)
    filler_words = count_filler_words(transcript)
    long_pauses = estimate_long_pauses(transcript)
    eye_contact_score = calculate_eye_contact_score(eye_contact_ratio)
    overall_score = calculate_overall_score(
        wpm,
        filler_words,
        long_pauses,
        eye_contact_score,
    )
    flags = build_flags(wpm, filler_words, long_pauses, eye_contact_score)

    return jsonify(
        {
            "summary": "Mock analysis complete.",
            "prompt": prompt,
            "transcript": transcript,
            "metrics": {
                "wordsPerMinute": wpm,
                "fillerWords": filler_words,
                "longPauses": long_pauses,
                "eyeContactScore": eye_contact_score,
                "overallScore": overall_score,
            },
            "flags": flags,
            "loggedIn": bool(session.get("user_id")),
            "username": session.get("username"),
        }
    )

@app.post("/api/listreports")
def list_reports():
    user_id = session["user_id"]

    if not user_id:
        return jsonify({"error": "You must be logged in to view reports."}), 401

    conn = get_db_connection()
    reports = conn.execute(
        "SELECT id, processed, created_at FROM reports WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,),
    ).fetchall()
    conn.close()

    return jsonify(
        {
            "reports": [
                {
                    "id": r["id"],
                    "processed": bool(r["processed"]),
                    "created_at": r["created_at"],
                }
                for r in reports
            ]
        }
    )

@app.post("/api/uploadpresentation")
def upload_presentation():
    user_id = session["user_id"]

    if not user_id:
        return jsonify({"error": "You must be logged in to upload presentations."}), 401

    data = request.get_json(silent=True) or {}
    prompt = str(data.get("prompt", ""))
    filepath = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{str(user_id)}"

    if ("video" in request.files ):     
        video_file = request.files["video"]
        video_file.save(UPLOAD_DIR / "video" / f"{filepath}.webm")
    else:
        audio_file = request.files["audio"]
        audio_file.save(UPLOAD_DIR / "audio" / f"{filepath}.webm")
    

    # insert a new reports row referencing the uploaded file
    conn = get_db_connection()
    cursor = conn.execute(
        "INSERT INTO reports (user_id, filepath, used_prompt, presentation_length_seconds, prep_length_seconds) VALUES (?, ?, ?, ?, ?)",
        (
            user_id,
            filepath,
            prompt,
            data.get("presentation_length_seconds", 0),
            data.get("prep_length_seconds", 0),
        ),
    )
    conn.commit()
    report_id = cursor.lastrowid
    conn.close()

    return jsonify({"message": "Presentation registered.", "report_id": report_id, "filename": filepath})

@app.post("/api/savesettings")
def save_settings():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "You must be logged in to save settings."}), 401

    data = request.get_json(silent=True) or {}
    recording_time_seconds = data.get("recording_time_seconds")
    prep_time_seconds = data.get("prep_time_seconds")
    bio = str(data.get("bio", "")).strip()
    camera_enabled = data.get("camera_enabled")
    gaze_enabled = data.get("gaze_enabled")
    disfluency_enabled = data.get("disfluency_enabled")
    report_metrics_enabled = data.get("report_metrics_enabled")

    conn = get_db_connection()
    try:
        conn.execute(
            "UPDATE users SET recording_time_seconds = ?, prep_time_seconds = ?, bio = ?, camera_enabled = ?, gaze_enabled = ?, disfluency_enabled = ?, report_metrics_enabled = ? WHERE id = ?",
            (
                recording_time_seconds,
                prep_time_seconds,
                bio,
                bool(camera_enabled),
                bool(gaze_enabled),
                bool(disfluency_enabled),
                bool(report_metrics_enabled),
                user_id,
            ),
        )
        conn.commit()

        return jsonify({"message": "Settings saved successfully."})
    except sqlite3.Error as e:
        conn.rollback()
        return jsonify({"error": "Failed to save settings.", "details": str(e)}), 500
    finally:
        conn.close()

@app.post("/api/getsettings")
def get_settings():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "You must be logged in to get settings."}), 401

    conn = get_db_connection()
    user = conn.execute(
        "SELECT recording_time_seconds, prep_time_seconds, bio, camera_enabled, gaze_enabled, disfluency_enabled, report_metrics_enabled FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "User not found."}), 404

    return jsonify(
        {
            "recording_time_seconds": user["recording_time_seconds"],
            "prep_time_seconds": user["prep_time_seconds"],
            "bio": user["bio"],
            "camera_enabled": bool(user["camera_enabled"]),
            "gaze_enabled": bool(user["gaze_enabled"]),
            "disfluency_enabled": bool(user["disfluency_enabled"]),
            "report_metrics_enabled": bool(user["report_metrics_enabled"]),
        }
    )

@app.post("/api/getleaderboard")
def get_leaderboard():
    conn = get_db_connection()
    leaderboard = conn.execute(
        "SELECT r.score as score, u.username as username FROM reports r JOIN users u ON r.user_id = u.id ORDER BY r.score DESC LIMIT 10"
    ).fetchall()
    conn.close()

    return jsonify(
        {
            "leaderboard": [
                {
                    "username": row["username"],
                    "score": row["score"],
                }
                for row in leaderboard
            ]
        }
    )

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
