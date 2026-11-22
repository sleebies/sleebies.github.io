/* sleepyz2002 music player
 *
 * How it keeps playing between pages: the first page you open turns itself
 * into a "shell" that holds the player bar plus a full-size frame. Every page
 * you click to after that loads inside the frame, so the player never reloads.
 * The address bar still updates, so links to any page keep working.
 *
 * The song list lives in songs.js. Restyle the player in style.css (look for
 * "music player"). Every control has an id starting with "mp-".
 *
 * Browsers won't play sound until the visitor clicks something, so the site
 * opens on a splash screen (#mp-splash). Clicking it fades the splash out and
 * fades the music in, starting partway through a random song.
 */
(function () {
  var script = document.currentScript;
  var SITE_ROOT = new URL('.', script.src).href;

  /* ---------- inside the frame: just report where we are ---------- */
  if (window.top !== window) {
    var report = function () {
      parent.postMessage({ sleepyz: 'page', href: location.href, title: document.title }, '*');
    };
    report();
    window.addEventListener('hashchange', report);
    // Links to other websites open in a new tab instead of inside the frame.
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target) return;
      if (/^https?:$/.test(a.protocol) && a.origin !== location.origin) {
        a.target = '_blank';
        a.rel = 'noopener';
      }
    }, true);
    return;
  }

  /* ---------- top level: become the shell ---------- */
  var hide = document.createElement('style');
  hide.textContent = 'body{visibility:hidden}';
  document.head.appendChild(hide);

  document.addEventListener('DOMContentLoaded', function () {
    var SONGS = window.SONGS || [];
    var BASE = new URL(window.MUSIC_BASE || 'music/', SITE_ROOT).href;

    document.body.innerHTML =
      '<iframe id="mp-page" title="page"></iframe>' +
      '<div id="mp-bar">' +
        '<button id="mp-prev" type="button">prev</button>' +
        '<button id="mp-play" type="button">play</button>' +
        '<button id="mp-next" type="button">next</button>' +
        '<span id="mp-title"></span>' +
        '<span id="mp-cur">0:00</span>' +
        '<input id="mp-seek" type="range" min="0" max="1000" value="0" aria-label="seek">' +
        '<span id="mp-dur">0:00</span>' +
        '<button id="mp-mute" type="button" aria-label="mute" aria-pressed="false">' +
          '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor"/>' +
          '<path class="mp-waves" d="M11 5.5a3.5 3.5 0 0 1 0 5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>' +
        '</button>' +
        '<input id="mp-volume" type="range" min="0" max="100" value="70" aria-label="volume">' +
        '<button id="mp-muffle" type="button" aria-pressed="false">muffle</button>' +
        '<button id="mp-list-toggle" type="button">songs</button>' +
        '<ol id="mp-list" hidden></ol>' +
      '</div>' +
      '<div id="mp-splash" role="button" tabindex="0"><span id="mp-enter">click to enter</span></div>';
    document.body.classList.add('mp-shell');
    hide.remove();

    var $ = function (id) { return document.getElementById(id); };
    var frame = $('mp-page');
    frame.src = location.href;

    var audio = new Audio();
    audio.preload = 'auto';
    // Songs hosted on another site need this so the muffle effect can hear them.
    if (/^https?:/.test(BASE) && new URL(BASE).origin !== location.origin) audio.crossOrigin = 'anonymous';

    /* --- remember a little between visits (safe if storage is blocked) --- */
    var store = {
      get: function (k) { try { return JSON.parse(localStorage.getItem('mp-' + k)); } catch (e) { return null; } },
      set: function (k, v) { try { localStorage.setItem('mp-' + k, JSON.stringify(v)); } catch (e) {} }
    };

    /* --- shuffled order: every song once before repeats, no back-to-back --- */
    var order = [], pos = -1;
    function reshuffle(avoid) {
      var d = SONGS.map(function (_, i) { return i; });
      for (var i = d.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = d[i]; d[i] = d[j]; d[j] = t;
      }
      if (d.length > 1 && d[0] === avoid) { var t2 = d[0]; d[0] = d[d.length - 1]; d[d.length - 1] = t2; }
      return d;
    }

    var current = -1;
    function load(index, autoplay) {
      if (!SONGS.length) return;
      current = index;
      audio.src = BASE + encodeURIComponent(SONGS[index].file);
      $('mp-title').textContent = SONGS[index].title;
      var items = $('mp-list').children;
      for (var i = 0; i < items.length; i++) items[i].classList.toggle('on', i === index);
      store.set('song', index);
      if (autoplay) play();
    }
    function next() {
      pos++;
      if (pos >= order.length) { order = reshuffle(current); pos = 0; }
      load(order[pos], true);
    }
    function prev() {
      if (audio.currentTime > 3 || pos <= 0) { audio.currentTime = 0; return; }
      pos--;
      load(order[pos], true);
    }

    /* --- play / pause --- */
    function play() {
      if (ctx && ctx.state === 'suspended') ctx.resume();
      var p = audio.play();
      if (p && p.catch) p.catch(function () { /* blocked until first click */ });
    }
    $('mp-play').onclick = function () {
      if (audio.paused) play(); else audio.pause();
    };
    audio.onplay = function () { $('mp-play').textContent = 'pause'; };
    audio.onpause = function () { $('mp-play').textContent = 'play'; };
    audio.onended = next;
    audio.onerror = function () { setTimeout(next, 1000); }; // skip a missing/broken file
    $('mp-next').onclick = next;
    $('mp-prev').onclick = prev;

    /* --- time + seek --- */
    function fmt(s) { s = Math.floor(s || 0); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
    var seeking = false;
    audio.ontimeupdate = function () {
      $('mp-cur').textContent = fmt(audio.currentTime);
      $('mp-dur').textContent = fmt(audio.duration);
      if (!seeking && audio.duration) $('mp-seek').value = Math.round(audio.currentTime / audio.duration * 1000);
    };
    $('mp-seek').oninput = function () { seeking = true; };
    $('mp-seek').onchange = function () {
      if (audio.duration) audio.currentTime = this.value / 1000 * audio.duration;
      seeking = false;
    };

    /* --- volume --- */
    var vol = store.get('volume');
    if (typeof vol === 'number') $('mp-volume').value = vol;
    audio.volume = $('mp-volume').value / 100;
    var fading = 0;
    $('mp-volume').oninput = function () {
      cancelAnimationFrame(fading);
      audio.volume = this.value / 100;
      store.set('volume', +this.value);
    };
    $('mp-mute').onclick = function () {
      audio.muted = !audio.muted;
      this.setAttribute('aria-pressed', audio.muted ? 'true' : 'false');
      this.classList.toggle('on', audio.muted);
    };
    // smoothly bring the volume from 0 up to the slider's level
    function fadeIn(seconds) {
      var target = $('mp-volume').value / 100, t0 = performance.now();
      audio.volume = 0;
      (function step(now) {
        var k = Math.min(1, (now - t0) / (seconds * 1000));
        audio.volume = target * k * k;      // eased, so it creeps in
        if (k < 1) fading = requestAnimationFrame(step);
      })(t0);
    }

    /* --- muffle: "music in the other room" via a low-pass filter --- */
    var ctx = null, filter = null;
    function setMuffle(on) {
      if (on && !ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 0.7;
        ctx.createMediaElementSource(audio).connect(filter);
        filter.connect(ctx.destination);
      }
      if (filter) filter.frequency.setTargetAtTime(on ? 500 : 22000, ctx.currentTime, 0.15);
      $('mp-muffle').setAttribute('aria-pressed', on ? 'true' : 'false');
      $('mp-muffle').classList.toggle('on', on);
      store.set('muffle', on);
    }
    $('mp-muffle').onclick = function () { setMuffle($('mp-muffle').getAttribute('aria-pressed') !== 'true'); };

    /* --- song list --- */
    SONGS.forEach(function (s, i) {
      var li = document.createElement('li');
      li.textContent = s.title;
      li.onclick = function () { pos = order.indexOf(i); load(i, true); };
      $('mp-list').appendChild(li);
    });
    $('mp-list-toggle').onclick = function () { $('mp-list').hidden = !$('mp-list').hidden; };

    /* --- frame keeps the address bar and tab title in sync --- */
    window.addEventListener('message', function (e) {
      if (e.source !== frame.contentWindow || !e.data) return;
      if (e.data.sleepyz === 'page') {
        document.title = e.data.title;
        try { history.replaceState(null, '', e.data.href); } catch (err) {}
      }
    });

    /* --- splash: the click that lets the browser play sound --- */
    var splash = $('mp-splash'), entered = false;
    function enter() {
      if (entered) return;
      entered = true;
      splash.classList.add('gone');                         // CSS fades it out
      setTimeout(function () { splash.remove(); }, 1500);
      if (!SONGS.length) return;
      if (store.get('muffle') === true) setMuffle(true);
      var begin = function () {
        // start somewhere between 15% and 60% into the song so it fades in mid-flow
        if (audio.duration) audio.currentTime = audio.duration * (0.15 + Math.random() * 0.45);
        fadeIn(4);
        play();
      };
      if (audio.readyState >= 1) begin(); else audio.addEventListener('loadedmetadata', begin, { once: true });
    }
    splash.addEventListener('click', enter);
    splash.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter(); } });

    if (SONGS.length) {
      order = reshuffle(-1);
      pos = 0;
      load(order[0], false);
    } else {
      $('mp-title').textContent = 'no songs yet';
    }
  });
})();
