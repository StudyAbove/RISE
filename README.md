# RISE

RISE is a student-focused planning application for balancing academic work and personal commitments. It is designed to help university students plan assignments in advance, break large assignments into manageable microtasks, and reduce deadline-related stress and burnout.

RISE is being developed as a senior capstone project at California State University, Long Beach, beginning in 2026.

## Project status

This repository currently contains the project documentation and planning materials. The application source code, package configuration, environment template, automated tests, and deployment configuration will be added as implementation progresses.

## Planned features

- **14-day summary:** Show upcoming assignments and commitments so students can identify workload before becoming overwhelmed.
- **Calendar integration:** Connect Apple and Google calendars to prevent overbooking and double-booking.
- **Assignment breakdown:** Divide assignments into focused, actionable tasks.
- **Support button:** Provide practical next steps for last-minute work, such as breathing exercises, contacting a professor, and attending office hours.

## Recommended technology stack

The following stack is recommended for implementation. These tools are proposals until the corresponding configuration files are committed to the repository.

### Application

- **React Native with Expo** — Cross-platform mobile application development for iOS and Android.
- **TypeScript** — Static typing and safer refactoring.
- **Expo Router** — File-based navigation.
- **React Native Paper** — Accessible, consistent mobile UI components.
- **TanStack Query** — Server-state fetching, caching, and synchronization.
- **Zustand** — Lightweight local UI state management.

### Backend and data

- **Supabase** — PostgreSQL database, authentication, row-level security, and API access.
- **PostgreSQL** — Persistent storage for users, courses, assignments, tasks, calendar connections, and commitments.
- **Supabase Edge Functions** — Server-side operations such as calendar synchronization and protected integrations.
- **Zod** — Runtime validation for API responses, forms, and environment variables.

### Calendar integrations

- **Google Calendar API** — Google calendar synchronization.
- **Apple EventKit** — Native iOS calendar access, implemented through an Expo-compatible native module when required.
- Keep provider credentials and access tokens on the server or in secure device storage; never commit them to Git.

### Quality and delivery tools

- **ESLint** — JavaScript and TypeScript linting.
- **Prettier** — Consistent formatting.
- **Jest and React Native Testing Library** — Unit and component tests.
- **Detox** — Optional end-to-end mobile testing.
- **GitHub Actions** — Automated lint, type-check, test, and build checks.
- **Expo Application Services (EAS)** — Mobile previews and production builds.
- **GitHub Dependabot** — Dependency update pull requests.
- **GitHub branch protection or rulesets** — Require reviewed pull requests and passing checks before changes reach `main`.

## Recommended repository files

As implementation is added, the repository should include the following files and directories:

```text
RISE/
├── app/                         # Expo Router screens and layouts
├── components/                  # Reusable UI components
├── features/                    # Feature-specific UI, hooks, and logic
├── lib/                         # Supabase client, API helpers, and utilities
├── services/                    # Calendar and external-service integrations
├── types/                       # Shared TypeScript types and schemas
├── assets/                      # Images, icons, fonts, and other bundled assets
├── tests/                       # Unit, component, and integration tests
├── supabase/
│   ├── migrations/              # Versioned database migrations
│   └── functions/               # Edge Functions
├── .github/
│   ├── workflows/               # CI and deployment workflows
│   ├── ISSUE_TEMPLATE/          # Bug and feature issue forms
│   ├── pull_request_template.md # Pull request checklist
│   └── CODEOWNERS               # Review ownership rules
├── .env.example                 # Names of required variables, without secrets
├── .gitignore                   # Dependencies, builds, secrets, and local files
├── app.json or app.config.ts    # Expo application configuration
├── eas.json                     # EAS build and submission profiles
├── package.json                 # Scripts and dependencies
├── tsconfig.json                # TypeScript configuration
├── eslint.config.js             # Linting configuration
├── prettier.config.js           # Formatting configuration
├── jest.config.js               # Test configuration
├── CONTRIBUTING.md              # Contribution workflow
├── LICENSE                      # MIT license
└── README.md                   # Project documentation
```

Files should be added when they become necessary. Placeholder configuration should not be committed as if it were functional.

## Getting started

### Current repository

There is no runnable application in the repository yet. To review the project documentation:

```bash
git clone https://github.com/[owner]/[repository].git
cd [repository]
```

### Planned application setup

After the application scaffold is added, the expected setup will be:

```bash
npm install
cp .env.example .env.local
npx expo start
```

Required environment variables should be documented in `.env.example`, for example:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Only values intended for the client should use the `EXPO_PUBLIC_` prefix. Server-only secrets must not be bundled into the mobile application or committed to source control.

## Recommended scripts

Once the application is scaffolded, `package.json` should provide scripts similar to these:

| Command | Purpose |
| --- | --- |
| `npm run start` | Start the Expo development server. |
| `npm run android` | Open the app on an Android device or emulator. |
| `npm run ios` | Open the app on an iOS simulator or device. |
| `npm run lint` | Check code for linting problems. |
| `npm run format` | Format supported files with Prettier. |
| `npm run typecheck` | Run the TypeScript compiler without emitting files. |
| `npm test` | Run unit and component tests. |
| `npm run test:e2e` | Run end-to-end tests when Detox is configured. |
| `npm run build` | Create an EAS build when configured. |

## Development workflow

1. Create a focused branch from `main`:

   ```bash
   git checkout -b feature/short-description
   ```

2. Make a focused change and add or update tests.
3. Run linting, formatting checks, type checking, and tests.
4. Open a pull request against `main`.
5. Merge only after required reviews and GitHub Actions checks pass.

The `main` branch should be protected with pull requests, at least one approving review, passing CI checks, resolved conversations, and force-push/deletion restrictions.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution guidelines.

## Deployment

Deployment details are not configured yet. The recommended delivery path is:

- **Preview builds:** Expo Application Services (EAS) internal distribution.
- **Production mobile builds:** EAS Build and EAS Submit.
- **Backend:** Supabase project with migrations applied through the Supabase CLI.
- **CI:** GitHub Actions for linting, type checking, tests, and build validation.

Production URLs, project IDs, and service-specific instructions should be added here once they exist. Secrets should be stored in GitHub Actions, Supabase, EAS, or another secrets manager—not in this README.

## Contributors

| Name | Role |
| --- | --- |
| Julia Matinyan | Contributor |
| Bighani Lometillo | Contributor |
| Jesus Vaquero | Contributor |
| Lisseth Zamora Martinez | Contributor |
| Mo Gibson | Contributor |

## License

RISE is licensed under the [MIT License](LICENSE).

## Disclaimer

RISE is an educational capstone project and is not a substitute for professional medical, mental-health, academic, or emergency services. Calendar and workload suggestions are informational. Users should contact qualified professionals or campus support services when they need additional help.

## Contact

For questions or collaboration inquiries, contact the RISE team at [rise@gmail.com](mailto:rise@gmail.com) or open an issue in this repository.
