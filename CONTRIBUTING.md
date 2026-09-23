# Contributing to RISE

Thank you for your interest in contributing to RISE. Contributions, feedback, and bug reports are welcome.

## Before You Start

Please check the existing issues and pull requests before opening a new one. For larger changes, open an issue first so the proposed work can be discussed before implementation begins.

## Development Setup

1. Fork the repository and clone your fork:

   ```bash
   git clone https://github.com/[username]/[repository].git
   cd [repository]
   ```

2. Install the project dependencies:

   ```bash
   [package-manager] install
   ```

3. Create the local environment file and add the required values:

   ```bash
   cp .env.example .env.local
   ```

4. Start the development server:

   ```bash
   [package-manager] run dev
   ```

## Creating a Branch

Create a focused branch from the default branch before making changes:

```bash
git checkout -b feature/short-description
```

Use these naming conventions when possible:

- `feature/` for new functionality
- `fix/` for bug fixes
- `docs/` for documentation changes
- `refactor/` for code changes that do not alter behavior

## Making Changes

- Keep changes focused and avoid unrelated edits.
- Follow the existing project structure and coding style.
- Add or update tests when changing application behavior.
- Update the README or other documentation when the setup or usage changes.
- Do not commit secrets, API keys, credentials, or local environment files.

## Quality Checks

Run the relevant checks before opening a pull request:

```bash
[package-manager] run lint
[package-manager] run test
[package-manager] run build
```

If a command is not configured in the project yet, mention that in the pull request description.

## Commit Messages

Use short, descriptive commit messages. Conventional Commit-style prefixes are encouraged:

```text
docs: update setup instructions
feat: add application tracking view
fix: handle missing profile data
refactor: simplify database utility
```

## Pull Requests

When opening a pull request:

1. Explain what changed and why.
2. Link any related issue.
3. Include screenshots or recordings for visual changes.
4. Describe the checks you ran and their results.
5. Call out any known limitations or follow-up work.

Pull requests should be small enough to review clearly and should not include unrelated formatting or generated files.

## Reporting Issues

When reporting a bug, include:

- A clear description of the problem
- Steps to reproduce it
- Expected and actual behavior
- Relevant screenshots, logs, or error messages
- Browser, operating system, and project version information when applicable

Do not include passwords, private keys, tokens, or other sensitive information in an issue.

## Code of Conduct

Contributors are expected to communicate respectfully, give constructive feedback, and maintain a welcoming environment for everyone involved with the project.

## License

By contributing to RISE, you agree that your contributions may be distributed under the [MIT License](LICENSE).
