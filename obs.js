class RTAWOBSWebSocket {

  onerror = (error) => { };
  onopen = (event) => { };
  onconnected = (event) => { };

  #socket = null;
  #timeoutId = {};
  #password = '';

  constructor() {  }

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

  /**
   * OBSへのテキスト送出
   * @param {*} text 送出文字列
   * @param {*} sourceName 出力先
   * @param {*} timeout 消すまでの時間
   * @param {*} interim 音声認識途中経過か？（true: はい / false: いいえ）
   * @returns Promise
   */
  toOBS = async (text, sourceName, timeout, interim) => {
    const self = this;

    return new Promise(async (resolve, reject) => {
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

      // 
      if (text == '' || interim) {
        console.log('stop here. ' + sourceName);
        resolve('');
        return;
      }

      // 一定時間で字幕を消す対応
      if (isNaN(timeout)) {
        // 未設定なら消さない
        console.log('tieout is NaN. ' + sourceName);
        resolve('');
        return;
      }
      if (timeout < 1000) {
        // 早すぎるのはどうかと思う
        timeout = 5000;
      }

      new Promise((rs, _) => {
        if (self.#timeoutId[sourceName]) {
          console.log('timeout clear. ' + sourceName);
          clearTimeout(self.#timeoutId[sourceName]);
        }
        self.#timeoutId[sourceName] = setTimeout(() => {
          console.log('timeout start. ' + sourceName);
          rs(sourceName);
        }, timeout);
      }).then(name => {
        console.log('timeout move. ' + name)
        self.toOBS('', name, NaN);
      })

      resolve('');
    });
  };

  saveReplayBuffer = () => {
    if (this.#socket == null || this.#socket.readyState != 1) {
      resolve('websocket is not ready.');
      return;
    }

    this.#socket.send(JSON.stringify({
      'request-type': 'SaveReplayBuffer',
      'message-id': 'savereplaybuffer-req',
    }));
  };
  setCurrentScene = (sneceName) => {
    if (this.#socket == null || this.#socket.readyState != 1) {
      resolve('websocket is not ready.');
      return;
    }

    this.#socket.send(JSON.stringify({
      'request-type': 'SetCurrentScene',
      'message-id': 'setcurrentscene-req',
      'scene-name': sneceName
    }));
  };

};
