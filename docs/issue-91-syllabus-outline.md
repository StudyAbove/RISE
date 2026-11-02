# Issue #91: Syllabus Information Outline

<!-- Planning document only: this describes the proposed implementation and does not change application code or Supabase. -->

## Goal

Let a student view and maintain useful course information from a syllabus, including information extracted by AI and information entered manually.

<!-- Keep AI extraction and manual entry in the same reviewable set of course fields. Students can correct extraction mistakes and fill gaps without waiting for AI to infer anything. -->

## Proposed user flow and timing

1. The student signs in through the RISE extension flow and connects/imports their classes.
2. As an addendum to that initial sign-in, RISE checks each imported class for an available syllabus and processes it automatically when found.
3. The student reviews the extracted values, which remain editable, and saves them to the associated class. Details absent from the syllabus are labeled **Unavailable**.
4. If the system cannot find a syllabus for a class, RISE emphasizes a small manual-entry field for the student to add the information. Manual entry remains available as a subtle option when a syllabus is found.
5. On later check-ins, RISE checks only classes with no syllabus information recorded. It emphasizes manual entry only if it still cannot find a syllabus for that class.
6. Students can reopen a class's syllabus information to correct or complete fields manually.

<!-- Place this in the existing extension sign-in/class-import journey instead of adding a separate top-level destination as the primary entry point. Let syllabus discovery and extraction lead. Keep manual entry visually secondary unless discovery fails, when it becomes the emphasized fallback. Track whether any syllabus information has been recorded per class so completed classes are skipped on later check-ins. -->

## Assignment weighting while syllabus details are missing

- Until grading percentages are recorded for a class, weigh each assignment for that class purely by its number of points.
- Once grading percentages are recorded, use those syllabus weights where the app calculates assignment/course weighting.

<!-- This is an interim fallback: missing syllabus grading data must not block assignment use or introduce guessed weights. Keep the existing points-based behavior for that class until actual percentages are available. -->

## Information to capture

- Course name
- Course overview
- Professor name
- Professor email
- Office hours
- Office location or meeting details
- Office-hour appointment booking instructions or link
- Grading percentages, such as assignment, exam, or participation weights
- Late-work policy
- Other relevant course information, with a free-text label/value or notes field

<!-- Grading percentages and appointment booking details extend the original acceptance criteria based on the requested manual-entry subtask. Keep "Other" flexible so the schema does not need a migration for every additional syllabus detail. -->

## Proposed course data structure

