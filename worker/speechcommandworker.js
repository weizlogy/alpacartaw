var id = -1;

function start(timer) {
  id = setInterval(() => {
    postMessage({});
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

    default:
      break;
  }
};
