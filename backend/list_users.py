import sqlite3

db_path = 'backend/db.sqlite'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

print(f"{'ID':<5} {'Nombre':<20} {'Email':<30} {'Rol':<10}")
print('-'*70)
for row in cur.execute("SELECT id, name, email, role FROM users"):
    print(f"{row[0]:<5} {row[1]:<20} {row[2]:<30} {row[3]:<10}")

conn.close() 