- **office_hours**: one-to-many from a class; each office-hours entry has:
  - `dayOfWeek` (enum with the days of the week)
  - `start` (`time`)
  - `end` (`time`)
  - `required_booking` (`boolean`)
  - `schedule_booking` (optional URL to the professor's office-hours booking page; proposed database type: `text`)
- **grading_scale**: one-to-one with a class; contains one-to-many **topics**, each with:
  - `title` (`varchar(50)`)
  - `percentage_worth` (`integer`)
- **late_policy**: one-to-one with a class; contains:
  - `description` (`varchar(200)`, describing the professor's late-work policy)

<!-- Model repeatable office-hour sessions and grading topics as child records so each class can have multiple days or grade components. Use an enum for dayOfWeek and Postgres time values for start/end. `text` is a flexible Postgres type for schedule_booking URLs; validate the URL in the app. Consider a 0–100 range constraint for percentage_worth. -->

## Proposed implementation areas

### Course details UI

- Add syllabus discovery and processing as an addendum to the extension sign-in/class-import flow.
- Emphasize manual entry only for a class where the system cannot find a syllabus; otherwise keep it as a small secondary option.
- Add a later check-in only for classes where no syllabus information is recorded.
- Keep a way to reopen syllabus details from the class for corrections and updates.
- Provide a manual entry and edit form for all fields above.
- Provide upload controls for DOCX and text-based PDF.
- Show loading, unavailable, and processing-error states clearly.
- Allow students to edit AI-extracted fields before saving.

<!-- The app already has course models and Supabase course reads, but the current navigation does not show a course-details screen. Confirm where students should reach this feature before implementation. -->

### Data and persistence

- Associate saved syllabus details with the existing Supabase `courses` record.
- Record whether syllabus information exists for each class so the later check-in can skip completed classes.
- Store office hours as multiple records per class with enum `dayOfWeek`, `time` start/end, boolean `required_booking`, and optional text `schedule_booking` URL.
- Store one grading scale per class with multiple topics, each containing `title varchar(50)` and integer `percentage_worth`.
- Store one late-policy record per class with `description varchar(200)`.
- Store remaining structured fields and a flexible value for "Other" details.
- Track whether values were entered manually or extracted, if needed for review and later edits.
- Apply access rules so a student can read and update only information for their own courses.

<!-- Initial design preference: a separate syllabus-details record keyed to course ID keeps optional syllabus fields out of the core course row. Confirm the actual Supabase schema and row-level security rules before choosing a migration. -->

### Upload and AI processing

- First use the extension/Canvas course information to find and retrieve a class syllabus when available.
- If no syllabus is available through the extension, accept student-uploaded DOCX and text-based PDF files; reject unsupported types with a clear message.
- Extract readable text from each supported file format.
- Send the text to an AI backend that returns a validated structured response for the fields above.
- Treat absent details as unavailable; do not fill gaps with guesses.
- Handle upload, text extraction, AI, and persistence failures with a recoverable error message.

<!-- Keep the ChatGPT/OpenAI API key in a server-side Supabase Edge Function or another trusted backend. Never place a secret AI key in the Expo app or expose it to the client. The existing Supabase publishable key is intended for client access and is not the AI key. -->

<!-- Repository check: extension/content/canvasApi.js currently imports course ID, name, code, term, and assignments; it does not currently retrieve syllabus content. Add syllabus discovery/retrieval to the extension integration before assuming the initial sync can provide syllabus text. -->

## Security and privacy notes

- Upload files through authenticated requests and enforce a reasonable file-size limit.
- Verify the requesting user's access to the associated course before saving or processing.
- Avoid retaining the original syllabus after processing unless product requirements call for storage.
- Keep AI credentials and any privileged Supabase credentials on the backend.

<!-- These are implementation constraints for safe handling of uploaded course documents and credentials; exact retention behavior should be confirmed before coding. -->

## Acceptance criteria coverage

| Issue criterion | Planned support |
| --- | --- |
| AC 1–2: upload and supported formats | Upload flow accepts DOCX and text-based PDF and reports unsupported or failed processing. |
| AC 3–6: course, professor, office hours, late work | Structured editable fields, plus grading percentages and appointment details requested for manual entry. |
| AC 7: labeled display | Course syllabus-information view groups values under clear labels. |
| AC 8: missing information | Missing values display as **Unavailable** and remain editable. |
| AC 9: extraction accuracy | Show extracted values for student review and correction before saving. |
| AC 10: processing error | Explain the failure and offer a retry or manual entry path. |

## Additional behavior from proposal review

- Syllabus setup follows the RISE extension sign-in/class-import step.
- Later check-ins are limited to classes with no syllabus information recorded.
- Until grading percentages are available for a class, its assignments use points-only weighting.

## Decisions to confirm during review

- Where in the app should students open syllabus information for a course?
- Should uploaded syllabus files be discarded after extraction or stored in Supabase Storage?
- Should extracted information save only after student review, or save automatically with a clear edit option?
- Should "Other" be free-form notes, custom labeled fields, or both?
- Should an instructor's office-hour appointment link be a dedicated field?
- What file-size limit and error/retry behavior should the upload flow use?
- Which Supabase table and policies currently represent a user's course access?

<!-- The outline records unresolved product and schema choices explicitly rather than assuming the current course table or storage policy supports them. -->
