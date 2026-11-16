# MIDIum Mobile — offline Mac application

Additional native macOS package of the unchanged FREE V1.5 instrument, commit `656258c0156f369fd39e43942d8dfeb0aa55dd09`. Public websites are unchanged. The release is preserved at tag `free-v1.5-verified-20261116`; recording remains preserved separately on `backup/v1.5-recording-for-future-pro`.

The Cocoa application embeds WKWebView and bundles the mobile UI, shared engine, fonts and notation/PDF libraries. Its in-process asset loader listens only on 127.0.0.1 at an automatically selected port, providing the secure local origin required by Web Audio worklets. There is no separate development server, browser, Python runtime or user setup. A content-security policy blocks external network resources; all instrument assets are local. Navigation outside the application is blocked. MIDI/MusicXML/PDF downloads use a native Save dialog. No recording is added.

Build on an Apple Silicon Mac with Apple command-line tools using `python3 macos/build.py`. This creates `macos/build/MIDIum Mobile.app`, targeting macOS 13 or newer, with an application icon and local ad-hoc signature. The build does not change any web files. The application requires neither Python nor build tools after packaging. It is not Apple Developer ID signed or notarised; distribution to other Macs would require that additional release work.

The `--self-test` diagnostic runs inside the real native app/WebKit process, with external resource access blocked. It measures output samples, checks presets, colour editing/FREE PLAY, STOP silence, notation, and saves sample MIDI/MusicXML/PDF exports to `/tmp/midium-native-exports`. It does not enable recording. The diagnostic report is `/tmp/midium-native-test.json`. Ordinary launches show only the instrument.

Physical listening and manual trackpad gestures are separate from automated native checks. No PRO development copies have been created.
