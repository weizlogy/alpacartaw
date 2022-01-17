class RTAWOverflow {

  #textList = [];

  #startTime;
  #keepTime;
  #limit;
  #resolution;
  #nativeSeparator;
  #foreignSeparator;

  #tempText;
  #tempTranslate;
  #tempTranslate2;

  #isCheck = false;

  #worker = new Worker('worker/overflowworker.js');

  onchanged = (text) => {};
  onerror = (error) => {};

  constructor() { };

  toText = () => {
    const self = this;
    return self.#textList.slice().reduce(
      (pv, item) => { return pv + item.text + self.#nativeSeparator }, '');
  };

  toTranslateText = () => {
    const self = this;
    return self.#textList.slice().reduce(
      (pv, item) => { return pv + item.translate + self.#foreignSeparator }, '');
  };

  toTranslate2Text = () => {
    const self = this;
    return self.#textList.slice().reduce(
      (pv, item) => { return pv + item.translate2 + self.#foreignSeparator }, '');
  };

  start = (startTime, keepTime, limit, resolution, nativeSeparator, foreignSeparator) => {
    const self = this;

    self.#startTime = startTime;
    self.#keepTime = keepTime;
    self.#limit = limit;
    self.#resolution = resolution;
    self.#nativeSeparator = nativeSeparator;
    self.#foreignSeparator = foreignSeparator;

    self.#worker.onmessage = (e) => {
      switch (e.data['command']) {
        case 'interval':
          if (self.#textList.length == 0) {
            return;
          }
          const time = e.data['timer'];
          self.#textList.forEach((item) => { item.timeout -= time; });
          self.#textList = self.#textList.filter((value) => { return value.timeout > 0 });

          // self.onchanged( self.#toText() );
          break;

        case 'timer':
          self.#isCheck = false;
          break;
      }
    };
    self.#worker.postMessage({ command: 'start', timer: self.#keepTime / self.#resolution });
  };

  stop = () => {
    const self = this;
    self.#worker.postMessage({ command: 'clear' });
  }

  #add = () => {
    const self = this;

    if (!self.isStart()) {
      return;
    }

    console.log('overflow add', self.#tempText);

    self.#textList.push({
      timeout: self.#keepTime,
      text: self.#tempText,
      translate: self.#tempTranslate,
      translate2: self.#tempTranslate2
    });

    if (self.#textList.length > self.#limit) {
      self.#textList = self.#textList.slice(self.#textList.length - self.#limit)
    }
  };

  setTempText = (text) => {
    const self = this;
    self.#tempText = text;
  };
  setTempTranslate = (text, is2ndLang) => {
    const self = this;
    if (is2ndLang) {
      self.#tempTranslate2 = text;
      return;
    }
    self.#tempTranslate = text;
  };

  timerStart = () => {
    const self = this;

    self.#tempText = '';
    self.#tempTranslate = '';
    self.#tempTranslate2 = '';

    self.#isCheck = true;
    self.#worker.postMessage({ command: 'timerstart', timer: self.#startTime });
  };

  timerCheck = () => {
    const self = this;

    if (self.#isCheck) {
      console.log('overflow timerCheck', self.#textList);
      self.#add();
      // self.onchanged( self.#toText() );
      self.#isCheck = false;
      self.#worker.postMessage({ command: 'timerclear' });
    }
  };

  isStart = () => {
    const self = this;
    return self.#startTime;
  };
};
