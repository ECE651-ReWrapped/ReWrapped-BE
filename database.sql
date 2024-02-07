CREATE DATABASE ReWrapped;

CREATE TABLE users(
    userID SERIAL PRIMARY KEY,-- serial increments numbers
    username VARCHAR(255)
);