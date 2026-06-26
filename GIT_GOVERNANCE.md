# GIT GOVERNANCE™ — KCG STANDARDS

## 1. Branch Hierarchy
- **`main`**: Sacred. Mirrors Production VM. Only tagged certified releases.
- **`release`**: Transition zone for final certification.
- **`develop`**: Integration branch for preproduction.
- **`feature/*`**: Experimental and feature development.

## 2. Merge Constraints
- NO direct merges into `main`.
- NO direct merges from `feature` to `main`.
- **Flow**: `feature` -> `develop` -> `release` -> `main`.

## 3. Atomic Commit Policy
- Use conventional commits: `feat:`, `fix:`, `chore:`, `infra:`.
- Every commit must maintain build stability.

**VERDICT: GIT FLOW ENFORCED. READY FOR APPLICATION REGISTRY.**
