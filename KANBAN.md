# RISE GitHub Kanban Board

Use this outline to create a GitHub Projects board for planning and tracking RISE development.

## Board Columns

### Backlog

Ideas, requested features, technical improvements, and bugs that have not been prioritized yet.

### Ready

Work that is clearly defined and ready for someone to start.

### In Progress

Work currently being implemented. Each contributor should generally have no more than one or two active cards at a time.

### Review

Completed work waiting for code review, testing, design review, or stakeholder feedback.

### Done

Work that has been reviewed, tested, and merged into the default branch.

## Starter Cards

### Project Setup

- Define the project mission and target users
- Document the technology stack
- Confirm local development setup
- Add environment variable documentation
- Add initial project structure

### Product Features

- Define the first release scope
- Create the initial application layout
- Implement user authentication
- Add the primary user workflow
- Add data persistence
- Add validation and error handling

### Quality and Security

- Add linting and formatting checks
- Add automated tests for core workflows
- Review accessibility and responsive behavior
- Review authentication and authorization rules
- Confirm secrets are excluded from version control

### Documentation and Release

- Complete the README
- Complete the contribution guidelines
- Add deployment instructions
- Configure the production environment
- Create the first release checklist

## Suggested Labels

- `feature` — New product functionality
- `bug` — Something is not working as expected
- `documentation` — Documentation-only change
- `design` — UI, UX, or visual work
- `backend` — Server, database, or API work
- `frontend` — Client-side or interface work
- `testing` — Test coverage or quality checks
- `security` — Authentication, authorization, or sensitive-data concerns
- `priority: high` — Needs immediate attention
- `priority: medium` — Important planned work
- `priority: low` — Useful but not urgent

## Card Template

Use this template when creating an issue or project card:

```markdown
## Summary

Describe the work in one or two sentences.

## Goal

Explain what outcome this task should achieve.

## Acceptance Criteria

- [ ] Criterion one
- [ ] Criterion two
- [ ] Criterion three

## Notes

Add design references, technical considerations, dependencies, or screenshots here.
```

## Workflow

1. Add new ideas and issues to **Backlog**.
2. Prioritize and clarify work before moving it to **Ready**.
3. Move a card to **In Progress** when implementation begins.
4. Move completed implementation to **Review** and open a pull request.
5. Move the card to **Done** after review, testing, and merging.

## GitHub Projects Setup

1. Open the repository on GitHub.
2. Select **Projects** and create a new project.
3. Choose the **Board** layout.
4. Add the columns listed above.
5. Create issues for the starter cards and add them to the board.
6. Add the suggested labels and configure filters or automation as needed.
