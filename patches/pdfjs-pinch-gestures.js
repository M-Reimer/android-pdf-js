
// Pinch gesture workaround for Firefox for Android
// https://github.com/M-Reimer/android-pdf-js
(function AndroidPDFJSPinchGesture() {
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
      const start = PinchGestureDist(starttouches);
      const end = PinchGestureDist(endtouches);

      if (Math.abs(start - end) < 50)
        return;

      if (start > end)
        document.getElementById('zoomOut').click();
      else if (start < end)
        document.getElementById('zoomIn').click();

      starttouches = undefined;
      endtouches = undefined;
    }
  });
})();
