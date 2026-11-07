#!/bin/sh
set -e  # Exit immediately if a command exits with a non-zero status.

PB_DATA_DIR="/pb/pb_data"
PB_MIGRATIONS_DIR="/pb/pb_migrations"
ITEMS_MIGRATION="$PB_MIGRATIONS_DIR/1750000000_create_items.js"

mkdir -p "$PB_DATA_DIR" "$PB_MIGRATIONS_DIR"

# PocketBase manages collections through migrations, not raw SQL. Creating the
# physical table by hand is not enough: PocketBase also needs the matching
# record in _collections, and writing that manually bypasses schema validation.
# This migration defines the same `items` collection used by the app.
if [ ! -f "$ITEMS_MIGRATION" ]; then
    cat > "$ITEMS_MIGRATION" <<'PB_MIGRATION'
/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Existing databases may already have the collection; leave it untouched.
  try {
    app.findCollectionByNameOrId("items");
    return;
  } catch (_) {
    // Not found, create it below.
  }

  const collection = new Collection({
    id: "pbc_710432678",
    name: "items",
    type: "base",
    system: false,
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text3208210256",
        max: 15,
        min: 15,
        name: "id",
        pattern: "^[a-z0-9]+$",
        presentable: false,
        primaryKey: true,
        required: true,
        system: true,
        type: "text"
      },
      {
        autogeneratePattern: "",
        hidden: false,
        id: "text521872670",
        max: 0,
        min: 0,
        name: "item",
        pattern: "",
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: "text"
      },
      {
        autogeneratePattern: "",
        hidden: false,
        id: "text3545646658",
        max: 0,
        min: 0,
        name: "createdBy",
        pattern: "",
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: "text"
      },
      {
        hidden: false,
        id: "autodate2990389176",
        name: "created",
        onCreate: true,
        onUpdate: false,
        presentable: false,
        system: false,
        type: "autodate"
      },
      {
        hidden: false,
        id: "autodate3332085495",
        name: "updated",
        onCreate: true,
        onUpdate: true,
        presentable: false,
        system: false,
        type: "autodate"
      }
    ],
    indexes: [],
    listRule: '@request.auth.id != ""',
    viewRule: null,
    createRule: '@request.auth.id != ""',
    updateRule: null,
    deleteRule: '@request.auth.id != ""',
    options: {}
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("items");

  return app.delete(collection);
});
PB_MIGRATION
fi

# Ensure the initial superuser exists. PocketBase's CLI returns exit code 0 even
# when the command fails, so check the output instead of relying on `set -e`.
# `create` is used (instead of `upsert`) so an existing password is not reset
# every time the container restarts.
if [ -z "$PB_ADMIN_EMAIL" ] || [ -z "$PB_ADMIN_PASSWORD" ]; then
    echo "ERROR: PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD must be set to create the initial superuser." >&2
    exit 1
fi

echo "Ensuring PocketBase superuser..."
superuser_output=$(/pb/pocketbase superuser create "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" --dir="$PB_DATA_DIR" 2>&1) || true
case "$superuser_output" in
    *"Successfully created new superuser"*)
        echo "$superuser_output"
        ;;
    *"unique"*)
        echo "Superuser already exists; leaving the existing password unchanged."
        ;;
    *)
        echo "$superuser_output" >&2
        echo "ERROR: failed to create the PocketBase superuser." >&2
        exit 1
        ;;
esac

echo "Applying PocketBase migrations..."
/pb/pocketbase migrate up --dir="$PB_DATA_DIR" --migrationsDir="$PB_MIGRATIONS_DIR"

echo "Starting PocketBase server..."
exec /pb/pocketbase serve \
    --http=0.0.0.0:8080 \
    --dir="$PB_DATA_DIR" \
    --migrationsDir="$PB_MIGRATIONS_DIR"
