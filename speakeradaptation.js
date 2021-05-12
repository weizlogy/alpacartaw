class RTAWSpeakerAdaptation {

  ontrying = (text) => { };
  ondone = (text) => { };
  onend = () => { };

  #listner;

  constructor() { this.#initialize() };

  #initialize = () => {
    const self = this;
    // 音声認識初期化
    self.#listner = new RTAWListener();
    self.#listner.ontrying = (text) => {
      self.ontrying(text);
    };
    self.#listner.ondone = (text) => {
      self.ondone(text);
    };
    self.#listner.onend = () => {
      self.onend();
    };
  };

  start = async (lang, continuity) => {
    const self = this;
    self.#listner.start(lang, continuity);
  };

  end = () => {
    const self = this;
    self.#listner.end();
  };

  addDictionary = (key, value) => {
    const self = this;
    self.#listner.addDictionary(key, value);
  };

  tempSaveDictionary = (targetListener) => {
    const self = this;
    targetListener.tempSaveDictionary(self.#listner.getDictionary());
  };
};
