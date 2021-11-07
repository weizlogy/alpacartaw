class RTAWEmotion {

  #socket = null;
  #data = {};

  #isblock = false;

  currentemote = '';
  currentstr = '';
  currenteadjust = {};

  isstart = false;

  constructor() { }

  start = (key, adjustdata) => {
    const self = this;

    self.#data = adjustdata;
    self.isstart = true;

    // 接続
    self.#socket = new WebSocket(`wss://cloud.achex.ca/rtaw${key}`);

    // ソケットが開いたら認証開始
    self.#socket.addEventListener('open', function (event) {
      self.#socket.send(`{ "auth": "${key}" }`);
    });
    
    // 表情データ受信処理
    self.#socket.addEventListener('message', function (event) {
      const msg =  JSON.parse(event.data);
      console.log('[Message] ', msg);

      if (self.#isblock) {
        return;
      }
      self.currentemote = msg['emotion'] || 'neutral';
      self.currentstr = msg['strength'] || 0;
      self.currenteadjust = self.#data[self.currentemote];
    });
  };

  blocking = (isblock) => {
    const self = this;
    self.#isblock = isblock;
  };
};
