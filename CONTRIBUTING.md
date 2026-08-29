# Contributing to openIndu Admin

Thank you for contributing. Create a focused branch, keep secrets and local
`.env` files out of Git, and open a pull request against `main`.

Before submitting a pull request, run:

```bash
npm ci
npm audit --audit-level=high
npm test
npm run build
```

Describe the intent, blast radius, test results, and rollback approach in the
pull request. All changes require human review before merge.
