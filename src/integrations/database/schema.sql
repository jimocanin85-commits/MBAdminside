-- MBadmin Database Schema for Neon PostgreSQL

-- Trainers table
CREATE TABLE IF NOT EXISTS trainers (
  id SERIAL PRIMARY KEY,
  navn VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefon VARCHAR(50),
  foedselsdato DATE NOT NULL,
  aargang VARCHAR(50),
  rolle VARCHAR(100),
  kontaktperson VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  excel_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_trainers_navn ON trainers(navn);
CREATE INDEX IF NOT EXISTS idx_trainers_created_at ON trainers(created_at DESC);

-- Frivilligfest checklist table
CREATE TABLE IF NOT EXISTS frivilligfest_checklist (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_checklist_updated_at ON frivilligfest_checklist(updated_at DESC);

-- Users table (for future authentication/authorization)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Insert default users (if not exists)
INSERT INTO users (username, role) 
VALUES 
  ('admin', 'admin'),
  ('Karina', 'restricted'),
  ('Brian', 'limited')
ON CONFLICT (username) DO NOTHING;

-- User sessions table (for single-session login limits)
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  is_locked BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_username ON user_sessions(username);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity DESC);
