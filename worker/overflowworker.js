var id = -1;
var timerid = -1;

function start(timer) {
  console.log('overflow start', timer);

  id = setInterval((timer) => {
    postMessage({ command: 'interval', timer: timer });
  }, timer, timer);
};

function timerStart(timer) {
  console.log('overflow start timer', timer);

  timerid = setTimeout(() => {
    postMessage({ command: 'timer' });
  }, timer);
};

onmessage = (e) => {
  switch (e.data['command']) {
    case 'start':
      start(e.data['timer']);
      break;
    case 'clear':
      clearInterval(id);
      break;

    case 'timerstart':
      timerStart(e.data['timer']);
      break;
    case 'timerclear':
      clearTimeout(timerid);
      break;

    default:
      break;
  }
};
