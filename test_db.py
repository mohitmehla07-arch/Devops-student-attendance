
from backend.shared.database import engine

try:
    with engine.connect() as connection:
        print("MySQL connection successful!")
        print("Connected database:", engine.url.database)

except Exception as error:
    print("MySQL connection failed!")
    print(error)
