export const PARAMETERS={
  "volume": {
    "min": 0.0,
    "max": 100.0,
    "step": 1.0,
    "value": 65.0
  },
  "speed": {
    "min": 0.125,
    "max": 4.0,
    "step": 0.025,
    "value": 1.0
  },
  "attack": {
    "min": 0.001,
    "max": 2.0,
    "step": 0.001,
    "value": 0.175
  },
  "release": {
    "min": 0.01,
    "max": 6.0,
    "step": 0.01,
    "value": 1.25
  },
  "chorus": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.0
  },
  "pitch": {
    "min": -12.0,
    "max": 12.0,
    "step": 0.1,
    "value": 0.0
  },
  "drift": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.0
  },
  "reverseTime": {
    "min": 0.1,
    "max": 5.0,
    "step": 0.01,
    "value": 0.6
  },
  "reverse": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.0
  },
  "delayTime": {
    "min": 0.01,
    "max": 2.5,
    "step": 0.01,
    "value": 0.35
  },
  "delayMix": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.0
  },
  "feedback": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.35
  },
  "crush": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.0
  },
  "warmth": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.6
  },
  "grain": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.35
  },
  "blend": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 1.0
  },
  "glitchAmount": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.0
  },
  "glitchRate": {
    "min": 5.0,
    "max": 250.0,
    "step": 1.0,
    "value": 25.0
  },
  "mix": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.18
  },
  "tone": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.5
  },
  "length": {
    "min": 0.5,
    "max": 8.0,
    "step": 0.1,
    "value": 3.4
  },
  "dry": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 1.0
  },
  "level": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.0
  },
  "echoDecay": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.35
  },
  "density": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.0
  },
  "echoPitch": {
    "min": -12.0,
    "max": 12.0,
    "step": 1.0,
    "value": 12.0
  },
  "echoFeedback": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.35
  },
  "echoWooze": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.0
  },
  "echoRandom": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.0
  },
  "amount": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 1.0
  },
  "droneLevel": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.25
  },
  "droneWooze": {
    "min": 0.0,
    "max": 1.0,
    "step": 0.01,
    "value": 0.0
  },
  "eqlow": {
    "min": -12.0,
    "max": 12.0,
    "step": 0.5,
    "value": 0.0
  },
  "eqmid": {
    "min": -12.0,
    "max": 12.0,
    "step": 0.5,
    "value": 0.0
  },
  "eqhigh": {
    "min": -12.0,
    "max": 12.0,
    "step": 0.5,
    "value": 0.0
  },
  "scale": {
    "min": 0.25,
    "max": 8.0,
    "step": 0.25,
    "value": 1.0
  }
};
export const DEFAULT_CONTROLS={eqlow:0,eqmid:0,eqhigh:0,"attack": 0.175, "release": 1.25, "chorus": 0, "pitch": 0, "speed": 1, "reverseTime": 0.6, "reverse": 0, "drift": 0, "crush": 0, "warmth": 0.6, "grain": 0.35, "blend": 1, "glitchAmount": 0, "glitchRate": 25, "delayTime": 0.35, "delayMix": 0, "feedback": 0.35, "mix": 0.18, "tone": 0.5, "length": 3.4, "echoPitch": 12, "echoRandom": 0, "echoFeedback": 0.35, "dry": 1, "level": 0, "echoDecay": 0.35, "echoWooze": 0, "density": 0.5, "amount": 1, "droneLevel": 0.25, "droneWooze": 0, "volume": 65, "echoScale": "follow", "echoInterval": "octaves", "echoPattern": "updown", "mode": "original", "droneNote": "auto", "octave": "low"};
