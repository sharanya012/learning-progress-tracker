INSERT INTO candidates (
    account_id,
    full_name,
    cohort
)
VALUES
(1, 'Rahul Sharma', '2026-A'),
(2, 'Priya Patel', '2026-A'),
(3, 'Arjun Kumar', '2026-A'),
(4, 'Sneha Reddy', '2026-A')


INSERT INTO activities (
    title,
    description,
    track,
    planned_hours,
    created_by
)
VALUES
(
    'HTML & CSS Fundamentals',
    'Learn HTML structure, CSS styling, layouts and responsive design.',
    'Frontend Development',
    20.00,
    1
),
(
    'JavaScript Essentials',
    'Understand variables, functions, arrays, objects and DOM manipulation.',
    'Frontend Development',
    30.00,
    1
),
(
    'React Fundamentals',
    'Build interactive user interfaces using React components and hooks.',
    'Frontend Development',
    35.00,
    1
),
(
    'Node.js and Express',
    'Learn backend development, REST APIs and middleware.',
    'Backend Development',
    30.00,
    1
),
(
    'PostgreSQL Database',
    'Learn SQL queries, joins, relationships and database design.',
    'Backend Development',
    25.00,
    4
),
(
    'Git and GitHub',
    'Learn version control, branching, merging and collaboration.',
    'Tools',
    10.00,
    1
),
(
    'Data Structures and Algorithms',
    'Practice arrays, linked lists, stacks, queues and sorting algorithms.',
    'Computer Science',
    40.00,
    2
),
(
    'Full Stack Project',
    'Develop a complete full-stack application with authentication and database integration.',
    'Project',
    50.00,
    3
);


INSERT INTO assignments (
    candidate_id,
    activity_id,
    status,
    progress,
    updated_at
)
VALUES
-- Rahul (Candidate ID 1)
(1, 1, 'completed', 100, NOW()),
(1, 2, 'in_progress', 65, NOW()),
(1, 3, 'not_started', 0, NOW()),

-- Priya (Candidate ID 2)
(2, 1, 'completed', 100, NOW()),
(2, 2, 'completed', 100, NOW()),
(2, 3, 'in_progress', 45, NOW()),

-- Arjun (Candidate ID 3)
(3, 1, 'in_progress', 70, NOW()),
(3, 4, 'not_started', 0, NOW()),

-- Sneha (Candidate ID 4)
(4, 1, 'completed', 100, NOW()),
(4, 2, 'in_progress', 80, NOW()),
