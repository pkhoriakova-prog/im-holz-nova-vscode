# Production domain URL correction — 2026-10-28

Scope: imholz.at Oxygen data only; replace dev.imholz.at with imholz.at while preserving the existing escaped URL representation.

Backups:
- Oxygen settings: migration-oxygen-settings-backup-2026-10-28.json in this workspace.
- Original 184 matching Oxygen metadata rows: /data/8/1/811081e9-a2ab-4ed3-860c-f95383619822/imholz.at/web/wp-content/migration-oxygen-data-backup-2026-10-28-n9X0jLNgt11c.php on the production server. PHP exit guard followed by base64-encoded JSON.

The native Oxygen replace-url tool matched zero rows because the URLs were stored with escaped slashes. The fallback replaced only the domain in matching _oxygen_data metadata rows, preserving the rest of each value, and invalidated the corresponding metadata caches.

Results: 184 metadata rows updated (including revision backups), 2443 domain occurrences replaced, zero remaining dev-domain occurrences in Oxygen data. Oxygen regenerated global CSS and 47 posts. All 99 CSS files inspected contained no dev.imholz.at reference.

Search indexing setting blog_public remains 0, as outside the requested scope.
