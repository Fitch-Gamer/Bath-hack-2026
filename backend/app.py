from flask import Flask, jsonify, request, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from pathlib import Path
import sqlite3
import re
import uuid

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "users.db"
UPLOAD_DIR = BASE_DIR / "uploads"

app = Flask(__name__)
app.config["SECRET_KEY"] = "bath-hack-dev-secret-change-later"

CORS(
    app,
    supports_credentials=True,
    origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
)

UPLOAD_DIR.mkdir(exist_ok=True)


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
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


@app.post("/api/login")
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

    session.clear()
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
    filename = f"{uuid.uuid4().hex}_{safe_name}"
    save_path = UPLOAD_DIR / filename

    video_file.save(save_path)

    return jsonify(
        {
            "message": "Video uploaded successfully.",
            "filename": filename,
        }
    )


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


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
