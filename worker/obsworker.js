var id = {};

function start(source, timer) {
  const handle = id[source];
  if (handle) {
    clearTimeout(id[source]);
  }
  id[source] = setTimeout(() => {
    postMessage({ source: source });
  }, timer);
};

onmessage = (e) => {
  start(e.data['source'], e.data['timer']);
};
