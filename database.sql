-- CREATE DATABASE ReWrapped;
-- Create tables start
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS users CASCADE;

DROP TABLE IF EXISTS followers;

CREATE TABLE users(
  user_id uuid DEFAULT uuid_generate_v4(),
  user_name VARCHAR(255) NOT NULL UNIQUE,
  user_email VARCHAR(255) NOT NULL UNIQUE,
  user_password VARCHAR(255) NOT NULL,
  PRIMARY KEY(user_id)
);

CREATE TABLE IF NOT EXISTS recently_played_tracks (
    id SERIAL PRIMARY KEY,
    user_id uuid REFERENCES users(user_id),
    user_name VARCHAR(255) NOT NULL, -- Added user_name column
    track_name VARCHAR(255) NOT NULL,
    artists VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recommended_tracks (
    id SERIAL PRIMARY KEY,
    user_id uuid REFERENCES users(user_id),
    user_name VARCHAR(255) NOT NULL, -- Added user_name column
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