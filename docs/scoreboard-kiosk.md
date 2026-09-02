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

## Sound (buzzer + shot-clock horn)

The board plays the period buzzer and the shot-clock horn itself, so plug
the kiosk machine into the hall PA. The console's "Sound" buttons also
trigger the board remotely for a manual buzzer.

Browsers refuse to play audio until the page has been tapped once. If the
board shows a yellow "🔇 TAP TO ENABLE SOUND · แตะเพื่อเปิดเสียง" badge
bottom-left, tap or press any key on the kiosk once and it disappears. To
skip that step on an unattended machine (for example after a reboot
mid-match), add this flag to the launch command:

```
--autoplay-policy=no-user-gesture-required
```

Run a quick check before the first match: press a Sound button on the
console and confirm the sound comes from the hall speakers.

## Switching what the board shows

In the admin console (`/console/display`) you can flip the board between
the current match and the Sports Day main screen ("การแข่งขันกีฬาสี"). This
only changes the presentation — the match keeps its score and clock, so you
can switch back at any time. The flag lives in `site_config.scoreboard_display`
and the kiosk picks it up over Realtime.

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
