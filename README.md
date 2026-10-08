# RISE

## A Senior Capstone Design

As upper classmen in college, we went through the learning curve of tracking assignments, exams, and projects along side life commitments. Even after a couple years under our belt, we stil feel the struggle of procrastination and managing deadlines with different classes. What if there was a better way? That is why we developed RISE. 

## Overview

RISE is a mobile application designed to help students manage academic and life responsibilities. It helps university students RISE plan assignments in advance and break them down into microtasks, avoid unneccissary stress and burnout.

This project was developed as a capstone project at California State University, Long Beach, beginning in 2026.

## Features

- **Summary:** Looks at the next 14 days to gauge student's total workload, starting work before you are overwhelmed.
- **Add Calendars:** Users can add their personal Apple or Google calendars, features to coordinate with pre-existing calendars to avoid overbooking or double-booking
- **Assignment Breakdown:** After clicking on assignments, users can see the assignment in specific tasks. This simplifies the user's focus to one thing, and makes it easier to start.
- **Help Button:** If users have a last-minute assignmetn due, they can click the button to address the fear, take managable steps to address it (breathing, emailing professors, Office Hours). This allows the users to focus back on the work, instead of letting their emotions guide them.

## Technologies Used

This project uses the following technologies and tools.

### Frontend

- **React Native** — Used to build the mobile application.
- **Expo** — Used for React Native development, testing, and native integrations.
- **TypeScript** — Used for type safety and shared application models.

### Backend

- **Supabase** — Used as the backend platform.
- **PostgreSQL** — Used as the application database through Supabase.
- **Supabase Auth** — Used for user authentication and session management.
- **Supabase Data API** — Used by the application to communicate with the database.

### Integrations

- **Apple Calendar** — Used to connect a user's Apple calendar.
- **Google Calendar** — Used to connect a user's Google calendar.
- **Canvas** — Academic information will be imported through the RISE Canvas integration.

### Development Tools

- **Node.js**
- **npm**
- **Git and GitHub**
- **Visual Studio Code**
- **Xcode / iOS Simulator**
- **Supabase**
- **Expo Go**

## Getting Started

### Prerequisites

Before running the project, make sure you have installed:

- Node.js 20.19.4 or newer (required by Expo SDK 57)
- npm
- Git
- Expo-compatible development tools
- Xcode if using the iOS Simulator on macOS

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/StudyAbove/RISE.git
   cd RISE
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create an environment file:

   ```bash
   cp .env.example .env
   ```


4. Add the required values to `.env`:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   ```
Ask a team member for the shared development Supabase values.
Do not commit the `.env` file to GitHub.

5. Start the Expo development server:

   ```bash
   npx expo start
   ```

6. To run using the iOS Simulator:

   ```bash
   npx expo start --tunnel
   ```
After Expo starts, press: i


## Available Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Expo development server. |
| `npm run ios` | Open the project using the iOS Simulator. |
| `npm run android` | Open the project using an Android emulator or device. |
| `npm run web` | Run the Expo web version for development. |
| `npx expo start --tunnel` | Start Expo using a tunnel connection. |
| `npm test` | Run the test suite. |
Future -
| `[package-manager] run dev` | Start the development server. |
| `[package-manager] run build` | Create a production build. |
| `[package-manager] run start` | Run the production build. |
| `[package-manager] run lint` | Check the codebase for linting issues. |

## Project Structure

```text
RISE/
├── assets/                     # Images, icons, and other static assets
├── jest/                       # Test setup and mocks
├── src/
│   ├── components/             # Shared reusable UI components
│   ├── features/
│   │   ├── analytics/          # Analytics tab
│   │   ├── assignments/        # Assignments (List tab)
│   │   ├── auth/               # Authentication features
│   │   ├── calendar/           # Calendar integration features
│   │   ├── canvas/             # Canvas integration features
│   │   ├── home/               # Home tab
│   │   ├── navigation/         # Application navigation
│   │   ├── onboarding/         # User onboarding
│   │   ├── settings/           # Settings features
│   │   └── studyPlan/          # Study planning features
│   ├── hooks/                  # Shared React hooks
│   ├── lib/                    # Shared library configuration
│   ├── mocks/                  # Optional development mock data
│   ├── models/                 # Shared TypeScript models
│   ├── repositories/           # Data access layer
│   ├── services/               # Shared application services
│   ├── theme/                  # Colors, fonts, and text styles
│   ├── types/                  # Global TypeScript declarations
│   └── utils/                  # Shared helper functions
├── .env.example                # Environment variable template
├── App.tsx                     # Application entry component
├── app.json                    # Expo application configuration
├── index.ts                    # Application entry point
├── metro.config.js             # Bundler configuration (SVG imports)
├── package.json                # Project dependencies and scripts
└── tsconfig.json               # TypeScript configuration
```

## Deployment

RISE is currently in active development and is not yet deployed as a production application.
The project is currently tested through Expo and the iOS Simulator.

Future -
- **Live application:** [Deployment URL]
- **Hosting provider:** [Provider]
- **Required services:** [Database, authentication provider, APIs, or other services]

## Contributors

| Name | Role | Profile |
| --- | --- | --- |
| Julia Matinyan | [Role] | https://www.linkedin.com/in/jmatinyan |
| Bighani Lometillo | [Role] | [Profile URL] |
| Jesus Vaquero | [Role] | [Profile URL] |
| Lisseth Zamora Martinez | [Role] | [Profile URL] |
| Mo Gibson | [Role] | https://www.linkedin.com/in/mo-gibson-5978b7354/ |


## Contributing

Team members should create a separate branch for each GitHub issue or feature.

1. Make sure the local `main` branch is up to date.

   ```bash
   git checkout main
   git pull
   ```

2. Create a feature branch using the GitHub issue number. Example: git checkout -b feature/24-create-account
   
   ```bash
   git checkout -b feature/<issue-number>-<short-name>
   ```

3. Make and test the changes.

4. Push the branch to GitHub.

5. Open a pull request into main.


## License

RISE is licensed under the [License Name]. See [LICENSE](LICENSE) for details.

## Disclaimer

RISE is currently being developed as a senior capstone project and is not yet intended for production use. Features, integrations, and application behavior may change during development.

## Contact

For questions or collaboration inquiries, contact RISE at rise@gmail.com or open an issue in this repository.
