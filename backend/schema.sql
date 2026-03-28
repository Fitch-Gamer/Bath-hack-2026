CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,

    recording_time_seconds INTEGER DEFAULT 60,
    prep_time_seconds INTEGER DEFAULT 15,
    bio TEXT,
    camera_enabled BOOLEAN DEFAULT TRUE,
    gaze_enabled BOOLEAN DEFAULT TRUE,
    disfluency_enabled BOOLEAN DEFAULT TRUE,
    report_metrics_enabled BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filepath TEXT NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    presentation_length_seconds INTEGER,
    prep_length_seconds INTEGER,
    used_prompt TEXT,

    distraction_time_seconds TEXT,
    time_percentage_at_camera FLOAT,
    camera_look_string TEXT,
    disfluency_string TEXT,

    score FLOAT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)