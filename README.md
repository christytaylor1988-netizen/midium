# MIDIum — LIE006

Prototype Development Copy V1.5 · Lorem Ipsum Editions

A browser musical typography instrument with matched desktop and mobile capabilities.

- [Desktop](https://christytaylor1988-netizen.github.io/midium/)
- [Mobile](https://christytaylor1988-netizen.github.io/midium/mobile/)

Type a phrase and press PLAY. Both interfaces use the same synthesis, effects, presets, colour mapping, notation modules in `shared/`. Desktop retains its seven visible effects groups; mobile retains its six effect tabs, with master EQ below them. Existing `js/` and `mobile/js/` module paths forward to the shared implementation.

Both support the same instrument library, typography/mapping controls, piano roll, sheet music, MIDI/MusicXML/PDF exports, live colour and pitch controls, sound presets, EQ. No FREE/PRO split has been made.

## Recording backup

Recording is unavailable in the published desktop and mobile versions. The complete working V1.5 capture, WAV encoder, controls and phone-sharing implementation is preserved at branch `backup/v1.5-recording-for-future-pro`, commit `0c6abd9ad7b801311a339b8df0bc01a6a4665c9d`. No PRO edition has been created.

## Development

Static HTML, CSS and JavaScript. All fonts and runtime libraries are bundled. No accounts, analytics, ads or external API services. Serve the repository root locally; open `/` or `/mobile/`. There is no build step.

`shared/parameters.js` defines control ranges/defaults; `shared/presets.js` and `shared/colour-sound.js` define sound configurations. Both interfaces load the same controller, engine, DSP. Avoid adding separate audio implementations to the layout directories.

See [validation notes](tests/README.md), THIRD-PARTY.txt and the bundled licence notices.
