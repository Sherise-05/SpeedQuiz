const DB_PATH = "./database.sqlite";
const SQL_FILES_ROOT = "./build/SQL_Files/";
import fs from 'fs';
import Database from 'better-sqlite3';
// See if the database already exists - needed for data initialization
const db_PreExisting = fs.existsSync(DB_PATH);
console.log(db_PreExisting ? "DB already exists" : "Creating DB file");
let db = undefined;
export function initializeDB() {
    db = new Database(DB_PATH);
    console.log("DB initialization");
    runFromSQLFile(db, "schema.sql");
    if (!db_PreExisting) {
        console.log("Writing initialization data to DB");
        runFromSQLFile(db, "data_initialize.sql");
    }
}
// Singleton design pattern
export function getDB() {
    if (!db)
        initializeDB();
    return db;
}
// This code is used for schema initialization and default data in the database
// It does not return a value intentionally
function runFromSQLFile(db, file_name) {
    // todo, add security checks to ensure only from a trusted file / not going upwards
    const dataSql = fs.readFileSync(SQL_FILES_ROOT + file_name).toString();
    db.exec(dataSql);
}
