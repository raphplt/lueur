/* Minimal Skia mock for component tests: drawing is not tested here, behaviour is. */
const React = require('react');

const Null = () => null;
const Canvas = ({ children }) => React.createElement('Canvas', null, children);
const pathStub = () => ({ moveTo() {}, lineTo() {}, build: () => ({}), close() {} });

module.exports = new Proxy(
  {
    __esModule: true,
    Canvas,
    Skia: {
      Path: { MakeFromSVGString: () => ({}), Make: pathStub },
      PathBuilder: { Make: pathStub },
    },
    vec: (x, y) => ({ x, y }),
    rect: (x, y, width, height) => ({ x, y, width, height }),
    rrect: (r, rx, ry) => ({ rect: r, rx, ry }),
  },
  { get: (target, key) => (key in target ? target[key] : Null) },
);
