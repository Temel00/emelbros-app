# Widget and profile-section component contract

Widgets and profile sections are React Server Components declared in the manifest (`widgets: [{ id, name, description, component }]`, `profileSections` likewise) and rendered inside a platform frame that owns the card chrome, a Suspense boundary, and an error boundary — one slow or crashed contribution never breaks the page.

A widget takes **zero props**: it is always about the current member and fetches its own data via the module's queries and the platform's current-member helper, so the dashboard never knows what any widget needs. A profile section takes **exactly one prop** — the viewed member's id — because it is about whoever's profile is open. A section returning `null` renders nothing, which is how RLS-invisible data disappears from profiles.

Widgets are a uniform card size in v1 (full width on phones, grid cells wider); size variants are a later addition, deliberately deferred until after the dashboard prototype.
