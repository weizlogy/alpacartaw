var listener = new RTAWListener();
var obssocket = new RTAWOBSWebSocket();
var translate = new RTAWTranslate();
var livelog = new RTAWLiveLog();
var adaptation = new RTAWSpeakerAdaptation();
var overflow = new RTAWOverflow();
var spcommand = new RTAWSpeechCommands();

window.addEventListener('load', function() {
  console.log('loaded.');
});

window.addEventListener('DOMContentLoaded', function() {
  console.log('DOMContentLoaded.');
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
      if (element.type == 'file') {
        return;
      }
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
      return;
    }

    const lang =
      document.querySelector('input[name="speech-recognition-lang"]').value || 'ja-JP';
    const continuity =
      document.querySelector('input[name="speech-recognition-continuity"]').checked;
    const subtitleLimit =
      parseInt(document.querySelector(`input[name="obs-text-subtitle-limit-native"]`).value, 10);
    const subtitleScrollTime =
      parseInt(document.querySelector(`input[name="obs-text-subtitle-scroll-time"]`).value, 10);

    listener.ontrying = (value) => {
      console.log(value);

      let text = value;

      overflow.timerCheck();

      let diagnostic = document.querySelector('div[name="NativeLang"]');
      diagnostic.classList.remove('final');
      diagnostic.textContent = text;
      if (document.querySelector('input[name="obs-use-interim"]').checked) {
        if (!isNaN(subtitleLimit)) {
          let startIndex = text.length - subtitleLimit;
          if (startIndex < 0) {
            startIndex = 0;
          }
          text = text.substr(startIndex, Math.min(text.length, subtitleLimit));
        }
        DelayStreaming('native', text, NaN, false, false, true, true);
      }
    };

    listener.ondone = async (value) => {
      console.log('[FINAL]', value);

      let text = value;

      overflow.timerStart();
      overflow.setTempText(text);

      let diagnostic = document.querySelector('div[name="NativeLang"]');
      diagnostic.classList.add('final');
      diagnostic.textContent = text;

      // コマンド登録
      if (document.querySelector('input[name="obs-replay-use-it"]').checked) {
        spcommand.prepare(text);
      }

      const source = document.querySelector('input[name="obs-text-native-source"]').value || 'native';
      const timeout = parseInt(document.querySelector(`input[name="obs-text-timeout"]`).value, 10);

      // 文字数制限なしか字数制限以下はそのままだ
      if (isNaN(subtitleLimit) || text.length <= subtitleLimit) {
        DelayStreaming(source, text, timeout, true, true, false, true);
        return;
      }

      // 先に読み上げと翻訳をさせる
      DelayStreaming(source, text, timeout, true, true, false, false);

      let remainTimeout = 300;
      if (!isNaN(subtitleScrollTime)) {
        remainTimeout = subtitleScrollTime;
      }

      const scroller = new RTAWSubtitleScroller();
      for await (const tempText of scroller.iterate(text, remainTimeout, subtitleLimit)) {
        if (listener.status == 'trying') {
          scroller.break();
          break;
        }
        DelayStreaming(source, tempText, timeout, false, false, false, true);
      }

    };

    listener.onend = () => {
      console.log('onend')
      if (!listener.isRecognizing) {
        // overflow監視停止
        overflow.stop();
        return;
      }
      // 音声認識が終了したら再開させるところ
      setTimeout(() => { listener.start(lang, continuity); }, 1);
    };

    // ここで音声認識をスタートする
    listener.start(lang, continuity);

    status.textContent = 'Starting'
    status.classList.add('status-ok');

    // overflow監視スタート
    overflow.onchanged = (text) => {
      console.log('overflow.onchanged', text);

      obssocket.toOBS(text,
        document.querySelector('input[name="overflow-source"]').value || 'overflow',
        NaN, false);
    };

    if (document.querySelector('input[name="overflow-use-it"]').checked) {
      overflow.start(
        parseInt(document.querySelector('input[name="overflow-start-timeout"]').value, 10) || 10000,
        parseInt(document.querySelector('input[name="overflow-keep-timeout"]').value, 10) || 30000,
        parseInt(document.querySelector('input[name="overflow-limit"]').value, 10) || 3,
        parseInt(document.querySelector('input[name="overflow-resolution"]').value, 10) || 3,
        document.querySelector('input[name="overflow-format"]').value || '${text}(${translate})'
      );
    }

    // リプレイ機能をスタート
    if (document.querySelector('input[name="obs-replay-use-it"]').checked) {
      spcommand.doReplay = (scene) => {
        obssocket.saveReplayBuffer();
        obssocket.setCurrentScene(scene);
      };
      const replaykeyword = {};
      const key1 = document.querySelector('input[name="obs-replay-keyword-1"]').value;
      const key2 = document.querySelector('input[name="obs-replay-keyword-2"]').value;
      const key3 = document.querySelector('input[name="obs-replay-keyword-3"]').value;
      if (key1) {
        replaykeyword[key1] = document.querySelector('input[name="obs-replay-scene-1"]').value;
      }
      if (key2) {
        replaykeyword[key2] = document.querySelector('input[name="obs-replay-scene-2"]').value;
      }
      if (key3) {
        replaykeyword[key3] = document.querySelector('input[name="obs-replay-scene-3"]').value;
      }
      spcommand.start(replaykeyword);
    }
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

  // 翻訳処理のイベントハンドラー
  translate.ondone = async (text, translated) => {
    const output = document.querySelector('div[name="ForeignLang"]');
    output.classList.add('final');
    output.textContent = translated;

    // 翻訳結果のスクロール処理
    const source = document.querySelector('input[name="obs-text-foreign-source"]').value || 'foreign';
    const timeout = parseInt(document.querySelector(`input[name="obs-text-timeout"]`).value, 10);
    const subtitleLimit =
      parseInt(document.querySelector(`input[name="obs-text-subtitle-limit-foreign"]`).value, 10);
    const subtitleScrollTime =
      parseInt(document.querySelector(`input[name="obs-text-subtitle-scroll-time"]`).value, 10);
    // 文字数制限なしか字数制限以下はそのままだ
    if (isNaN(subtitleLimit) || translated.length <= subtitleLimit) {
      DelayStreaming(source, translated, timeout, true, false, false, true);
      return;
    }

    // 先に読み上げ
    DelayStreaming(source, translated, timeout, true, false, false, false);

    let remainTimeout = 300;
    if (!isNaN(subtitleScrollTime)) {
      remainTimeout = subtitleScrollTime;
    }

    const scroller = new RTAWSubtitleScroller();
    for await (const tempText of scroller.iterate(translated, remainTimeout, subtitleLimit)) {
      if (listener.status == 'trying') {
        scroller.break();
        break;
      }
      DelayStreaming(source, tempText, timeout, false, false, false, true);
    }

    // LiveLog
    if (document.querySelector('input[name="live-log-use-it"]').checked) {
      const discordapikey = document.querySelector('input[name="live-log-apikey"]').value;
      const discordurlparam1 = document.querySelector('input[name="live-log-param1"]').value;
      const discordurlparam2 = document.querySelector('input[name="live-log-param2"]').value;
      livelog.exec(text, translated, discordapikey, discordurlparam1, discordurlparam2);
    }
    // overflowに登録
    overflow.setTempTranslate(translated);
  };
  translate.onerror = (text, error) => {
    const output = document.querySelector('div[name="ForeignLang"]');
    output.textContent = "[ERROR] " + error;
    // LiveLog
    if (document.querySelector('input[name="live-log-use-it"]').checked) {
      const discordapikey = document.querySelector('input[name="live-log-apikey"]').value;
      const discordurlparam1 = document.querySelector('input[name="live-log-param1"]').value;
      const discordurlparam2 = document.querySelector('input[name="live-log-param2"]').value;
      livelog.exec(text, error, discordapikey, discordurlparam1, discordurlparam2);
    }
  };

  // 辞書
  const file = document.querySelector('input[name="speech-recognition-dictionary"]');
  file.addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = function(event) {
      listener.setDictionary(JSON.parse(event.target.result));
    }
    reader.readAsText(e.target.files[0]);
  });


  //** 話者適用 */
  document.querySelector('div[name="speaker-adaptation-submit"]').onclick = function() {
    if (listener.isRecognizing) {
      alert('Do not use while SpeechRecognizing.');
      return;
    }

    const lang =
      document.querySelector('input[name="speech-recognition-lang"]').value || 'ja-JP';
    const continuity = false;  // 辞書登録用なので継続性は不要
    const target = document.querySelector('input[name="speaker-adaptation-target"]');

    target.classList.remove('status-ng');
    if (!target.value) {
      target.classList.add('status-ng');
      return;
    }

    adaptation.ontrying = (text) => {
      console.log('adaptation-trying', text);

      const diagnostic = document.querySelector('div[name="NativeLang"]');
      diagnostic.classList.remove('final');
      diagnostic.textContent = text;
    };
    adaptation.ondone = (text) => {
      console.log('adaptation-done', text);

      const diagnostic = document.querySelector('div[name="NativeLang"]');
      diagnostic.classList.add('final');
      diagnostic.textContent = text;

      // 辞書登録判定
      // メモリに登録しておく
      if (target.value != text) {
        adaptation.addDictionary(text, target.value);
        adaptation.tempSaveDictionary(listener);
      }
    };
    adaptation.onend = () => {
      console.log('adaptation-end');
    };
    adaptation.start(lang, continuity);
  };

  document.querySelector('div[name="speaker-adaptation-permanent-save-submit"]').onclick = async function(e) {
    await listener.permanentSaveDictionary();
  };

});

