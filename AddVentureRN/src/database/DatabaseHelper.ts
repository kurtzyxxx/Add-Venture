import * as SQLite from 'expo-sqlite';

export class DatabaseHelper {
  private static instance: DatabaseHelper;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  public static getInstance(): DatabaseHelper {
    if (!DatabaseHelper.instance) {
      DatabaseHelper.instance = new DatabaseHelper();
    }
    return DatabaseHelper.instance;
  }

  public async initDB(): Promise<void> {
    if (this.db) return; // already initialized
    
    // expo-sqlite API (SDK 50+)
    this.db = await SQLite.openDatabaseAsync('addventure.db');
    
    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      -- Drop tables to enforce new schema cleanly
      DROP TABLE IF EXISTS Error_Pattern;
      DROP TABLE IF EXISTS Mastery;
      DROP TABLE IF EXISTS Learner_Badge;
      DROP TABLE IF EXISTS Badge;
      DROP TABLE IF EXISTS Performance_Trend;
      DROP TABLE IF EXISTS Session;
      DROP TABLE IF EXISTS Guided_Hint;
      DROP TABLE IF EXISTS Activity_Attempt;
      DROP TABLE IF EXISTS Difficulty_Level;
      DROP TABLE IF EXISTS Learner_Progress;
      DROP TABLE IF EXISTS Activity_Level;
      DROP TABLE IF EXISTS Progression;
      DROP TABLE IF EXISTS Activity;
      DROP TABLE IF EXISTS Learner;

      CREATE TABLE Learner (
        learner_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        total_stars INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE Difficulty_Level (
        difficulty_id INTEGER PRIMARY KEY AUTOINCREMENT,
        difficulty_name TEXT NOT NULL,
        difficulty_rank INTEGER NOT NULL,
        visual_guidance_level INTEGER NOT NULL
      );

      CREATE TABLE Activity (
        activity_id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategy_id TEXT NOT NULL,
        activity_name TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        difficulty_id INTEGER DEFAULT 1,
        unlock_order INTEGER DEFAULT 1,
        is_locked BOOLEAN DEFAULT 1,
        FOREIGN KEY (difficulty_id) REFERENCES Difficulty_Level(difficulty_id)
      );

      CREATE TABLE Activity_Level (
        level_id INTEGER PRIMARY KEY AUTOINCREMENT,
        activity_type TEXT NOT NULL,
        level_number INTEGER NOT NULL,
        difficulty_level INTEGER NOT NULL,
        visual_guidance_level INTEGER NOT NULL
      );

      CREATE TABLE Learner_Progress (
        progress_id INTEGER PRIMARY KEY AUTOINCREMENT,
        learner_id INTEGER NOT NULL,
        level_id INTEGER NOT NULL,
        accuracy REAL DEFAULT 0.0,
        completion_status BOOLEAN DEFAULT 0,
        unlocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (learner_id) REFERENCES Learner(learner_id),
        FOREIGN KEY (level_id) REFERENCES Activity_Level(level_id)
      );

      CREATE TABLE Activity_Attempt (
        attempt_id INTEGER PRIMARY KEY AUTOINCREMENT,
        progress_id INTEGER NOT NULL,
        difficulty_id INTEGER,
        attempt_number INTEGER DEFAULT 1,
        response TEXT,
        is_correct BOOLEAN NOT NULL,
        response_time INTEGER,
        stars_earned INTEGER DEFAULT 0,
        completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        retry_of INTEGER,
        FOREIGN KEY (progress_id) REFERENCES Learner_Progress(progress_id),
        FOREIGN KEY (difficulty_id) REFERENCES Difficulty_Level(difficulty_id),
        FOREIGN KEY (retry_of) REFERENCES Activity_Attempt(attempt_id)
      );

      CREATE TABLE Guided_Hint (
        hint_id INTEGER PRIMARY KEY AUTOINCREMENT,
        attempt_id INTEGER NOT NULL,
        hint_message TEXT NOT NULL,
        hint_type TEXT,
        displayed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (attempt_id) REFERENCES Activity_Attempt(attempt_id)
      );

      CREATE TABLE Progression (
        progression_id INTEGER PRIMARY KEY AUTOINCREMENT,
        learner_id INTEGER NOT NULL,
        activity_id INTEGER NOT NULL,
        is_completed BOOLEAN DEFAULT 0,
        unlocked BOOLEAN DEFAULT 0,
        completion_date TEXT,
        accuracy_rate REAL DEFAULT 0.0,
        FOREIGN KEY (learner_id) REFERENCES Learner(learner_id),
        FOREIGN KEY (activity_id) REFERENCES Activity(activity_id)
      );

      CREATE TABLE Session (
        session_id INTEGER PRIMARY KEY AUTOINCREMENT,
        learner_id INTEGER NOT NULL,
        session_date TEXT DEFAULT CURRENT_TIMESTAMP,
        start_time TEXT,
        end_time TEXT,
        total_stars INTEGER DEFAULT 0,
        overall_progress REAL DEFAULT 0.0,
        summary_generated BOOLEAN DEFAULT 0,
        FOREIGN KEY (learner_id) REFERENCES Learner(learner_id)
      );

      CREATE TABLE Session_Summary (
        summary_id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        total_activities INTEGER DEFAULT 0,
        correct_activities INTEGER DEFAULT 0,
        accuracy_rate REAL DEFAULT 0.0,
        avg_response_time REAL DEFAULT 0.0,
        stars_earned INTEGER DEFAULT 0,
        areas_needing_practice TEXT,
        generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES Session(session_id)
      );

      CREATE TABLE Performance_Trend (
        trend_id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        strategy_id TEXT NOT NULL,
        accuracy_rate REAL NOT NULL,
        avg_response_time REAL NOT NULL,
        error_count INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES Session(session_id)
      );

      CREATE TABLE Badge (
        badge_id INTEGER PRIMARY KEY AUTOINCREMENT,
        badge_name TEXT NOT NULL,
        badge_description TEXT,
        required_stars INTEGER NOT NULL
      );

      CREATE TABLE Learner_Badge (
        learner_badge_id INTEGER PRIMARY KEY AUTOINCREMENT,
        learner_id INTEGER NOT NULL,
        badge_id INTEGER NOT NULL,
        earned_date TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (learner_id) REFERENCES Learner(learner_id),
        FOREIGN KEY (badge_id) REFERENCES Badge(badge_id)
      );

      CREATE TABLE Mastery (
        mastery_id INTEGER PRIMARY KEY AUTOINCREMENT,
        learner_id INTEGER NOT NULL,
        strategy_id TEXT NOT NULL,
        mastery_level INTEGER NOT NULL,
        visual_guidance_level INTEGER NOT NULL,
        achieved_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (learner_id) REFERENCES Learner(learner_id)
      );

      CREATE TABLE Error_Pattern (
        error_id INTEGER PRIMARY KEY AUTOINCREMENT,
        attempt_id INTEGER NOT NULL,
        strategy_id TEXT NOT NULL,
        error_type TEXT NOT NULL,
        frequency INTEGER DEFAULT 1,
        detected_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (attempt_id) REFERENCES Activity_Attempt(attempt_id)
      );

      CREATE TABLE Misconception (
        misconception_id INTEGER PRIMARY KEY AUTOINCREMENT,
        learner_id INTEGER NOT NULL,
        strategy_id TEXT NOT NULL,
        misconception_type TEXT NOT NULL,
        times_detected INTEGER DEFAULT 1,
        flagged_date TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (learner_id) REFERENCES Learner(learner_id)
      );
    `);
  }

  public getDB(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error("Database not initialized. Call initDB() first.");
    }
    return this.db;
  }
}
