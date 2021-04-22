window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
window.SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;

class RTAWListener {

  ontrying = (text) => { };
  ondone = (text) => { };
  onend = () => { };

  isRecognizing = false;

  #recognition = new SpeechRecognition();
  #subtitleLimit = NaN;

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
      for (let i = event.resultIndex; i < results.length; i++) {
        let text = results[i][0].transcript;
        if (!results[i].isFinal) {
          // ここは未確定
          if (!isNaN(self.#subtitleLimit)) {
            text = text.substr(text.length - self.#subtitleLimit, self.#subtitleLimit);
          }
          self.ontrying(text);
          continue;
        }
        // ここは確定。完了イベント呼び出し
        self.ondone(text);
      }
    }

    self.#recognition.onerror = function(event) {
      console.log(event);
    }

    self.#recognition.onend = function(event) {
      self.onend();
    }
  };

  start = async (lang, continuity, subtitleLimit) => {
    const self = this;

    self.#recognition.lang = lang;
    self.#recognition.continuous = continuity;
    self.#subtitleLimit = subtitleLimit;
    self.#recognition.start();
  };

  end = () => {
    this.#recognition.stop();
  };
};
