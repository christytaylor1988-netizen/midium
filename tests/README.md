# Desktop/mobile alignment validation — 16 November 2026

## Inspected baseline and backup

Repository main: `87716ac72b427aa378f60bab298d2daed587240b` (Mobile V1.4). Desktop was still MK2/V1.0: its HTML last changed at `e004de509bc315b603d3a42a501c516b64ba1354`, audio at `56c6e12c6c9b89fd9b48a2467e3cd62405a9e773`. Mobile audio last changed at `85ff25aa7bbb029c7a2c55cf193ec927d0921331`. Matching local production files contained no additional changes. Neither version had recording.

Both local versions were archived before edits; git tag `before-parity-20261116` preserves the published baseline.

## Implementation decisions

The newer mobile V1.4 synthesis, CRUSH clouds, automatic/manual stutter, pitch echo, reverb and colour/preset algorithms are canonical. These DSP modules are unchanged apart from import paths/cache identifiers. The engine adds only a silent, post-output recording tap. Desktop EQ, text/mapping/time-scale controls, score navigation and MIDI/MusicXML/PDF exports are exposed in both interfaces. No saved-project format or persisted settings implementation was present in either baseline; existing note/export formats remain unchanged.

Both interfaces now execute the same controller and parameter definitions. Dropdown options, 51 numeric/select controls, clean black startup, all three presets and FREE PLAY were compared directly. Desktop has an extra duplicate Master Volume slider; it controls the same parameter. Both PITCH sliders stay synchronised.

## Audio discontinuity findings

The retained V1.4 fixes address completed automation ramps being restarted without a current-value anchor, live chorus/texture/drone gain discontinuities and retiring reverb paths being cut off. Pitch uses short exponential target transitions in cents, shared by active source and echo voices. Delay uses crossfaded read heads; reverb retains its bounded convolver crossfade. CRUSH character and level compensation are unchanged. No global muffling or control-change muting was added.

Before/after probes against V1.3 reproduced a 1,066.7-cent single-sample automation jump. The shared current path limited the largest per-sample pitch change to 6.14 cents during deliberately extreme sweeps. Isolated gain-edge steps fell from 0.386 to 0.000729 (chorus), 0.941 to 0.00260 (texture bypass), 0.0768 to 0.000075 (drone), and 0.784 to 0.000260 (retiring hall path). These are diagnostic constant-input probes, not sound-quality scores.

## Automated checks performed

- Chromium: both interfaces, preset/colour/slider state, identical defaults and generated notes, playback continuity, stutter activation/release, sheet-page navigation, TEXT view and exports.
- MIDI and MusicXML downloads were byte-identical between interfaces. Both PDF exports were generated successfully.
- Stereo 44.1 kHz, 16-bit WAVs recorded live preset, colour and pitch changes, followed by STOP tails. Independent recording before PLAY, STOP while recording, recording during an existing STOP fade, and restart during STOP fade were checked.
- Offline audio rendering at 44.1/48 kHz, one and 24 overlapping sustained voices; rapid +/-12-semitone reversals; isolated gain/crossfade probes; explicit first/second sample-difference checks. Current Chromium probes passed their discontinuity bounds.
- A 60.05-second live capture with 2,998 hue/pitch transactions remained running with no JavaScript errors. Peak was 0.1555 full scale, zero clipped samples, no silent one-second windows; maximum first/second sample differences were 0.01770 / 0.00394. Intentional noise/stutter makes these full-mix differences unsuitable as a universal click detector.
- STOP envelope measured about 0.5 halfway through its 1.5-second fade and reached zero at completion.
- WebKit 26.0 automation: first PLAY, processed audio capture and a valid 44.1 kHz stereo WAV; phone-style file-sharing payload verified with a test stub. Pitch/chorus offline probes completed; the full offline worklet probe did not finish in this WebKit environment, so it is not reported as passing.
- Layouts inspected at 320/375/430 px phone widths and 1366x768 / 1440x900 desktop sizes. No horizontal overflow. Very short desktop windows can scroll to keep every control accessible.

## Limitations

No physical iPhone, Safari Save to Files interaction, or subjective comparative listening was performed. Automation cannot prove that every audible pop is gone on a physical phone. Ten-minute takes and prolonged background interruptions were not real-device tested. Latest Firefox was not tested in this environment.

## Reproduction

Serve the repository root over localhost. Open `tests/audio-probes.html` and run the probes in Chromium; results include PCM discontinuity metrics and a final `pass` flag. This is an isolated test page; it never changes the instrument page.

For browser integration checks, `regression.cjs` exports `async (playwrightBrowser, outputRoot, baseURL)`. It runs both layouts, temporarily exposes controller state through a test-only response interception, and writes reports and downloads below `outputRoot/MIDIum-parity-tests/`. Production files contain no test-state export. `stress.cjs` exports the same browser/root arguments and runs the one-minute stress capture against localhost port 8770. Playwright is a development test dependency, not part of the delivered application.
