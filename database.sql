-- CREATE DATABASE ReWrapped;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS users CASCADE;

DROP TABLE IF EXISTS followers;

CREATE TABLE users(
  user_id uuid DEFAULT uuid_generate_v4(),
  user_name VARCHAR(255) NOT NULL UNIQUE,
  user_email VARCHAR(255) NOT NULL UNIQUE,
  user_password VARCHAR(255) NOT NULL,
  user_reset_token VARCHAR(255) UNIQUE,
  PRIMARY KEY(user_id)
);

CREATE TABLE followers(
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  since_date DATE,
  FOREIGN KEY (follower_id) REFERENCES users(user_id),
  FOREIGN KEY (following_id) REFERENCES users(user_id),
  PRIMARY KEY (follower_id, following_id)
);

-- Triggers
CREATE OR REPLACE FUNCTION no_self_follow() RETURNS TRIGGER AS $$ BEGIN IF NEW.follower_id = NEW.following_id THEN RAISE EXCEPTION 'User cannot follow itself.';

END IF;

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

CREATE TRIGGER noSelfFollow BEFORE
INSERT ON followers FOR EACH ROW EXECUTE FUNCTION no_self_follow();