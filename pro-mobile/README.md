# MIDIum Mobile PRO V0.1

Independent development foundation copied from verified Mobile FREE V1.5, commit `656258c0156f369fd39e43942d8dfeb0aa55dd09`.

Only the development name/version and local resource paths differ. No recording, new effects, or desktop PRO have been added. Existing root desktop and `/mobile/` files remain FREE and unchanged.

All PRO runtime files are inside this directory, including its own `shared/` engine, presets, colour mappings, fonts and vendor libraries. Future PRO work must stay inside `pro-mobile/`; do not edit the FREE copies in the repository root. No PRO module imports the FREE engine.

Branch: `mobile-pro-v0.1`. Working directory: `MIDIum-Mobile-PRO`. Serve the repository root and open `/pro-mobile/`, or serve this directory directly. No build step.

The offline Mac FREE application remains on branch `offline-mac-v1.5` (`1241790`). The recording implementation remains on `backup/v1.5-recording-for-future-pro` (`0c6abd9`); it has not been restored here. The pre-PRO state is additionally preserved at `backup-before-mobile-pro-20261116`.

This development branch is not the GitHub Pages publishing branch. No public website deployment is part of this task.

## Foundation verification — 16 November 2026

Automated Chromium checks passed: 51 matching controls/ranges/defaults, identical 316-note startup composition, all original presets, colour/slider synchronisation, FREE PLAY behaviour, continuous playback, HOLD STUTTER activation/release, 1.5-second STOP fade, restart during fade, piano/text/notation views, score navigation and MIDI/MusicXML/PDF exports. No JavaScript errors. Runtime requests stayed entirely within `/pro-mobile/`; no FREE engine dependencies. No recording controls exist. Physical iPhone listening was not repeated for this unchanged engine.
