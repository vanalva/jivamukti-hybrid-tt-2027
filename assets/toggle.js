// Banner cards: swap the preview between the "Apply now" and "Find out more" versions.
document.querySelectorAll('[data-banner]').forEach(function (card) {
  var img = card.querySelector('img');
  var link = card.querySelector('.card-media');
  var buttons = card.querySelectorAll('.toggle button');
  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var which = btn.getAttribute('data-show');
      img.src = img.getAttribute('data-' + which);
      link.href = card.querySelector(which === 'apply' ? '.actions .btn:not(.ghost)' : '.actions .btn.ghost').getAttribute('href');
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
    });
  });
});
