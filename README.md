**HolonDeck** is a universal structured-data viewer and editor built with **Tauri 2.0, React, and TypeScript**. It treats any JSON object as a recursive "Card," allowing users to navigate complex data structures through a unified UI paradigm that functions identically at every depth of the document tree.

### Core User Experience: Recursive Cards
The application reimagines standard file tree navigation as a recursive drill-down interface.
*   **The Card Metaphor:** Every object is presented as a "Card" containing a compact summary (selected fields, truncated values) for lists, and a full inspection view for detailed editing.
*   **Recursive Context:** Clicking into a card establishes that object as the new top-level context. This allows the user to traverse deep hierarchies without changing the UI paradigm or losing focus.
*   **Schema-Driven Extensions:** While the default view is a raw recursive editor, the app supports specialized "Projections." By detecting specific schema definitions within the JSON, HolonDeck can render domain-specific views—such as Tech Trees or Gantt charts—while ensuring all edits round-trip strictly back to the underlying JSON document.

