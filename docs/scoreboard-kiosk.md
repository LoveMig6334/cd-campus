# Scoreboard kiosk setup (hall display)

The public board lives at `/scoreboard`. It is read-only, sized for a
1920×1080 screen, and needs no login.

## Launch in kiosk mode

**Windows** (create a shortcut, drop it in `shell:startup` so it survives a
reboot):

```
chrome --kiosk --noerrdialogs --disable-session-crashed-bubble "https://<host>/scoreboard"
```

**macOS**:

```
open -a "Google Chrome" --args --kiosk --noerrdialogs --disable-session-crashed-bubble "https://<host>/scoreboard"
```

Exit kiosk mode with `Alt+F4` (Windows) / `Cmd+Q` (macOS).

## Machine settings

- Set the display to 1920×1080 at 100% scale.
- Disable sleep, screen dimming, and the screensaver for the event day.
- Prefer wired ethernet. The board tolerates brief Wi-Fi drops, but a
  captive-portal network that silently expires will strand it on the
  reconnecting badge.

## What the page does on its own

- Scores update live (~1s after the admin's tap) — no refresh needed.
- If the connection drops, a small "RECONNECTING · กำลังเชื่อมต่อ" badge
  appears bottom-right and the last known score stays on screen; it
  reconnects and catches up automatically.
- If the machine reboots mid-match, reopening `/scoreboard` restores the
  full current state from the server.
- `F5` is the universal manual fix if anything ever looks stuck.
