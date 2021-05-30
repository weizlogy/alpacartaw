class RTAWOverflow {

  #textList = [];

  #startTime;
  #keepTime;
  #limit;
  #resolution;
  #format;

  #timerid;
  #tempText;
  #tempTranslate;

  #intervalid;

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

    self.#intervalid = setInterval((time) => {
      self.#textList.forEach((item) => { item.timeout -= time; });
      self.#textList = self.#textList.filter((value) => { return value.timeout > 0 });

      self.onchanged( self.#toText() );

    }, self.#keepTime / self.#resolution, self.#keepTime / self.#resolution);
  };

  stop = () => {
    const self = this;
    clearInterval(self.#intervalid);
  }

  #add = () => {
    const self = this;

    console.log('overflow add', self.#tempText);

    const formatText =
      self.#format.replace('${text}', self.#tempText)
       .replace('${translate}', self.#tempTranslate)
    self.#textList.push({
      timeout: self.#keepTime,
      text: formatText
    });

    if (self.#textList.length > self.#limit) {
      //self.#textList.shift();
      self.#textList = self.#textList.slice(self.#textList.length - self.#limit)
    }
  };

  setTempText = (text) => {
    const self = this;
    self.#tempText = text;
  };
  setTempTranslate = (text) => {
    const self = this;
    self.#tempTranslate = text;
  };

  timerStart = () => {
    const self = this;

    console.log('overflow timerStart');

    self.#tempText = '';
    self.#tempTranslate = '';

    self.#timerid = setTimeout(() => {
      self.#timerid = null;
    }, self.#startTime);
  };

  timerCheck = () => {
    const self = this;

    console.log('overflow timerCheck');

    if (self.#timerid) {
      self.#add();
      self.onchanged( self.#toText() );
      clearTimeout(self.#timerid);
      self.#timerid = null;
    }
  };
};
