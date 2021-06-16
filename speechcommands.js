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
    self.#buffer.push(command);
  };

  exec = () => {
    const self = this;
    // FIFOだ
    const command = self.#buffer.shift();
    if (!command) {
      return;
    }
    // Dispatchする
    const scene = self.#replayKeyword[command];
    if (!scene) {
      return;
    }
    self.doReplay(scene);
  };
};
