class RTAWSpeechCommands {

  doReplay = (scene) => {};

  #buffer = [];
  #intervalid;
  #replayKeyword = {};

  constructor() { };

  start = (keys) => {
    const self = this;

    self.#replayKeyword = keys;
    console.log('RTAWSpeechCommands', self.#replayKeyword);

    if (self.#intervalid) {
      clearInterval(self.#intervalid);
    }
    self.#intervalid = setInterval(() => {
      self.exec();
    }, 1000);
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
    if (!info['scene']) {
      return;
    }
    self.doReplay(info['scene'], info['savebuffer']);
  };
};
