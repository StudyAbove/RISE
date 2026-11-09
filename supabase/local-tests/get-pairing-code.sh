#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
env_file="$script_dir/.env"

if [[ ! -f "$env_file" ]]; then
  echo "Missing $env_file. Copy .env.example to .env and set the local anon key." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_ANON_KEY:-}" ]]; then
  echo "Set SUPABASE_URL and SUPABASE_ANON_KEY in $env_file first." >&2
  exit 1
fi

test_email="mo.gibson01@student.csulb.edu"
read -r -s -p "Password for $test_email: " test_password
printf '\n'

payload=$(TEST_EMAIL="$test_email" TEST_PASSWORD="$test_password" python3 -c \
  'import json,os; print(json.dumps({"email":os.environ["TEST_EMAIL"],"password":os.environ["TEST_PASSWORD"]}))')
unset test_password

auth_response=$(curl --fail-with-body --silent --show-error \
  "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H 'Content-Type: application/json' \
  --data "$payload")
unset payload

access_token=$(AUTH_RESPONSE="$auth_response" python3 -c \
  'import json,os; print(json.loads(os.environ["AUTH_RESPONSE"]).get("access_token", ""))')
unset auth_response
if [[ -z "$access_token" ]]; then
  echo "Sign-in did not return an access token." >&2
  exit 1
fi

curl --fail-with-body --silent --show-error \
  "$SUPABASE_URL/rest/v1/rpc/create_extension_pairing_code" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $access_token" \
  -H 'Content-Type: application/json' \
  --data '{}'
printf '\n'
