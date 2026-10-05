// Applies the saved theme before first paint (no white flash in a dark room). A separate file, not
// an inline script, so the Content-Security-Policy can forbid inline scripts.
try {
  var t = localStorage.getItem("lc-theme");
  if (t) document.documentElement.dataset.theme = t;
} catch (e) {}
