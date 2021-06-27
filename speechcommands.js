class RTAWSpeechCommands {

  doReplay = (scene) => {};

  #buffer = [];
  #replayKeyword = {};

  #worker = new Worker('worker/speechcommandworker.js');

  constructor() { };

  start = (keys) => {
    const self = this;

    self.#replayKeyword = keys;
    console.log('RTAWSpeechCommands', self.#replayKeyword);

    self.#worker.onmessage = (e) => {
      self.exec();
    };
    self.#worker.postMessage({ command: 'clear' });
    self.#worker.postMessage({ command: 'start', timer: 1000 });
  };

  prepare = (command) => {
    const self = this;
    // Dispatchする
    const info = self.#replayKeyword[command];
    if (!info) {
      return;
    }
    self.#buffer.push(command);
  };

  exec = () => {
    const self = this;
    // FIFOだ
    const command = self.#buffer.shift();
    if (!command) {
      return;
    }
    const info = self.#replayKeyword[command];
    self.doReplay(info['scene'], info['savebuffer']);
  };
};
