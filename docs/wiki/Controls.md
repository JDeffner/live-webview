# Use the controls

Open Explorer in the **Extension Development Host** and expand **Live Webview**. Targets appear under their owner extension ID after the owner creates and registers them. Each row represents one live panel or resolved sidebar view.

## Daily workflow

1. Start your frontend watch task in the source window, then launch the target with F5. The supplied fixture starts its watcher through the launch task.
2. Open the target's normal panel command or expand its sidebar view.
3. Save a frontend JavaScript, TypeScript, or CSS change. Wait for the build to finish successfully.
4. Check the visible webview. In the fixture, the marker updates, the boot token changes, and the host round trip completes.
5. Stop debugging and terminate your watch task when finished. Live Webview does not manage build processes.

## Commands

Use the actions beside a target row or open the Command Palette with Ctrl+Shift+P. Palette commands ask you to select a registered target, so you can use them from the keyboard.

| Command | Effect |
| --- | --- |
| **Live Webview: Reload Target** | Reloads only the selected instance with a new revision token. It does not run a build. It works while paused, but a hidden target waits until visible. |
| **Live Webview: Pause Target** | Stops automatic reload for that instance. The newest pending successful build is retained. A callback already running may finish. |
| **Live Webview: Resume Target** | Enables automatic reload and applies the newest pending revision when visible. |
| **Live Webview: Open Logs** | Opens the Live Webview Output channel with build and reload diagnostics. |
| **Live Webview: Setup** | Opens the bundled setup guide. The empty target view also links to it. |

Two panels can share a build and still be paused or manually reloaded separately. Hiding a view never forces it to reveal or take focus. Closing it removes its registration and queued work.

## Status

| Text | Meaning and next action |
| --- | --- |
| Watching | Registered and waiting for a new build signal. This does not prove that a build process is running. |
| Reloading | The owner's reload callback is running. |
| Paused | Automatic reload is paused for this instance. Resume when ready. |
| Pending reveal | A revision is waiting for the target to become visible. |
| Build failed | The build reported an error, or its signal could not be read or validated. Check the row tooltip and logs. |
| Reload failed | The owner's callback or visibility check failed. Check the error, fix the cause, then retry. |

An in-flight reload or pause can take precedence over an error in the short status text. Use logs for the full sequence. A completed callback means HTML regeneration returned; only your application's own ready acknowledgement proves that the new frontend is running.
