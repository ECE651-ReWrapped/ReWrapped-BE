-- CREATE DATABASE ReWrapped;
-- Create tables start
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS recently_played_tracks;
DROP TABLE IF EXISTS recommended_tracks;
DROP TABLE IF EXISTS followers;
DROP TABLE IF EXISTS listening_trends;
DROP TABLE IF EXISTS shared_playlists CASCADE;
DROP TABLE IF EXISTS shared_playlist_tracks;

CREATE TABLE users(
  user_id uuid DEFAULT uuid_generate_v4(),
  user_name VARCHAR(255) NOT NULL UNIQUE,
  user_email VARCHAR(255) NOT NULL UNIQUE,
  user_password VARCHAR(255) NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  PRIMARY KEY(user_id)
);

CREATE TABLE IF NOT EXISTS recently_played_tracks (
    id SERIAL PRIMARY KEY,
    user_id uuid REFERENCES users(user_id),
    user_name VARCHAR(255) NOT NULL,
    track_name VARCHAR(255) NOT NULL,
    artists VARCHAR(255) NOT NULL,
    genres VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recommended_tracks (
    id SERIAL PRIMARY KEY,
    user_id uuid REFERENCES users(user_id),
    user_name VARCHAR(255) NOT NULL,
    track_name VARCHAR(255) NOT NULL,
    artists VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE followers(
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  since_date DATE,
  FOREIGN KEY (follower_id) REFERENCES users(user_id),
  FOREIGN KEY (following_id) REFERENCES users(user_id),
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE listening_trends (
    user_name VARCHAR(255),
    date DATE,
    track_count INT,
    PRIMARY KEY (user_name, date)
);

-- Tables for collaborative playlists
CREATE TABLE IF NOT EXISTS shared_playlists (
    playlist_id SERIAL PRIMARY KEY,
    playlist_name VARCHAR(255) NOT NULL,
    createdbyemail VARCHAR(255) NOT NULL,
    sharedwithemail VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS shared_playlist_tracks (
    track_id SERIAL PRIMARY KEY,
    track_name VARCHAR(255) NOT NULL,
    artist_name VARCHAR(255) NOT NULL,
    playlist_id INTEGER NOT NULL,
    FOREIGN KEY (playlist_id) REFERENCES shared_playlists(playlist_id)
    ON DELETE CASCADE --ensures that tracks are deleted if the playlist is deleted
);

-- Create tables end

-- Add user_reset_token and user_reset_token_exp columns
ALTER TABLE users
ADD user_reset_token VARCHAR(255) UNIQUE;

-- Triggers start here
-- Prevent self-follow trigger start
CREATE OR REPLACE FUNCTION no_self_follow() RETURNS TRIGGER AS $$
  BEGIN IF NEW.follower_id = NEW.following_id
    THEN RAISE EXCEPTION 'User cannot follow itself.';
  END IF;
  
  RETURN NEW;
END;

$$ LANGUAGE plpgsql;

CREATE TRIGGER noSelfFollow BEFORE
INSERT ON followers FOR EACH ROW EXECUTE FUNCTION no_self_follow();
-- Prevent self-follow trigger end
