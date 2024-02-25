-- Create recently_played_tracks table
CREATE TABLE IF NOT EXISTS recently_played_tracks (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    track_name VARCHAR(255) NOT NULL,
    artists VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
