// Chrome対応らしい
var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent

var socket = null;

var timeoutid = -1;

var isRecognizing = false;

window.addEventListener('DOMContentLoaded', function() {
  console.log('loaded.');
  // 音声合成のVOICE一覧生成
  speechSynthesis.onvoiceschanged = () => {
    console.log('onvoiceschanged.');
    const createVoiceList = function(target) {
      const selectbox = document.querySelector(target)
      const voices = speechSynthesis.getVoices();
      for (let i = 0; i < voices.length; i++) {
        const option = document.createElement('option');
        option.setAttribute('value', i);
        option.textContent = voices[i].name + ' (' + voices[i].lang + ')';
        selectbox.appendChild(option);
      }
    }
    createVoiceList('select[name="voice-target-native"]');
    createVoiceList('select[name="voice-target-foreign"]');

    // 設定情報の保存と復元がイベントより早いと困るので
    document.querySelectorAll('input, select').forEach((element) => {
      let store = (element.type == 'password') ? sessionStorage : localStorage;
      const storageItem = store.getItem(element.name);
      if (storageItem) {
        element.value = storageItem;
      }
      element.onchange = function(event) {
        ((element.type == 'password') ? sessionStorage : localStorage).setItem(
          event.target.name, event.target.value);
      }
    });
  };
  // これでonvoiceschangedを発火する
  // 空speakはDEPRECATEされてるので
  speechSynthesis.getVoices();

  // OBSのいろいろ
  document.querySelector('div[name="obs-submit"]').onclick = function() {
    console.log('obs-submitted.');
    // ステータス表示領域
    const status = document.querySelector('div[name="obs-submit"]');
    status.classList.remove('status-ok');
    status.classList.remove('status-ng');
    // 接続情報取得
    const ipaddr = document.querySelector('input[name="obs-addr"]').value || 'localhost'
    const port = document.querySelector('input[name="obs-port"]').value || '4444'
    const password = document.querySelector('input[name="obs-password"]').value

    // 接続
    socket = new WebSocket(`wss://${ipaddr}:${port}`);

    socket.addEventListener('error', function (error) {
      status.setAttribute('title', error);
      status.classList.add('status-ng');
    });

    // ソケットが開いたら認証開始
    socket.addEventListener('open', function (event) {
      status.attributes.add('title', 'OPEN');
      socket.send(JSON.stringify({
        'request-type': 'GetAuthRequired',
        'message-id': 'auth-req1'
      }));
    });
    
    // OBSからの打ち返し
    socket.addEventListener('message', function (event) {
      const msg =  JSON.parse(event.data);
      console.log('[Message] ', msg);

      switch (msg['message-id']) {
        case 'auth-req1':
          // 認証いらない系
          if (!msg['authRequired']) {
            status.setAttribute('title', 'CONNECTED');
            status.classList.add('status-ok');
            break;
          }
          // いる系
          // secret_string = password + salt
          let shash = sha256.update(password).update(msg['salt']).digest();
          shash = btoa(String.fromCharCode.apply(null, new Uint8Array(shash)));
          let authRes = sha256.update(shash).update(msg['challenge']).digest();
          authRes = btoa(String.fromCharCode.apply(null, new Uint8Array(authRes)));
          socket.send(JSON.stringify({
            'request-type': 'Authenticate',
            'message-id': 'auth-req2',
            'auth': authRes
          }));
          break;
        case 'auth-req2':
          if (msg['status'] != 'ok') {
            status.setAttribute('title', msg['error']);
            status.classList.add('status-ng');
            break;
          }
          status.setAttribute('title', 'CONNECTED');
          status.classList.add('status-ok');
          break;
      }
    });
  }
  
  // 音声認識のいろいろ
  document.querySelector('div[name="speech-recognition-submit"]').onclick = function() {
    // ステータス表示領域
    const status = document.querySelector('div[name="speech-recognition-submit"]');
    status.classList.remove('status-ok');
    status.classList.remove('status-ng');
    status.textContent = 'Start'

    isRecognizing = !isRecognizing;

    if (!isRecognizing) {
      return;
    }

    AlpacaRecognizer(isRecognizing);

    status.textContent = 'Starting'
    status.classList.add('status-ok');
  }
  document.querySelector('div[name="speech-translate-submit"]').onclick = function() {
    AlpataTranslate("吾輩はアルパカである。名前はまだない。", false);
  }
  document.querySelector('div[name="speech-speaker-native-submit"]').onclick = function() {
    AlpataSpeaks("吾輩はアルパカである。名前はまだない。", 'voice-target-native');
  }
  document.querySelector('div[name="speech-speaker-foreign-submit"]').onclick = function() {
    AlpataSpeaks("I am an alpaca. there is no name yet.", 'voice-target-foreign');
  }
});

/**
 * 音声認識処理.
 */
