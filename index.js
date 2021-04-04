var listener = new RTAWListener();
var obssocket = new RTAWOBSWebSocket();
var translate = new RTAWTranslate();
var silentbreaker = new RTAWSilentBreaker();

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
    createVoiceList('select[name="voice-target-silent"]');

    // 設定情報の保存と復元がイベントより早いと困るので
    document.querySelectorAll('input, select').forEach((element) => {
      let store = (element.type == 'password') ? sessionStorage : localStorage;
      const storageItem = store.getItem(element.name);
      if (storageItem) {
        if (element.type == 'checkbox' && storageItem) {
          element.checked = storageItem.toLowerCase() === 'true';
        } else {
          element.value = storageItem;
        }
      }
      element.onchange = function(event) {
        if (element.type == 'checkbox') {
          localStorage.setItem(event.target.name, event.target.checked);
          return;
        }
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
    let protocol = 'wss';

    if (ipaddr == 'localhost') {
      protocol = 'ws';
    }

    obssocket.onerror = (error) => {
      status.setAttribute('title', error);
      status.classList.add('status-ng');
    };
    obssocket.onopen = (event) => {
      status.setAttribute('title', 'OPEN');
    };
    obssocket.onconnected = (event) => {
      status.setAttribute('title', 'CONNECTED');
      status.classList.add('status-ok');
    };

    obssocket.start(ipaddr, port, password, protocol);
  }
  
  //** 音声認識Startボタン操作. */
  document.querySelector('div[name="speech-recognition-submit"]').onclick = function() {
    // ステータス表示領域
    const status = document.querySelector('div[name="speech-recognition-submit"]');
    status.classList.remove('status-ok');
    status.classList.remove('status-ng');
    status.textContent = 'Start'

    listener.isRecognizing = !listener.isRecognizing;

    if (!listener.isRecognizing) {
      silentbreaker.stop();
      return;
    }

    if (document.querySelector('input[name="silent-breaker-use-it"]').checked) {
      silentbreaker.onbreak = () => {
        const breakText = document.querySelector('input[name="silent-breaker-text"]').value;
        const timeout =
          parseInt(document.querySelector(`input[name="silent-breaker-timer"]`).value || 10000, 10) - 5000;
        if (!breakText.startsWith('http')) {
          DelayStreaming('silent', breakText, timeout, true, false, false);
          return;
        }
        silentbreaker.textFromURL(breakText, (text) => {
          DelayStreaming('silent', text, timeout, true, false, false);
        });
      }
      silentbreaker.start(parseInt(document.querySelector('input[name="silent-breaker-timer"]').value, 10));
    }

    const lang =
      document.querySelector('input[name="speech-recognition-lang"]').value || 'ja-JP';
    const continuity =
      document.querySelector('input[name="speech-recognition-continuity"]').checked;

    listener.ontrying = (text) => {
      console.log(text)

      silentbreaker.reset();

      let diagnostic = document.querySelector('div[name="NativeLang"]');
      diagnostic.classList.remove('final');
      diagnostic.textContent = text;
      if (document.querySelector('input[name="obs-use-interim"]').checked) {
        DelayStreaming('native', text, NaN, false, false, true);
      }
    };

    listener.ondone = (text) => {
      console.log(text)

      silentbreaker.reset();

      let diagnostic = document.querySelector('div[name="NativeLang"]');
      diagnostic.classList.add('final');
      diagnostic.textContent = text;
      console.log('[FINAL] ' + text)

      // 配信の遅延に合わせて遅らせる
      const timeout = parseInt(document.querySelector(`input[name="obs-text-timeout"]`).value, 10);
      DelayStreaming('native', text, timeout, true, true, false);
    };

    listener.onend = () => {
      console.log('onend')
      if (!listener.isRecognizing) {
        return;
      }
      setTimeout(() => { listener.start(lang, continuity); }, 400);
    };

    listener.start(lang, continuity);

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
  document.querySelector('div[name="speech-speaker-silent-submit"]').onclick = function() {
    AlpataSpeaks("吾輩はアルパカである。名前はまだない。", 'voice-target-silent');
  }

  // 翻訳処理のイベントハンドラー
  translate.ondone = (translated) => {
    const output = document.querySelector('div[name="ForeignLang"]');
    output.classList.add('final');
    output.textContent = translated;
    // OBSに送信するけど別に待たなくていいですはい
    obssocket.toOBS(translated,
      document.querySelector('input[name="obs-text-foreign-source"]').value || 'foreign',
      parseInt(document.querySelector(`input[name="obs-text-timeout"]`).value, 10),
      false);
    // 読み上げる
    AlpataSpeaks(translated, 'voice-target-foreign');
  };
  translate.onerror = (error) => {
    const output = document.querySelector('div[name="ForeignLang"]');
    output.textContent = "[ERROR] " + error;
  };
});

/**
 * 音声合成処理.
 * @param {string} text speakする文字列
 * @param {string} targetName voice-target-native / voice-target-foreign (母国語か外国語か)
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

function DelayStreaming(sourceName, text, timeout, isSpeak, isTranslate, isInterim) {
  setTimeout(() => {
    // OBSに送信するけど別に待たなくていい
    obssocket.toOBS(text,
      document.querySelector(`input[name="obs-text-${sourceName}-source"]`).value || sourceName,
      timeout,
      isInterim);
    if (isSpeak) {
      // 読み上げる
      AlpataSpeaks(text, `voice-target-${sourceName}`);
    }
    if (isTranslate) {
      // 翻訳情報取得
      const apikey = document.querySelector('input[name="gas-deploy-key"]').value || 'AKfycbx76Gd_ytJJxInNVqVMUhEXpzEL1zsZpb_vRw-Z7S3ZR6n-5dM'
      const source = document.querySelector('input[name="gas-source"]').value || 'ja'
      const target = document.querySelector('input[name="gas-target"]').value || 'en'
      translate.exec(text, apikey, source, target);
    }
  }, parseInt(document.querySelector('input[name="obs-text-delay"]').value, 10) || 1);
}
