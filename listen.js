window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
window.SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;

class RTAWListener {

  ontrying = (text) => { };
  ondone = (text) => { };
  onend = () => { };

  isRecognizing = false;

  #recognition = new SpeechRecognition();

  constructor() {
    const self = this;
    // 音声認識初期化
    this.#recognition = new SpeechRecognition();

    // UAがWindowsなら機能を有効にする
    // androidだとまだだめっぽいので...
    const isuawin = window.navigator.userAgent.toLowerCase().indexOf('windows') > -1;
    this.#recognition.continuous = isuawin;
    this.#recognition.interimResults = isuawin;

    this.#recognition.onresult = function(event) {
      const results = event.results;
      for (let i = event.resultIndex; i < results.length; i++) {
        const text = results[i][0].transcript;
        if (!results[i].isFinal) {
          self.ontrying(text);
          continue;
        }
        // 完了イベント呼び出し
        self.ondone(text);
      }
    }

    this.#recognition.onend = function(event) {
      self.onend();
    }
  };

  start = async (lang) => {
    this.#recognition.lang = lang;
    this.#recognition.start();
  };

  end = () => {
    this.#recognition.stop();
  };
};
