# Todo + Calendar (Offline)

A minimal offline-first todo app aligned with a calendar view.

## Features

- Add tasks with date and time.
- Calendar month view with task days highlighted.
- Missed-time detection (overdue tasks are marked).
- Browser notifications when a task time is missed (after permission is enabled).
- Daily notes section with date-based saving (notes are stored by date).
- Light/Dark theme toggle button:
  - Light mode shows 🌞 on the switch.
  - Dark mode shows 🌙 on the switch.
- Local-first storage via `localStorage`.
- Offline support using a service worker cache.

## Run

Any static server works:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Notes

- Notification checks run every minute while the app is open.
- Because this is a browser-based offline app, notifications rely on browser capabilities and permission settings.
