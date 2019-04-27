
// Pinch gesture workaround for Firefox for Android
// https://github.com/M-Reimer/android-pdf-js
(function AndroidPDFJSPinchGesture() {
  const STEP_DIST = 50;

  function PinchGestureDist(aTouches) {
    return Math.sqrt(Math.pow((aTouches[1].pageX - aTouches[0].pageX),2)+Math.pow((aTouches[1].pageY - aTouches[0].pageY),2));
  }

  let starttouches = undefined;
  let endtouches = undefined;
  document.addEventListener('touchstart',function(e) {
    if (e.touches.length === 2)
      starttouches = e.touches;
  },false);
  document.addEventListener('touchmove', function (e) {
    if (e.touches.length === 2)
      endtouches = e.touches;
  });
  document.addEventListener('touchend', function (e) {
    if (e.touches.length === 0 && starttouches && endtouches) {
      const d = PinchGestureDist(endtouches) - PinchGestureDist(starttouches);

      for (let loop = 0; loop < Math.abs(Math.floor(d / STEP_DIST)); loop++) {
        if (d < 0)
          document.getElementById('zoomOut').click();
        else if (d > 0)
          document.getElementById('zoomIn').click();
      }

      starttouches = undefined;
      endtouches = undefined;
    }
  });
})();
