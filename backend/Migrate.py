from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)


def find_signer_table(conn):
    result = conn.execute(text("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """))
    tables = [row[0] for row in result]

    candidates = [
        'document_signers',
        'document_signer',
        'documentsigner',
        'signers',
        'signing_requests',
        'document_signing_requests',
    ]
    for candidate in candidates:
        if candidate in tables:
            return candidate
    return None


def run_migration(conn, description, sql):
    try:
        conn.execute(text(sql))
        print(f"  ✅ {description}")
        return True
    except Exception as e:
        err = str(e).split('\n')[0]
        print(f"  ⚠️  {description} → {err}")
        return False


def migrate():
    print("=" * 55)
    print("  SignFlow - Running All Migrations")
    print("=" * 55)

    with engine.connect() as conn:

        print("\n📐 [1/4] Signatures table - width & height columns")
        run_migration(conn,
            "Add 'width' column",
            "ALTER TABLE signatures ADD COLUMN IF NOT EXISTS width FLOAT DEFAULT 150.0"
        )
        run_migration(conn,
            "Add 'height' column",
            "ALTER TABLE signatures ADD COLUMN IF NOT EXISTS height FLOAT DEFAULT 50.0"
        )


        print("\n🔐 [2/4] Users table - Google OAuth columns")
        run_migration(conn,
            "Add 'google_id' column",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR UNIQUE"
        )
        run_migration(conn,
            "Add 'profile_picture' column",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR"
        )


        print("\n🔑 [3/4] Users table - Password reset columns")
        run_migration(conn,
            "Add 'reset_token' column",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) UNIQUE"
        )
        run_migration(conn,
            "Add 'reset_token_expires' column",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP"
        )


        print("\n❌ [4/4] Document signers table - Rejection columns")
        signer_table = find_signer_table(conn)

        if signer_table:
            print(f"  📋 Detected signer table: '{signer_table}'")
            run_migration(conn,
                "Add 'rejection_reason' column",
                f"ALTER TABLE {signer_table} ADD COLUMN IF NOT EXISTS rejection_reason TEXT"
            )
            run_migration(conn,
                "Add 'rejected_at' column",
                f"ALTER TABLE {signer_table} ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP"
            )
        else:
            print("  ❌ Could not detect signer table - skipping rejection columns")

        conn.commit()

        print("\n🏷️  [5/5] Document status enum - adding 'rejected'")
        try:
            with engine.connect() as enum_conn:
                enum_conn.execute(text(
                    "ALTER TYPE documentstatus ADD VALUE IF NOT EXISTS 'rejected'"
                ))
                enum_conn.commit()
                print("  ✅ Added 'rejected' to documentstatus enum")
        except Exception as e:
            err = str(e).split('\n')[0]
            print(f"  ⚠️  Enum update → {err}")

    print("\n" + "=" * 55)
    print("  ✅ All migrations completed!")
    print("=" * 55)


if __name__ == "__main__":
    migrate()