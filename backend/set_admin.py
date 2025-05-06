import sqlite3

db_path = 'backend/db.sqlite'
email = input("Email del usuario a convertir en admin: ").strip()

conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("UPDATE users SET role = 'admin' WHERE email = ?", (email,))
conn.commit()

if cur.rowcount > 0:
    print("¡Rol actualizado a admin exitosamente!")
else:
    print("No se encontró un usuario con ese email.")

conn.close() 