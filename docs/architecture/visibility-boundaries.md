# Visibility Boundaries

Evernest visibility boundaries are lightweight continuity rules for alpha collaboration. They are not enterprise RBAC, organizational hierarchy, or generalized permission infrastructure.

## Initial Visibility Concepts

### Primary Caregiver

Broad operational visibility for the care subject. Can contribute medication, vitals, notes, and timeline context.

### Contributor

Can add operational context and see shared timeline information needed for coordination.

### Read-Only Supporter

Can inspect shared operational context without contributing operational events by default.

### Provider View

Can receive factual, timeframe-bound summaries and selected operational context. Provider view does not create a provider portal or clinical workflow.

## Operational Visibility Boundaries

Visibility should follow care subject scope and event lineage:

- medication actions show actor and role
- vitals recordings show actor and role
- collaborative notes show author and context
- summaries preserve factual attribution when useful

## Timeline Visibility

Timeline rows should expose enough attribution to support continuity. They should not expose unrelated family details or hidden notes.

## Summary Visibility

Provider summaries should include attributed operational actions and caregiver observations when selected for sharing. Summaries remain factual and non-diagnostic.

## Future Permission Evolution

Future permission work may add finer controls for documents, provider sharing, temporary access, and revocation. That work should extend the canonical permissions model instead of creating a separate visibility system.

## Explicit Avoids

- No enterprise-grade RBAC complexity.
- No speculative permission systems.
- No organizational hierarchies.
- No hidden access inference.
- No social feed visibility model.
