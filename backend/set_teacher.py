import sqlite3

# Cambia la ruta si tu db.sqlite está en otro lugar
db_path = 'backend/db.sqlite'
email = input("Email del usuario a convertir en teacher: ").strip()

conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("UPDATE users SET role = 'teacher' WHERE email = ?", (email,))
conn.commit()

if cur.rowcount > 0:
    print("¡Rol actualizado exitosamente!")
else:
    print("No se encontró un usuario con ese email.")

conn.close() 