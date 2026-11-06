#!/bin/sh
set -e  # Exit immediately if a command exits with a non-zero status.

PB_DATA_PATH="/pb/pb_data/data.db"

# Check if the database file does NOT exist
if [ ! -f "$PB_DATA_PATH" ]; then
    echo "Initializing PocketBase: Creating superuser..."
    # Use the environment variables from your .env file
    /pb/pocketbase superuser create "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD"
fi

echo "Starting PocketBase server..."
exec /pb/pocketbase serve --http=0.0.0.0:8080
