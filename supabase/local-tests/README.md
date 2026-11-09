# Local Supabase tests

These scripts exercise local Supabase Auth and the syllabus prototype without the RISE extension.

## Setup

1. Start the local stack from the repository root: `npx supabase start`.
2. Copy `.env.example` to `.env` in this directory and add the local anon key from `npx supabase status`.
3. Create a local test account by running `./create-test-user.sh`.

The test user's password is entered interactively and is not saved in a file. The local `.env` is ignored by Git. Do not put a service-role key or production credentials here.

The prototype route additionally requires a paired extension token and `OPENAI_API_KEY` configured for the local Edge Function. See `../functions/.env.example` for the function's server-side environment template.
