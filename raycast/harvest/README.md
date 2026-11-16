# Harvest Track

## Setup

1. Create a personal access token at <https://id.getharvest.com/developers>. Copy the token and Harvest account ID.
2. In this directory, run `npm install` then `npm run dev` to import the extension into Raycast.
3. Open **Track** in Raycast and enter the token and account ID in its preferences. The token goes in a password preference, never in this repository.
4. In Raycast Settings → Extensions → Harvest Track → Track, set the alias to **track**.
5. Run `track acme` the first time. Select the correct project/task and press **⌘S** to save the shortcut `acme`. Do the same for `atlas`. These shortcuts are local to this extension and account; Harvest's website favorites are not imported.

## Use

- `track acme` + Enter: immediately switch to the saved project/task.
- `track atlas` + Enter: switch again.
- `track stop` + Enter: stop your running Harvest timer.
- `track status` + Enter: show what's running.
- `track` + Enter: browse project/task assignments and saved shortcuts. Enter starts the selected timer; ⌘S saves a shortcut. The action menu also lets you remove shortcuts.

Typing an alias followed by a space moves to Raycast's argument field. An unknown shortcut opens a filtered picker, so it never guesses which task to charge. A matching saved shortcut starts only when you execute the command, not while typing.

Project/task assignments are cached on disk for 12 hours, and the user ID/timezone for 24 hours. After the first load the picker shows cached projects immediately; expired data stays visible while refreshing. Metadata is isolated by account and token, and the token itself is not stored in the cache. The current timer always refreshes from Harvest independently of the project list. **⌘R** forces a fresh profile, project list, and timer read. Starting a timer still validates the assignment with Harvest before stopping the previous timer. Saved shortcut commands skip loading the picker.

Switching explicitly stops your current timer and resumes today's latest unlocked entry with the same project/task and no notes, or starts a new entry. Entries with notes are preserved. Repeating the currently running shortcut leaves it running. Dates use your Harvest profile's timezone. Timer mode supports duration and start/end time tracking. All time-entry queries are scoped to the authenticated user, including administrator accounts.

If a switch fails after stopping the previous timer, the error tells you to check Harvest before retrying. Requests that change timers are never retried automatically. A network failure can leave the outcome uncertain.

## Checks

`npm run typecheck`, `npm test`, `npm run build`.

API references: [Harvest time entries](https://help.getharvest.com/api-v2/timesheets-api/timesheets/time-entries/), [project assignments](https://help.getharvest.com/api-v2/users-api/users/project-assignments/), [authentication](https://help.getharvest.com/api-v2/authentication-api/authentication/authentication/). Raycast [aliases](https://manual.raycast.com/command-aliases-and-hotkeys).
