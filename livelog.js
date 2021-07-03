class RTAWLiveLog {

  #apikey;
  #param1;
  #param2;
  #timer;

  #worker = new Worker('worker/livelogworker.js');

  constructor() { };

  start = (timer, apikey, param1, param2) => {
    const self = this;

    self.#apikey = apikey;
    self.#param1 = param1;
    self.#param2 = param2;
    self.#timer = timer;

    self.#worker.onmessage = (e) => {
      // Discordに投げる
      // AKfycbxzJr1bb-yZ_VxrhA1GJCmidRiaVIGPnMvP0BEBk2aZCT_afxw
      // 837393923076784228
      // RdKnaFYPngaQ2A69Lnr7vpQnFxT4gY4PNKeVqWhzLcGdUSqrSt7tI4yGoO1PzyaEIRKg
      console.log('livelog', e.data['text']);
      // console.log(
      //   `https://script.google.com/macros/s/${self.#apikey}/exec?text=${e.data['text']}&param1=${self.#param1}&param2=${self.#param2}`)
      $.ajax({
        url: `https://script.google.com/macros/s/${self.#apikey}/exec?text=${e.data['text']}&param1=${self.#param1}&param2=${self.#param2}`,
        dataType: "jsonp",
        jsonpCallback: "test",
        timeout: self.#timer * 0.75  // intervalの75%くらいってこと
      }).done(function(data) {
        console.log(data);
      })
      .fail(function(data) {
        console.log(data);
      });
    };
    self.#worker.postMessage({ command: 'start', timer: timer });
  };

  stop = () => {
    const self = this;
    self.#worker.postMessage({ command: 'stop' });
  };

  exec = (text, translated) => {
    const self = this;

    if (text === "") {
      return;
    }
    self.#worker.postMessage({ command: 'add', text: text, translated: translated });
  };

};

/** JSONP用のダミーコールバック. */
function test() { }
