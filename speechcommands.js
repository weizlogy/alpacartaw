class RTAWSpeechCommands {

  doReplay = (scene) => {};
  doSceneSwitch = (scene) => {};

  isStart = false;

  #BUFFER_MODE_REPLAY = 'replay';
  #BUFFER_MODE_SCENESWITCHER = 'scenesw';

  #buffer = [];
  #replayKeyword = {};
  #sceneswKeyword = {};

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

  start = () => {
    const self = this;

    console.log('RTAWSpeechCommands - Replay', self.#replayKeyword);
    console.log('RTAWSpeechCommands - SneceSwitcher', self.#sceneswKeyword);

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
