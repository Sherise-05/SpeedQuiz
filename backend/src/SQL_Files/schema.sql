-- SQLITE
CREATE TABLE IF NOT EXISTS questions (
    question_id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer1 TEXT NOT NULL,
    answer2 TEXT NOT NULL,
    answer3 TEXT, /* All questions have at least 2 answers, with the other 2 being null as needed */
    answer4 TEXT,
    correct_answer INTEGER NOT NULL /* limited between 1-4 inclusive of both ends */
);
