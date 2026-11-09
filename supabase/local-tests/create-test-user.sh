#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
env_file="$script_dir/.env"

if [[ ! -f "$env_file" ]]; then
  echo "Missing $env_file. Copy .env.example to .env and add the local anon key." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

if [[ -z "${SUPABASE_ANON_KEY:-}" ]]; then
  echo "Set SUPABASE_ANON_KEY in $env_file first." >&2
  exit 1
fi

read -r -p "Test email: " test_email
read -r -s -p "Test password: " test_password
printf '\n'

curl --fail-with-body --silent --show-error \
  "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H 'Content-Type: application/json' \
  --data "$(TEST_EMAIL="$test_email" TEST_PASSWORD="$test_password" python3 -c 'import json,os; print(json.dumps({"email":os.environ["TEST_EMAIL"],"password":os.environ["TEST_PASSWORD"]}))')"
printf '\n'
