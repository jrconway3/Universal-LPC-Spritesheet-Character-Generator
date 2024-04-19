const animationRowsLayout = {
  "thrust-n": 3,
  "thrust-w": 4,
  "thrust-s": 5,
  "thrust-e": 6,
  "walk-n": 7,
  "walk-w": 8,
  "walk-s": 9,
  "walk-e": 10,
  "slash-n": 11,
  "slash-w": 12,
  "slash-s": 13,
  "slash-e": 14,
  "idle-n": 20,
  "idle-w": 21,
  "idle-s": 22,
  "idle-e": 23,
  "run-n": 24,
  "run-w": 25,
  "run-s": 26,
  "run-e": 27,
  "jump-n": 28,
  "jump-w": 29,
  "jump-s": 30,
  "jump-e": 31,
  "sit-n": 32,
  "sit-w": 33,
  "sit-s": 34,
  "sit-e": 35,
}

const customAnimations = {
  tool_rod: {
    frameSize: 128,
    frames: [
      ["thrust-n,0", "thrust-n,1", "thrust-n,2", "thrust-n,3", "thrust-n,4", "thrust-n,5", "thrust-n,4", "thrust-n,4", "thrust-n,4", "thrust-n,5", "thrust-n,4", "thrust-n,2", "thrust-n,3"],
      ["thrust-w,0", "thrust-w,1", "thrust-w,2", "thrust-w,3", "thrust-w,4", "thrust-w,5", "thrust-w,4", "thrust-w,4", "thrust-w,4", "thrust-w,5", "thrust-w,4", "thrust-w,2", "thrust-w,3"],
      ["thrust-s,0", "thrust-s,1", "thrust-s,2", "thrust-s,3", "thrust-s,4", "thrust-s,5", "thrust-s,4", "thrust-s,4", "thrust-s,4", "thrust-s,5", "thrust-s,4", "thrust-s,2", "thrust-s,3"],
      ["thrust-e,0", "thrust-e,1", "thrust-e,2", "thrust-e,3", "thrust-e,4", "thrust-e,5", "thrust-e,4", "thrust-e,4", "thrust-e,4", "thrust-e,5", "thrust-e,4", "thrust-e,2", "thrust-e,3"],
    ]
  },
  slash_128: {
    frameSize: 128,
    frames: [
      ["slash-n,0", "slash-n,1", "slash-n,2", "slash-n,3", "slash-n,4", "slash-n,5"],
      ["slash-w,0", "slash-w,1", "slash-w,2", "slash-w,3", "slash-w,4", "slash-w,5"],
      ["slash-s,0", "slash-s,1", "slash-s,2", "slash-s,3", "slash-s,4", "slash-s,5"],
      ["slash-e,0", "slash-e,1", "slash-e,2", "slash-e,3", "slash-e,4", "slash-e,5"]
    ]
  },
  thrust_oversize: {
    frameSize: 192,
    frames: [
      ["thrust-n,0", "thrust-n,1", "thrust-n,2", "thrust-n,3", "thrust-n,4", "thrust-n,5", "thrust-n,6", "thrust-n,7"],
      ["thrust-w,0", "thrust-w,1", "thrust-w,2", "thrust-w,3", "thrust-w,4", "thrust-w,5", "thrust-w,6", "thrust-w,7"],
      ["thrust-s,0", "thrust-s,1", "thrust-s,2", "thrust-s,3", "thrust-s,4", "thrust-s,5", "thrust-s,6", "thrust-s,7"],
      ["thrust-e,0", "thrust-e,1", "thrust-e,2", "thrust-e,3", "thrust-e,4", "thrust-e,5", "thrust-e,6", "thrust-e,7"]
    ]
  },
  slash_oversize: {
    frameSize: 192,
    frames: [
      ["slash-n,0", "slash-n,1", "slash-n,2", "slash-n,3", "slash-n,4", "slash-n,5"],
      ["slash-w,0", "slash-w,1", "slash-w,2", "slash-w,3", "slash-w,4", "slash-w,5"],
      ["slash-s,0", "slash-s,1", "slash-s,2", "slash-s,3", "slash-s,4", "slash-s,5"],
      ["slash-e,0", "slash-e,1", "slash-e,2", "slash-e,3", "slash-e,4", "slash-e,5"]
    ]
  },
  walk_128: {
    skipFirstFrameInPreview: true,
    frameSize: 128,
    frames: [
      ["walk-n,0", "walk-n,1", "walk-n,2", "walk-n,3", "walk-n,4", "walk-n,5", "walk-n,6", "walk-n,7", "walk-n,8"],
      ["walk-w,0", "walk-w,1", "walk-w,2", "walk-w,3", "walk-w,4", "walk-w,5", "walk-w,6", "walk-w,7", "walk-w,8"],
      ["walk-s,0", "walk-s,1", "walk-s,2", "walk-s,3", "walk-s,4", "walk-s,5", "walk-s,6", "walk-s,7", "walk-s,8"],
      ["walk-e,0", "walk-e,1", "walk-e,2", "walk-e,3", "walk-e,4", "walk-e,5", "walk-e,6", "walk-e,7", "walk-e,8"]
    ]
  },
  thrust_128: {
    frameSize: 128,
    frames: [
      ["thrust-n,0", "thrust-n,1", "thrust-n,2", "thrust-n,3", "thrust-n,4", "thrust-n,5", "thrust-n,6", "thrust-n,7"],
      ["thrust-w,0", "thrust-w,1", "thrust-w,2", "thrust-w,3", "thrust-w,4", "thrust-w,5", "thrust-w,6", "thrust-w,7"],
      ["thrust-s,0", "thrust-s,1", "thrust-s,2", "thrust-s,3", "thrust-s,4", "thrust-s,5", "thrust-s,6", "thrust-s,7"],
      ["thrust-e,0", "thrust-e,1", "thrust-e,2", "thrust-e,3", "thrust-e,4", "thrust-e,5", "thrust-e,6", "thrust-e,7"]
    ]
  },
  slash_reverse_oversize: {
    frameSize: 192,
    frames: [
      ["slash-n,5", "slash-n,4", "slash-n,3", "slash-n,2", "slash-n,1", "slash-n,0"],
      ["slash-w,5", "slash-w,4", "slash-w,3", "slash-w,2", "slash-w,1", "slash-w,0"],
      ["slash-s,5", "slash-s,4", "slash-s,3", "slash-s,2", "slash-s,1", "slash-s,0"],
      ["slash-e,5", "slash-e,4", "slash-e,3", "slash-e,2", "slash-e,1", "slash-e,0"]
    ]
  },
  whip_oversize: {
    frameSize: 192,
    frames: [
      ["slash-n,0", "slash-n,1", "slash-n,4", "slash-n,5", "slash-n,3", "slash-n,2", "slash-n,2", "slash-n,1"],
      ["slash-w,0", "slash-w,1", "slash-w,5", "slash-w,4", "slash-w,3", "slash-w,3", "slash-w,3", "slash-w,2"],
      ["slash-s,0", "slash-s,1", "slash-s,5", "slash-s,4", "slash-s,3", "slash-s,3", "slash-s,2", "slash-w,1"],
      ["slash-e,0", "slash-e,1", "slash-e,5", "slash-e,4", "slash-e,3", "slash-e,3", "slash-e,3", "slash-e,2"]
    ]
  },
  tool_whip: {
    frameSize: 192,
    frames: [
      ["slash-n,0", "slash-n,1", "slash-n,4", "slash-n,5", "slash-n,3", "slash-n,2", "slash-n,2", "slash-n,1"],
      ["slash-w,0", "slash-w,1", "slash-w,5", "slash-w,4", "slash-w,3", "slash-w,3", "slash-w,3", "slash-w,2"],
      ["slash-s,0", "slash-s,1", "slash-s,5", "slash-s,4", "slash-s,3", "slash-s,3", "slash-s,2", "slash-s,1"],
      ["slash-e,0", "slash-e,1", "slash-e,5", "slash-e,4", "slash-e,3", "slash-e,3", "slash-e,3", "slash-e,2"]
    ]
  },
  idle: {
    frameSize: 64,
    frames: [
      ["idle-n,0", "idle-n,1"],
      ["idle-w,0", "idle-w,1"],
      ["idle-s,0", "idle-s,1"],
      ["idle-e,0", "idle-e,1"]
    ]
  },
  run: {
    frameSize: 64,
    frames: [
      ["run-n,0", "run-n,1", "run-n,2", "run-n,3", "run-n,4", "run-n,5", "run-n,6", "run-n,7"],
      ["run-w,0", "run-w,1", "run-w,2", "run-w,3", "run-w,4", "run-w,5", "run-w,6", "run-w,7"],
      ["run-s,0", "run-s,1", "run-s,2", "run-s,3", "run-s,4", "run-s,5", "run-s,6", "run-s,7"],
      ["run-e,0", "run-e,1", "run-e,2", "run-e,3", "run-e,4", "run-e,5", "run-e,6", "run-e,7"]
    ]
  },
  jump: {
    frameSize: 64,
    frames: [
      ["jump-n,0", "jump-n,1", "jump-n,2", "jump-n,3", "jump-n,4", "jump-n,1"],
      ["jump-w,0", "jump-w,1", "jump-w,2", "jump-w,3", "jump-w,4", "jump-w,1"],
      ["jump-s,0", "jump-s,1", "jump-s,2", "jump-s,3", "jump-s,4", "jump-s,1"],
      ["jump-e,0", "jump-e,1", "jump-e,2", "jump-e,3", "jump-e,4", "jump-e,1"]
    ]
  },
  sit: {
    frameSize: 64,
    frames: [
      ["sit-n,0"],
      ["sit-w,0"],
      ["sit-s,0"],
      ["sit-e,0"]
    ]
  },
}
