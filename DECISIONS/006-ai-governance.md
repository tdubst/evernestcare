# 006: AI Governance

Status: Accepted

## Context

Evernest is developed with AI assistance, but must not become an uncontrolled AI-generated codebase.

## Decision

AI agents operate under `FOUNDATION` overlays and local `AI-OS` inheritance. Agents must stay scoped, produce reviewable changes, and avoid unapproved feature expansion.

## Rules

- No generalized agent has whole-repo write authority by default.
- Architecture, permissions, database, and golden-flow changes require explicit review context.
- AI must not generate diagnostic, treatment, EHR, telemedicine, billing, or enterprise-provider features unless future governance explicitly changes scope.
- Shared logic belongs in AI-OS only when reusable beyond Evernest or explicitly approved.
- Every alpha change should identify affected agent, affected golden flow, and verification path.