/**
 * 音声合成処理.
 * @param {string} text speakする文字列
 * @param {string} targetName voice-target-native / voice-target-foreign (母国語か外国語か)
 * @param {boolean} isPrioritize 優先するか？(true: する / false: しない)
 */
function AlpataSpeaks(text, targetName, isPrioritize) {
  if (!document.querySelector('input[name="voice-use-it"]').checked) {
    return;
  }
  if (isPrioritize) {
    // 優先するものが来たらキューを消す
    speechSynthesis.cancel();
  }
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

function DelayStreaming(sourceName, text, timeout, isSpeak, isTranslate, isInterim, isStream) {
  // OBSに送信するけど別に待たなくていい
  if (isStream) {
    obssocket.toOBS(text,
      document.querySelector(`input[name="obs-text-${sourceName}-source"]`).value || sourceName,
      timeout, isInterim);
  }
  if (isSpeak) {
    // 読み上げる
    AlpataSpeaks(text, `voice-target-${sourceName}`, sourceName == 'native');
  }
  if (isTranslate) {
    // 翻訳情報取得
    const apikey = document.querySelector('input[name="gas-deploy-key"]').value || 'AKfycbx76Gd_ytJJxInNVqVMUhEXpzEL1zsZpb_vRw-Z7S3ZR6n-5dM'
    const source = document.querySelector('input[name="gas-source"]').value || 'ja'
    const target = document.querySelector('input[name="gas-target"]').value || 'en'
    translate.exec(text, apikey, source, target);
  }
}
