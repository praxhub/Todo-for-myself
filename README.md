# Todo + Calendar (Offline)

A minimal offline-first todo app aligned with a calendar view.

## Features

- Add tasks with date and time.
- Recurring tasks (`daily`, `weekly`, `monthly`) that auto-create the next occurrence when you mark one as done.
- Calendar month view + week view switch.
- Missed-time detection (overdue tasks are marked).
- Browser notifications when a task time is missed (after permission is enabled).
- Reminder sound options (`off`, `beep`, `chime`) with a test button.
- Daily notes section with date-based saving.
- Rich note formatting toolbar:
  - Bold (`**text**`)
  - Italic (`*text*`)
  - Heading (`###`)
  - Bullet list (`- item`)
  - Live formatted preview panel
- Light/Dark theme toggle button:
  - Light mode shows 🌞 on the switch.
  - Dark mode shows 🌙 on the switch.
- Local-first storage via `localStorage`.
- Offline support using a service worker cache.

## Run locally

Any static server works:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Deploy guide

### Linux deployment (systemd + Nginx)

1. Copy app files to a directory, for example `/var/www/todo-calendar`.
2. Install Nginx:

```bash
sudo apt update
sudo apt install -y nginx
```

3. Configure Nginx site `/etc/nginx/sites-available/todo-calendar`:

```nginx
server {
  listen 80;
  server_name _;

  root /var/www/todo-calendar;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

4. Enable site and restart:

```bash
sudo ln -s /etc/nginx/sites-available/todo-calendar /etc/nginx/sites-enabled/todo-calendar
sudo nginx -t
sudo systemctl restart nginx
```

5. Open your server IP in browser.

### Windows deployment (IIS)

1. Enable IIS:
   - Open **Turn Windows features on or off**.
   - Enable **Internet Information Services**.
2. Copy app files to `C:\inetpub\wwwroot\todo-calendar`.
3. Open **IIS Manager**:
   - Right-click **Sites** → **Add Website**.
   - Physical path: `C:\inetpub\wwwroot\todo-calendar`.
   - Bind to your desired port (e.g. 80 or 8080).
4. Start the site and open it in browser.

### Quick temporary static serving on Windows (PowerShell)

```powershell
cd C:\path\to\Todo-for-myself
py -m http.server 4173
```

Then open <http://localhost:4173>.

## Notes

- Notification checks run every minute while the app is open.
- Browser notification and sound playback behavior can be affected by browser permissions and autoplay policies.
