
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('coordinator', 'candidate')),
    must_change_password BOOLEAN DEFAULT FALSE,
    temporary_password_expires_at TIMESTAMPTZ,
    session_version INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE candidates (
    id SERIAL PRIMARY KEY,
    account_id INTEGER UNIQUE NOT NULL
        REFERENCES accounts(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    cohort VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    track VARCHAR(100) NOT NULL,
    planned_hours NUMERIC(6,2) NOT NULL
        CHECK (planned_hours > 0),
    created_by INTEGER REFERENCES accounts(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL
        REFERENCES candidates(id) ON DELETE CASCADE,
    activity_id INTEGER NOT NULL
        REFERENCES activities(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_started'
        CHECK (status IN ('not_started', 'in_progress', 'completed')),
    progress INTEGER DEFAULT 0
        CHECK (progress BETWEEN 0 AND 100),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(candidate_id, activity_id)
);

CREATE INDEX idx_assignments_candidate
ON assignments(candidate_id);

CREATE INDEX idx_assignments_activity
ON assignments(activity_id);
