class RTAWOBSWebSocket {

  onerror = (error) => { };
  onopen = (event) => { };
  onconnected = (event) => { };

  #socket = null;
  #timeoutid = -1;
  #password = '';

  constructor() { }

  start = (ipaddr, port, password, protocol) => {
    const self = this;
    // 後で使う
    this.#password = password;
    // 接続
    this.#socket = new WebSocket(`${protocol}://${ipaddr}:${port}`);

    // エラー処理
    this.#socket.addEventListener('error', function (error) {
      self.onerror(error);
    });

    // ソケットが開いたら認証開始
    this.#socket.addEventListener('open', function (event) {
      self.onopen(event);
      self.#socket.send(JSON.stringify({
        'request-type': 'GetAuthRequired',
        'message-id': 'auth-req1'
      }));
    });
    
    // OBSからの打ち返し
    this.#socket.addEventListener('message', function (event) {
      const msg =  JSON.parse(event.data);
      console.log('[Message] ', msg);

      switch (msg['message-id']) {
        case 'auth-req1':
          // 認証いらない系
          if (!msg['authRequired']) {
            self.onconnected(event);
            break;
          }
          // いる系
          // secret_string = password + salt
          let shash = sha256.update(self.#password).update(msg['salt']).digest();
          shash = btoa(String.fromCharCode.apply(null, new Uint8Array(shash)));
          let authRes = sha256.update(shash).update(msg['challenge']).digest();
          authRes = btoa(String.fromCharCode.apply(null, new Uint8Array(authRes)));
          self.#socket.send(JSON.stringify({
            'request-type': 'Authenticate',
            'message-id': 'auth-req2',
            'auth': authRes
          }));
          break;
        case 'auth-req2':
          if (msg['status'] != 'ok') {
            self.onerror(msg['error']);
            break;
          }
          self.onconnected(event);
          break;
      }
    });
  };

  toOBS = async (text, sourceName, timeout, interim) => {
    const self = this;

    return new Promise((resolve, reject) => {
      if (this.#socket == null || this.#socket.readyState != 1) {
        resolve('websocket is not ready.');
        return;
      }

      this.#socket.send(JSON.stringify({
        'request-type': 'SetSourceFilterVisibility',
        'message-id': 'setsourcefiltervisibility-req',
        'sourceName': sourceName,
        'filterName': 'rtawfilter',
        'filterEnabled': interim
      }));

      this.#socket.send(JSON.stringify({
        'request-type': 'SetTextGDIPlusProperties',
        'message-id': 'settextgdi-req',
        'source': sourceName,
        'text': text,
      }));

      if (text == '') {
        resolve('');
        return;
      }

      // 一定時間で字幕を消す対応
      if (isNaN(timeout)) {
        // 未設定なら消さない
        resolve('');
        return;
      }
      if (timeout < 1000) {
        // 早すぎるのはどうかと思う
        timeout = 5000;
      }

      if (this.#timeoutid == -1) {
        console.log('timeout clear')
        // タイマー動作中ならキャンセルして再生成する
        clearTimeout(this.#timeoutid);
      }
      this.#timeoutid = setTimeout(() => {
        console.log('timeout move')
        self.toOBS('', sourceName, timeout);
        self.#timeoutid = -1;
      }, timeout);

      resolve('');
    });
  };
};
