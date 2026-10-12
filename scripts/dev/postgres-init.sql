-- Runs once on first container start. Creates the test database and enables pgvector in both.
CREATE DATABASE acamedia_test;
\connect acamedia
CREATE EXTENSION IF NOT EXISTS vector;
\connect acamedia_test
CREATE EXTENSION IF NOT EXISTS vector;
