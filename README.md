# MIDIum — LIE006

Prototype Development Copy V1.5 · Lorem Ipsum Editions

A browser musical typography instrument with matched desktop and mobile capabilities.

- [Desktop](https://christytaylor1988-netizen.github.io/midium/)
- [Mobile](https://christytaylor1988-netizen.github.io/midium/mobile/)

Type a phrase and press PLAY. Both interfaces use the same synthesis, effects, presets, colour mapping, notation and recording modules in `shared/`. Desktop retains its seven visible effects groups; mobile retains its six effect tabs, with master EQ below them. Existing `js/` and `mobile/js/` module paths forward to the shared implementation.

Both support the same instrument library, typography/mapping controls, piano roll, sheet music, MIDI/MusicXML/PDF exports, live colour and pitch controls, sound presets, EQ and stereo WAV recording. No FREE/PRO split has been made.

## Recording

RECORD captures only MIDIum's processed output, including looping, effects, master volume and the STOP fade. It does not request microphone access. Recording and playback have separate stop controls.

STOP RECORDING prepares a stereo, 16-bit PCM WAV at the AudioContext's sample rate. DOWNLOAD WAV downloads on desktop; supported touch browsers open the file share sheet, where Save to Files can be selected. Each file has a 5 ms boundary fade; this does not alter live playback. Encoding runs in a worker.

Keep the app visible while recording. Backgrounding ends the take. Takes automatically finish at 10 minutes to bound memory use. Interrupted audio can leave a short final partial capture block unavailable; already received samples remain exportable. AudioWorklet support and HTTPS (or localhost) are required.

## Development

Static HTML, CSS and JavaScript. All fonts and runtime libraries are bundled. No accounts, analytics, ads or external API services. Serve the repository root locally; open `/` or `/mobile/`. There is no build step.

`shared/parameters.js` defines control ranges/defaults; `shared/presets.js` and `shared/colour-sound.js` define sound configurations. Both interfaces load the same controller, engine, DSP and recorder. Avoid adding separate audio implementations to the layout directories.

See [validation notes](tests/README.md), THIRD-PARTY.txt and the bundled licence notices.
