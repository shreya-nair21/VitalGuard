import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(__file__), 'vitalguard.db')
    print(f"Connecting to database at: {db_path}")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    # Check existing columns
    cur.execute("PRAGMA table_info(patient);")
    columns = [col[1] for col in cur.fetchall()]
    print(f"Existing columns in patient table: {columns}")
    
    if "room_number" not in columns:
        print("Adding room_number column to patient table...")
        cur.execute("ALTER TABLE patient ADD COLUMN room_number VARCHAR;")
        conn.commit()
        print("Column room_number added successfully.")
    else:
        print("Column room_number already exists.")
        
    # Backfill existing patients without room_number
    cur.execute("SELECT id, name, room_number FROM patient ORDER BY id ASC;")
    patients = cur.fetchall()
    
    occupied_rooms = set()
    for pid, name, rnum in patients:
        if rnum:
            occupied_rooms.add(str(rnum))
            
    candidate_room = 101
    for pid, name, rnum in patients:
        if not rnum:
            while str(candidate_room) in occupied_rooms:
                candidate_room += 1
            assigned = str(candidate_room)
            occupied_rooms.add(assigned)
            cur.execute("UPDATE patient SET room_number = ? WHERE id = ?;", (assigned, pid))
            print(f"Assigned Room {assigned} to Patient #{pid} ({name})")
            candidate_room += 1
            
    conn.commit()
    
    # Verify
    cur.execute("SELECT id, name, mrn, room_number FROM patient ORDER BY id ASC;")
    updated = cur.fetchall()
    print("\n--- Updated Patient Records ---")
    for row in updated:
        print(f"ID: {row[0]}, Name: {row[1]}, MRN: {row[2]}, Room: {row[3]}")
        
    conn.close()
    print("\nMigration completed successfully!")

if __name__ == "__main__":
    migrate()
