# Contributing to Webflare Design Co. Admin

Thank you for considering contributing to our project! We welcome all contributions that help improve the Webflare Design Co. Admin Panel.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)
- [Questions](#questions)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** the project to your own machine
3. **Commit** changes to your own branch
4. **Push** your work back up to your fork
5. Submit a **Pull Request** so that we can review your changes

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Git
- Firebase CLI (for local development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/webflare-design-co-admin.git
   cd webflare-design-co-admin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Development Workflow

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/amazing-feature
   # or
   git checkout -b bugfix/annoying-bug
   ```

2. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

3. Push your changes to your fork:
   ```bash
   git push -u origin feature/amazing-feature
   ```

4. Open a Pull Request from your fork to the main repository.

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for our commit messages:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries

### Examples

```
feat(auth): add Google OAuth login
fix(api): handle null reference in user service
docs: update README with new installation instructions
```

## Pull Request Process

1. Ensure any install or build dependencies are removed before the end of the layer when doing a build.
2. Update the README.md with details of changes to the interface, including new environment variables, exposed ports, useful file locations, and container parameters.
3. Increase the version numbers in any example files and the README.md to the new version that this Pull Request would represent. The versioning scheme we use is [SemVer](http://semver.org/).
4. You may merge the Pull Request in once you have the sign-off of two other developers, or if you do not have permission to do that, you may request the second reviewer to merge it for you.

## Code Style

We use:
- ESLint for code linting
- Prettier for code formatting
- TypeScript for type checking

### Linting

```bash
# Run linter
npm run lint

# Automatically fix linting issues
npm run lint:fix
```

### Formatting

```bash
# Format code
npm run format
```

## Testing

We use Vitest for unit testing and React Testing Library for component testing.

```bash
# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm run test:coverage
```

## Documentation

- Keep the README up-to-date with any changes.
- Document any new environment variables in the `.env.example` file.
- Add comments to complex logic or business rules.
- Update the CHANGELOG.md with notable changes.

## Reporting Bugs

Use the GitHub issue tracker to report bugs. Please include:

1. A clear and descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Screenshots if applicable
6. Browser/OS version if relevant

## Feature Requests

We welcome feature requests. Please use the GitHub issue tracker to suggest new features. Include:

1. A clear and descriptive title
2. A description of the feature
3. Why this feature would be useful
4. Any potential implementation ideas

## Questions

For questions about the project, please open a discussion in the GitHub Discussions section.

## License

By contributing, you agree that your contributions will be licensed under the project's [LICENSE](LICENSE) file.
