# RISE Syllabus Pull Prototype

A separate Chrome extension for end-to-end testing without access to the RISE phone app. Opening the popup on a signed-in Canvas tab automatically fetches every active course and its `syllabus_body`, follows Canvas pagination, converts syllabus HTML to text, and shows the results. If the syllabus tab has fewer than 3,000 characters, it searches that course's modules for items whose topic contains “syllabus.” Canvas Pages can be parsed as text; Canvas File items can be parsed when they are PDF or DOCX.

The Supabase project URL is built into the extension. Connect with the email and one-time pairing code; the function returns an extension token stored by the extension. AI extraction sends syllabus text or a selected document to `canvas-extension`; the OpenAI key remains server-side. You can also enter syllabus details manually. Parsed and manually entered fields are saved to the normalized syllabus tables linked to the signed-in user's matching course code. Extraction metadata and structured output are also recorded in `syllabus_prototype_runs`. Uploaded document bytes and raw syllabus text are not retained in those records. Pulled text can be exported as JSON.

Before parsing, deploy the migrations and Edge Function and configure `OPENAI_API_KEY` as a Supabase Edge Function secret. Local development can use `supabase/functions/.env` based on the adjacent `.env.example`.

### Connect the prototype

1. Apply the migrations, including `20261106120000_syllabus_prototype_runs.sql`, `20261108180000_normalized_syllabi.sql`, `20261109100000_syllabus_office_location.sql`, `20261109110000_office_hours_location.sql`, `20261109120000_office_hours_unique_key.sql`, `20261109130000_backfill_office_locations.sql`, and `20261109140000_class_location.sql`, to your Supabase project.
2. In Supabase Edge Function secrets, set `OPENAI_API_KEY` to your OpenAI API key. Never put the OpenAI key in the extension.
3. Deploy the updated function: `supabase functions deploy canvas-extension`.
4. In the RISE app, open Canvas settings and generate a pairing code. In the extension popup, enter the RISE account email and that code, then select **Connect**.
5. Open Canvas in a signed-in browser tab. Parse syllabus text or a module PDF/DOCX; each successful extraction creates a row in Supabase Dashboard → Table Editor → `syllabus_prototype_runs`.

The pairing code is short-lived and can be used once. The function stores only course/source metadata and extracted fields; it does not add a course to a RISE user's account.

## Review static sample data in Supabase

If you only want placeholder rows and do not need to run the AI pipeline, [`sample-data.sql`](./sample-data.sql) inserts a sample course under an existing RISE email. For end-to-end tests without a RISE account, use `syllabus_prototype_runs` instead.

## Load it in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this `syllabus-pull-prototype` directory.
4. Sign in to Canvas in a tab, then open the RISE Syllabus Pull Prototype toolbar icon.

The popup starts the pull automatically. Use **Pull again** to retry after changing Canvas tabs or signing in.
