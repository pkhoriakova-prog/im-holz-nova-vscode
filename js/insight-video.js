/* Insight cards with a video: the card shows a still frame; under the cursor (or
   the keyboard focus) the picture grows, as every photograph on the site does,
   and the video plays, silent and on a loop. It stops and returns to the still
   frame when the cursor leaves. Nothing plays for those who ask for less motion. */
(function () {
  var cards = Array.prototype.slice.call(document.querySelectorAll('.bb-insight__link'));
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm) return;
  cards.forEach(function (card) {
    var video = card.querySelector('.bb-insight__video');
    if (!video) return;
    function play() { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    function stop() { video.pause(); video.currentTime = 0; }
    card.addEventListener('mouseenter', play);
    card.addEventListener('focus', play);
    card.addEventListener('mouseleave', stop);
    card.addEventListener('blur', stop);
  });
})();