function AlpacaRecognizer() {
  // 音声認識初期化
  let recognition = new SpeechRecognition();
  recognition.lang =
    document.querySelector('input[name="speech-recognition-lang"]').value || 'ja-JP';
  recognition.continuous = false;
  recognition.interimResults = false;  // androidだとまだだめっぽい

  let diagnostic = document.querySelector('div[name="NativeLang"]');

  // 音声認識に成功したハンドラー
  recognition.onresult = function(event) {
    let results = event.results;
    for (let i = event.resultIndex; i < results.length; i++) {
      diagnostic.textContent = results[i][0].transcript;
      if (!results[i].isFinal) {
        console.log(diagnostic.textContent)
        diagnostic.classList.remove('final');
        continue;
      }
      diagnostic.classList.add('final');
      const text = diagnostic.textContent;
      console.log('[FINAL] ' + text)
      toOBS(text, document.querySelector('input[name="obs-text-native-source"]').value || 'native')
      AlpataTranslate(text, true);
    }
  }

  // 最後に必ず呼ばれるハンドラー
  recognition.onend = function(event) {
    console.log('onend')
    if (!isRecognizing) {
      return;
    }
    setTimeout(() => { AlpacaRecognizer(); }, 100);
  }

  try {
    recognition.start();
  } catch (error) {
    console.log(error)
  }
}

/**
 * 母国語を外国語に翻訳する.
 * @param {string} text 翻訳対象
 * @param {boolean} useSpeak true：Speakする / false：しない
 */
function AlpataTranslate(text, useSpeak) {
  const output = document.querySelector('div[name="ForeignLang"]')
  output.classList.remove('final');
  // 翻訳情報取得
  const apikey = document.querySelector('input[name="gas-deploy-key"]').value || 'AKfycbx76Gd_ytJJxInNVqVMUhEXpzEL1zsZpb_vRw-Z7S3ZR6n-5dM'
  const source = document.querySelector('input[name="gas-source"]').value || 'ja'
  const target = document.querySelector('input[name="gas-target"]').value || 'en'
  if (text === "") {
    return;
  }
  // 翻訳する
  console.log(
    `https://script.google.com/macros/s/${apikey}/exec?text=${(text)}&source=${source}&target=${target}`)
  $.ajax({
    url: `https://script.google.com/macros/s/${apikey}/exec?text=${(text)}&source=${source}&target=${target}`,
    dataType: "jsonp",
    jsonpCallback: "test",
    timeout: 10000
  }).done(function(data) {
    output.classList.add('final');
    const translated = data["translated"]
    output.textContent = translated;
    toOBS(translated, document.querySelector('input[name="obs-text-foreign-source"]').value || 'foreign')
    if (useSpeak) {
      AlpataSpeaks(text, 'voice-target-native');
      AlpataSpeaks(translated, 'voice-target-foreign');
    }
  })
  .fail(function(data) {
    output.textContent = "[ERROR] " + data;
  });
}

/**
 * 音声合成処理.
 * @param {string} text speakする文字列
 * @param {string} targetName Native / Foreign (母国語か外国語か)
 */
function AlpataSpeaks(text, targetName) {
  const selectbox = document.querySelector(`select[name="${targetName}"]`)
  const voice = speechSynthesis.getVoices()[selectbox.selectedIndex];
  const utter = new SpeechSynthesisUtterance(text);
  utter.volume = document.querySelector(`input[name="${targetName}-volume"]`).value
  utter.pitch = document.querySelector(`input[name="${targetName}-pitch"]`).value
  utter.rate = document.querySelector(`input[name="${targetName}-rate"]`).value
  utter.voice = voice;
  utter.lang = voice.lang;
  speechSynthesis.speak(utter);
}

/**
 * OBSのテキストソースに文字列を表示させる.
 * @param {string} text 表示させたい文字列
 * @param {string} sourceName OBSのテキストソース名
 */
function toOBS(text, sourceName) {
  if (socket == null || socket.readyState != 1) {
    console.log('websocket is not ready.');
    return;
  }
  socket.send(JSON.stringify({
    'request-type': 'SetTextGDIPlusProperties',
    'message-id': 'settextgdi-req',
    'source': sourceName,
    'text': text
  }));

  if (text == '') {
    return;
  }

  // 一定時間で字幕を消す対応
  let timeout = parseInt(document.querySelector(`input[name="obs-text-timeout"]`).value, 10);
  if (isNaN(timeout)) {
    // 未設定なら消さない
    return;
  }
  if (timeout < 1000) {
    // 早すぎるのはどうかと思う
    timeout = 5000;
  }
  console.log(timeout)
  if (timeoutid == -1) {
    console.log('timeout clear')
    // タイマー動作中ならキャンセルして再生成する
    clearTimeout(timeoutid);
  }
  timeoutid = setTimeout(() => {
    console.log('timeout move')
    toOBS('', sourceName);
    timeoutid = -1;
  }, timeout);
}

/** JSONP用のダミーコールバック. */
function test() { }