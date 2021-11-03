window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
window.SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;

class RTAWListener {

  ontrying = (text) => { };
  ondone = (text) => { };
  onend = () => { };

  isRecognizing = false;
  status = '';

  #dictionary = {};
  #recognition = new SpeechRecognition();

  constructor() { this.#initialize() };

  #initialize = () => {
    const self = this;

    // 音声認識初期化
    self.#recognition = new SpeechRecognition();

    // UAがWindowsなら機能を有効にする
    // androidだとまだだめっぽいので...
    const isuawin = window.navigator.userAgent.toLowerCase().indexOf('windows') > -1;
    self.#recognition.interimResults = isuawin;

    self.#recognition.onresult = function(event) {
      // 音声認識結果取得してます
      const results = event.results;
      let tryingTempText = '';
      for (let i = event.resultIndex; i < results.length; i++) {
        let text = results[i][0].transcript;
        if (results[i].isFinal) {
          // ここは確定。完了イベント呼び出し
          self.status = 'done';
          // 辞書による変換
          if (self.#dictionary) {
            Object.keys(self.#dictionary).forEach(key => {
              text = text.replace(key, self.#dictionary[key]);
            });
          }
          self.#recognition.stop();
          self.ondone(text);
          return;
        }
        // 確定していない場合は要素の分だけ文字列を連結していく
        tryingTempText += text;
      }
      // ここは未確定
      self.status = 'trying';
      self.ontrying(tryingTempText);
    }

    self.#recognition.onerror = function(event) {
      self.status = 'error';
      console.log(event);
      self.#recognition.stop();  // stopしたらonendが発生する->即再開する
    }

    self.#recognition.onend = function(event) {
      self.status = 'end';
      self.onend();
    }
  };

  start = async (lang, continuity) => {
    const self = this;

    self.#recognition.lang = lang;
    self.#recognition.continuous = continuity;
    try {
      self.#recognition.start();
    } catch (ex) {
      console.log(ex);
    }
    self.status = 'start';
  };

  end = () => {
    this.status = 'stop';
  };

  getDictionary = () => {
    const self = this;
    return self.#dictionary;
  };

  setDictionary = (dic) => {
    const self = this;
    self.#dictionary = dic;
    console.log('listener.setDictionary', self.#dictionary);
  };

  addDictionary = (key, value) => {
    const self = this;
    self.#dictionary[key] = value;
    console.log(`listener.addDictionary = ${key} => ${value}`);
  };

  // TODO: 削除は？

  tempSaveDictionary = (newdic) => {
    const self = this;
    self.#dictionary = Object.assign(self.#dictionary, newdic);
  };

  permanentSaveDictionary = async () => {
    const self = this;
    const contents = JSON.stringify(self.#dictionary);
    const handle = await window.showSaveFilePicker({});

    const writable = await handle.createWritable();
    await writable.write(contents);
    await writable.close();

    console.log('permanentSaveDictionary finished.');
  };
};
