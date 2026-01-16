**HolonDeck** is a universal structured-data viewer and editor built with **Tauri 2.0, React, and TypeScript**. It treats any JSON object as a recursive "Card," allowing users to navigate complex data structures through a unified UI paradigm that functions identically at every depth of the document tree.

### Core User Experience: Recursive Cards
The application reimagines standard file tree navigation as a recursive drill-down interface.
*   **The Card Metaphor:** Every object is presented as a "Card" containing a compact summary (selected fields, truncated values) for lists, and a full inspection view for detailed editing.
*   **Recursive Context:** Clicking into a card establishes that object as the new top-level context. This allows the user to traverse deep hierarchies without changing the UI paradigm or losing focus.
*   **Schema-Driven Extensions:** While the default view is a raw recursive editor, the app supports specialized "Projections." By detecting specific schema definitions within the JSON, HolonDeck can render domain-specific views—such as Tech Trees or Gantt charts—while ensuring all edits round-trip strictly back to the underlying JSON document.

### Headless Architecture
To support this recursive, high-depth navigation efficiently, HolonDeck utilizes a **Headless Architecture** that decouples the data source from the UI.
*   **Backend (Rust):** Acts as a "JSON Database." It persists the document in a thread-safe state container and uses standard pointer logic (RFC 6901) to read and write specific nodes with O(1)-like access, rather than traversing the entire tree for every operation.
*   **Frontend (React + Zustand + Tailwind):** Acts strictly as a "Viewport Cache." Instead of mirroring the entire document, the frontend store maintains a navigation stack and maps specific file paths to loaded data, fetching only what is currently visible.

### The Data Protocol
To facilitate lazy loading and fluid navigation, the communication between the Rust backend and React frontend relies on a strict separation of data types:
1.  **The Summary Protocol:** Used for high-volume, low-weight list views. It returns metadata (key, data kind, child count) and a lightweight preview string, allowing the UI to render list items and navigation chevrons without parsing the full object.
2.  **The Detail Protocol:** Used for inspection and editing. This delivers the raw JSON for a specific node and its immediate schema context, triggered only when a user "drills down" into a card.

### Implementation Strategy
*   **State Management:** The frontend store uses a fetch-update-refresh cycle. It performs optimistic updates or standard invocations to Rust, then re-fetches the node to ensure consistency with the backend state. Components select only specific data slices to prevent unnecessary re-renders.
*   **Performance Optimization:** To maintain high frame rates, the backend avoids sending massive strings (e.g., >1MB text nodes) via IPC. Instead, it returns size markers, forcing the UI to request streams or slices only when necessary.
*   **Security & Capabilities:** As a Tauri 2.0 application, HolonDeck explicitly configures command capabilities to manage permissions for reading and writing nodes, ensuring secure interaction with the file system.
