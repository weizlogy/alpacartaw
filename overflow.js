class RTAWOverflow {

  #textList = [];

  #startTime;
  #keepTime;
  #limit;
  #resolution;
  #format;

  #tempText;
  #tempTranslate;
  #tempTranslate2;

  #isCheck = false;

  #worker = new Worker('worker/overflowworker.js');

  onchanged = (text) => {};
  onerror = (error) => {};

  constructor() { };

  #toText = () => {
    const self = this;
    // 配列はコピーして逆順にする
    return self.#textList.slice().reverse().reduce(
      (pv, item) => { return pv + item.text.replace('${debugTimer}', item.timeout) + '\n' }, '');
  };

  start = (startTime, keepTime, limit, resolution, format) => {
    const self = this;

    self.#startTime = startTime;
    self.#keepTime = keepTime;
    self.#limit = limit;
    self.#resolution = resolution;
    self.#format = format;

    self.#worker.onmessage = (e) => {
      switch (e.data['command']) {
        case 'interval':
          if (self.#textList.length == 0) {
            return;
          }
          const time = e.data['timer'];
          self.#textList.forEach((item) => { item.timeout -= time; });
          self.#textList = self.#textList.filter((value) => { return value.timeout > 0 });

          self.onchanged( self.#toText() );
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

    if (!self.#format) {
      return;
    }

    console.log('overflow add', self.#tempText);

    const formatText =
      self.#format.replace('${text}', self.#tempText)
       .replace('${translate}', self.#tempTranslate)
       .replace('${translate2}', self.#tempTranslate2)
    self.#textList.push({
      timeout: self.#keepTime,
      text: formatText
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
      self.onchanged( self.#toText() );
      self.#isCheck = false;
      self.#worker.postMessage({ command: 'timerclear' });
    }
  };
};
