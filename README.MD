# gdg-dlsu-hub

<div align="center" style="margin: 30px;">
    <a href="https://refine.dev">
    <img alt="refine logo" src="https://refine.ams3.cdn.digitaloceanspaces.com/readme/refine-readme-banner.png">
    </a>
</div>
<br/>

This [Refine](https://github.com/refinedev/refine) project was generated with [create refine-app](https://github.com/refinedev/refine/tree/master/packages/create-refine-app).

# GDG-DLSU Leadership Hub

A secure internal hub for GDG-DLSU, featuring robust RBAC (Role-Based Access Control) using Firebase Custom Claims, Firestore security rules, and automated workflows.

## Features

- 🔒 Role-Based Access Control (RBAC) with Firebase Custom Claims
- 🔥 Firestore security rules for fine-grained permissions
- ⚡ Cloud Functions for claims sync and automation
- 🧪 Automated tests (Jest, Firebase Emulator)
- 🚀 CI/CD with GitHub Actions

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/AebrahmRamos/gdgoc-dlsu-internal-hub.git
cd gdgoc-dlsu-internal-hub/gdg-dlsu-hub
npm install
```

### 2. Environment Setup

- Copy `.env.example` to `.env` and fill in secrets.
- Place your Firebase Admin SDK key as `serviceAccountKey.json`.

### 3. Development

```bash
npm run dev
```

### 4. Testing

```bash
npm test
```

Runs Jest tests with the Firebase Emulator.

### 5. Deployment

```bash
cd functions
npm run deploy
```

## RBAC & Custom Claims

- As new users register in Firebase Auth, rerun the seed script to set their claims:
  ```bash
  npm run script:seed-claims
  ```
  Or, let the Cloud Function handle it automatically when a user's profile is updated in Firestore.
- Users should sign out and sign back in to refresh their tokens and receive updated claims.

**Note:** Only users registered in Firebase Auth will have custom claims set. If a user is missing permissions, ensure they are registered and rerun the seed script if needed.

## Project Structure

- `src/` — Frontend (React + Refine)
- `functions/` — Firebase Cloud Functions (TypeScript)
- `scripts/` — Migration and seeding scripts
- `.github/workflows/` — CI/CD workflows

## Contributing

1. Fork the repo
2. Create a feature branch
3. Open a pull request

## License

MIT
