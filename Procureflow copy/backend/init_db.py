"""
Database initialization and seeding script.
Run this once before starting the server.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.seed import seed_database

if __name__ == "__main__":
    print("🚀 Initializing Procureflow database...")
    seed_database()
    print("✅ Done!")
