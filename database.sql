-- CREATE DATABASE ReWrapped;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- drop table if exists users;

CREATE TABLE users(
  user_id uuid DEFAULT uuid_generate_v4(),
  user_name VARCHAR(255) NOT NULL UNIQUE,
  user_email VARCHAR(255) NOT NULL UNIQUE,
  user_password VARCHAR(255) NOT NULL,
  PRIMARY KEY(user_id)
);

-- dev accounts
INSERT INTO users (user_name, user_email, user_password) VALUES ('prerona', 'p2ghosh@uwaterloo.ca', 'Waterloo');


-- test users (https://temp-mail.org/en/ if needed)
INSERT INTO users (user_name, user_email, user_password) VALUES ('test', 'test@gmail.com', 'test123');
INSERT INTO users (user_name, user_email, user_password) VALUES ('testfollower', 'testfollower@gmail.com', 'test123');
INSERT INTO users (user_name, user_email, user_password) VALUES ('testfriend', 'testfriend@gmail.com', 'test123');

-- Add user_reset_token and user_reset_token_exp columns
ALTER TABLE users
ADD user_reset_token VARCHAR(255) UNIQUE;