var id = -1;

var items = [];

function start(timer) {

  if (id != -1) {
    clearInterval(id);
  }
  id = setInterval(() => {
    action();
  }, timer);
};

function action() {
  if (items.length == 0) {
    return;
  }
  // キープしたのを結合して
  let text = '';
  items.forEach((value) => {
    const native = value['text'];
    const translated = value['translated'];
    text = text + `${native} (${translated}) |`;
  });
  // 送信
  postMessage({ text: text });
  // クリア
  items.splice(0);
};

function addLog(text, translated) {
  items.push({ time: Date.now(), text: text, translated: translated });
};

onmessage = (e) => {
  switch (e.data['command']) {
    case 'start':
      start(e.data['timer']);
      break;

    case 'clear':
      clearInterval(id);
      break;

    case 'add':
      addLog(e.data['text'], e.data['translated']);
      break;

    default:
      break;
  }
};
