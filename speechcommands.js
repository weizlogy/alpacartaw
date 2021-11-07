class RTAWSpeechCommands {

  doReplay = (scene) => {};
  doSceneSwitch = (scene) => {};

  isStart = false;

  #BUFFER_MODE_REPLAY = 'replay';
  #BUFFER_MODE_SCENESWITCHER = 'scenesw';

  #buffer = [];
  #replayKeyword = {};
  #sceneswKeyword = {};

  #socket = null;

  #worker = new Worker('worker/speechcommandworker.js');

  constructor() { };

  addReplayKeywords = (savekey, movekey, scene) => {
    const self = this;

    if (savekey) {
      self.#replayKeyword[savekey] = {
        savebuffer: true
      };
    }
    if (movekey) {
      self.#replayKeyword[movekey] = {
        scene: scene,
        savebuffer: false
      };
    }
  }

  addSceneswKeyword = (movekey, returnkey, basescene, movescene) => {
    const self = this;

    self.#sceneswKeyword[movekey] = movescene;
    self.#sceneswKeyword[returnkey] = basescene;
  }

  start = (key) => {
    const self = this;

    console.log('RTAWSpeechCommands - Replay', self.#replayKeyword);
    console.log('RTAWSpeechCommands - SneceSwitcher', self.#sceneswKeyword);

    if (key) {
      self.#socket = new WebSocket(`wss://cloud.achex.ca/rtaw${key}`);

      // ソケットが開いたら認証開始
      self.#socket.addEventListener('open', function (event) {
        self.#socket.send(`{ "auth": "${key}" }`);
      });
      
      // 表情データ受信処理
      self.#socket.addEventListener('message', function (event) {
        const msg =  JSON.parse(event.data);
        console.log('[Message] ', msg);

        if (!msg['command']) {
          return;
        }
        switch (msg['command']) {
          case 'save':
            self.doReplay('', true);
            break;
          case 'replay':
            Object.keys(self.#replayKeyword).forEach(rk => {
              if (self.#replayKeyword[rk].savebuffer) {
                return;
              }
              self.doReplay(self.#replayKeyword[rk].scene, false);
            });
            break;
          }
      });
    }

    self.#worker.onmessage = (e) => {
      self.exec();
    };
    self.#worker.postMessage({ command: 'clear' });
    self.#worker.postMessage({ command: 'start', timer: 1000 });

    self.isStart = true;
  };

  prepare = (command) => {
    const self = this;
    // Dispatchする
    if (self.#replayKeyword[command]) {
      self.#buffer.push({ mode: self.#BUFFER_MODE_REPLAY, command: command });
      return;
    }
    if (self.#sceneswKeyword[command]) {
      self.#buffer.push({ mode: self.#BUFFER_MODE_SCENESWITCHER, command: command });
      return;
    }
  };

  exec = () => {
    const self = this;
    // FIFOだ
    const command = self.#buffer.shift();
    if (!command) {
      return;
    }
    const mode = command['mode'];
    switch (mode) {
      case self.#BUFFER_MODE_REPLAY:
        const info = self.#replayKeyword[command['command']];
        self.doReplay(info['scene'], info['savebuffer']);
        break;
      case self.#BUFFER_MODE_SCENESWITCHER:
        const info2 = self.#sceneswKeyword[command['command']];
        self.doSceneSwitch(info2)
        break;
    }
  };
};
