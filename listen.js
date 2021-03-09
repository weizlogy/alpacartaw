// Chrome対応らしい
var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent

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
    this.#recognition.continuous = false;
    this.#recognition.interimResults = false;  // androidだとまだだめっぽい

    this.#recognition.onresult = function(event) {
      const results = event.results;
      for (let i = event.resultIndex; i < results.length; i++) {
        const text = results[i][0].transcript;
        if (!results[i].isFinal) {
          self.ontrying(text);
          continue;
        }
        self.ondone(text);
      }
    }

    this.#recognition.onend = function(event) {
      self.onend();
    }
  };

  start = (lang) => {
    this.#recognition.lang = lang;
    this.#recognition.start();
  };

  end = () => {
    this.#recognition.stop();
  };
};
