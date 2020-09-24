const dummyWS = { send: () => {} };
let ws = dummyWS;

// If the window disconnects from the server, poll until it comes back and reload
function watchAndReload() {
  if (window.location.pathname === '/') {
    const TIMEOUT = 10000;
    function reload() {
      const req = new XMLHttpRequest();
      req.open('GET', window.location);
      req.onreadystatechange = function() {
        if (req.readyState === 4) {
          if (req.status === 200) {
            window.location.reload();
          }
          else {
            setTimeout(reload, TIMEOUT);
          }
        }
      }
      req.timeout = TIMEOUT;
      try {
        req.send(null);
      }
      catch (_) {
      }
    }
    setTimeout(reload, TIMEOUT);
  }
}

const onMessage = {
};

function runMessageManager() {
  ws = new WebSocket(`ws://${location.host}${location.pathname}ws${location.search}`);
  ws.addEventListener('close', () => {
    ws = dummyWS;
    watchAndReload();
  });
  ws.addEventListener('message', event => {
    const msg = JSON.parse(event.data);
    const fn = onMessage[msg.cmd];
    if (fn) {
      fn(msg);
    }
  });
}

const psend = {};
function send(cmd, value, delay) {
  clearTimeout(psend[cmd]);
  if (delay !== undefined) {
    psend[cmd] = setTimeout(() => {
      send(cmd, value);
    }, delay * 1000);
  }
  else {
    ws.send(JSON.stringify({
      cmd: cmd,
      value: value
    }));
  }
}

onMessage['html.update'] = msg => {
  const node = document.getElementById(msg.value.id);
  if (node) {
    const active = document.activeElement;
    node.innerHTML = msg.value.html;
    if (active && active.id) {
      const elem = document.getElementById(active.id);
      if (elem && elem != active) {
        elem.replaceWith(active);
        active.focus();
      }
    }
    const scripts = node.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      eval(scripts[i].innerText);
    }
  }
}

function deviceLogin(id) {
  const modal = document.getElementById(`login-modal-${id}`);
  const username = modal.querySelector('.device-username');
  const password = modal.querySelector('.device-password');
  const auth = {
    id: id,
    username: username ? username.value : undefined,
    password: password ? password.value : undefined
  };
  send('device.authenticate', auth);
}

function createVlan() {
  send('network.vlan.create', {
    name: document.querySelector('.vlan-create-name').value,
    id: document.querySelector('.vlan-create-id').value
  });
}

onMessage['modal.hide'] = msg => {
  $(msg.value.selector).modal('hide');
}

onMessage['device.details.summary.update'] = msg => {
  let details = document.querySelector('.device-details-container');
  let builder = document.createElement('tbody');
  builder.innerHTML = msg.value.html;
  if (msg.value.key) {
    details = details.querySelector(msg.value.key);
    builder = builder.querySelector(msg.value.key);
  }
  else {
    details = details.firstElementChild;
    builder = builder.firstElementChild;
  }
  details.replaceWith(builder);
}

const MAX_CAPTURE_PACKETS = 200;
onMessage['capture.packet'] = msg => {
  const win = document.getElementById('capture-window-content');
  if (win) {
    const builder = document.createElement('tbody');
    builder.innerHTML = msg.value.html;
    builder.firstElementChild.raw = msg.value.raw;
    win.appendChild(builder.firstElementChild);
    if (win.childElementCount > MAX_CAPTURE_PACKETS) {
      win.firstElementChild.nextElementSibling.remove();
    }
    win.scrollTo(0, win.scrollHeight);
  }
}

const GraphConfig = {
  colors: [ '#488a29', '#c0b125', '#347794' ]
};

const dxs = {};
function collectDx(id, fn) {
  const old = dxs[id];
  const q = $(id);
  dxs[id] = () => fn.apply(q);
  if (old) {
    old();
  }
}

window.addEventListener('pageshow', runMessageManager);
window.addEventListener('hashchange', evt => {
  const tab = location.hash.split('#')[1];
  send("tab.select", tab);
  document.querySelectorAll('#main-nav .active').forEach(e => e.classList.remove('active'));
  const link = document.querySelector('#main-nav .nav-link[href="' + location.hash + '"]');
  if (link) {
    link.parentElement.classList.add('active');
  }
});
location.hash = '#overview.viz';
