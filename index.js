var listener = new RTAWListener();
var obssocket = new RTAWOBSWebSocket();
var translate = new RTAWTranslate();
var livelog = new RTAWLiveLog();
var adaptation = new RTAWSpeakerAdaptation();
var overflow = new RTAWOverflow();
var spcommand = new RTAWSpeechCommands();
var emotion = new RTAWEmotion();

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
    createVoiceList('select[name="voice-target-foreign2"]');

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
    obssocket.onclose = (event) => {
      console.log('obswebsocket-close', event);

      status.setAttribute('title', 'CLOSE');
      status.classList.remove('status-ok');
      status.classList.remove('status-ng');

      if (document.querySelector('input[name="obs-auto-reconnect"]').checked) {
        obssocket.start(ipaddr, port, password, protocol);
      }
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

      // リスナーが終わるまで感情表現を固定する
      if (emotion.isstart) {
        emotion.blocking(true);
        // 感情表現のPrefixがあればつける
        text = text + emotion.currenteadjust['prefix'];
      }

      overflow.timerStart();
      overflow.setTempText(text);

      let diagnostic = document.querySelector('div[name="NativeLang"]');
      diagnostic.classList.add('final');
      diagnostic.textContent = text;

      // コマンド登録
      if (spcommand.isStart) {
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
      // 感情表現の固定を解除する
      if (emotion.isstart) {
        emotion.blocking(false);
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

    let usespcommand = false;
    // リプレイ機能をスタート
    if (document.querySelector('input[name="obs-replay-use-it"]').checked) {
      const key1 = document.querySelector('input[name="obs-replay-keyword-save"]').value;
      const key2 = document.querySelector('input[name="obs-replay-keyword-move"]').value;
      const scene = document.querySelector('input[name="obs-replay-scene"]').value;
      spcommand.addReplayKeywords(key1, key2, scene);
      usespcommand = true;
    }

    // シーン切り替え機能をスタート
    if (document.querySelector('input[name="obs-sceneswitcher-use-it"]').checked) {
      const key1 = document.querySelector('input[name="obs-sceneswitcher-keyword-move"]').value;
      const key2 = document.querySelector('input[name="obs-sceneswitcher-keyword-return"]').value;
      const scene1 = document.querySelector('input[name="obs-sceneswitcher-scene-base"]').value;
      const scene2 = document.querySelector('input[name="obs-sceneswitcher-scene-move"]').value;
      spcommand.addSceneswKeyword(key1, key2, scene1, scene2);
      usespcommand = true;
    }

    if (usespcommand) {
      spcommand.doReplay = (scene, issave) => {
        if (!issave) {
          obssocket.setCurrentScene(scene);
          return;
        }
        obssocket.saveReplayBuffer();
      };
      spcommand.doSceneSwitch = (scene) => {
        obssocket.setCurrentScene(scene);
      };
      spcommand.start();
    }
    
    // livelog機能をスタート
    if (document.querySelector('input[name="live-log-use-it"]').checked) {
      const discordapikey = document.querySelector('input[name="live-log-apikey"]').value;
      const discordurlparam1 = document.querySelector('input[name="live-log-param1"]').value;
      const discordurlparam2 = document.querySelector('input[name="live-log-param2"]').value;
      livelog.start(10000, discordapikey, discordurlparam1, discordurlparam2);
      console.log('livelog start');
    }

    // emotion機能をスタート
    if (document.querySelector('input[name="emotion-use-it"]').checked) {
      const emotionkey = document.querySelector('input[name="emotion-key"]').value;
      // 嬉しい
      const happypitch = parseFloat(document.querySelector('input[name="emotion-happy-pitch"]').value, 10) || 0;
      const happyrate = parseFloat(document.querySelector('input[name="emotion-happy-rate"]').value, 10) || 0;
      const happyprefix = document.querySelector('input[name="emotion-happy-prefix"]').value || '';
      // 悲しい
      const sadpitch = parseFloat(document.querySelector('input[name="emotion-sad-pitch"]').value, 10) || 0;
      const sadrate = parseFloat(document.querySelector('input[name="emotion-sad-rate"]').value, 10) || 0;
      const sadprefix = document.querySelector('input[name="emotion-sad-prefix"]').value || '';
      // 驚き
      const surprisedpitch = parseFloat(document.querySelector('input[name="emotion-surprised-pitch"]').value, 10) || 0;
      const surprisedrate = parseFloat(document.querySelector('input[name="emotion-surprised-rate"]').value, 10) || 0;
      const surprisedprefix = document.querySelector('input[name="emotion-surprised-prefix"]').value || '';
      // 怒り
      const angrypitch = parseFloat(document.querySelector('input[name="emotion-angry-pitch"]').value, 10) || 0;
      const angryrate = parseFloat(document.querySelector('input[name="emotion-angry-rate"]').value, 10) || 0;
      const angryprefix = document.querySelector('input[name="emotion-angry-prefix"]').value || '';
      // 恐れ
      const fearfulpitch = parseFloat(document.querySelector('input[name="emotion-fearful-pitch"]').value, 10) || 0;
      const fearfulrate = parseFloat(document.querySelector('input[name="emotion-fearful-rate"]').value, 10) || 0;
      const fearfulprefix = document.querySelector('input[name="emotion-fearful-prefix"]').value || '';
      // うんざり
      const disgustedpitch = parseFloat(document.querySelector('input[name="emotion-disgusted-pitch"]').value, 10) || 0;
      const disgustedrate = parseFloat(document.querySelector('input[name="emotion-disgusted-rate"]').value, 10) || 0;
      const disgustedprefix = document.querySelector('input[name="emotion-disgusted-prefix"]').value || '';
      // パラメーターを作って開始する
      emotion.start(emotionkey, {
        "neutral": { "pitch": 0, "rate": 0, "prefix": "" },
        "happy": { "pitch": happypitch, "rate": happyrate, "prefix": happyprefix },
        "sad": { "pitch": sadpitch, "rate": sadrate, "prefix": sadprefix },
        "surprised": { "pitch": surprisedpitch, "rate": surprisedrate, "prefix": surprisedprefix },
        "angry": { "pitch": angrypitch, "rate": angryrate, "prefix": angryprefix },
        "fearful": { "pitch": fearfulpitch, "rate": fearfulrate, "prefix": fearfulprefix },
        "disgusted": { "pitch": disgustedpitch, "rate": disgustedrate, "prefix": disgustedprefix },
      });
      console.log('emotion start');
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
  translate.ondone = async (text, translated, is2ndLang) => {
    const output = document.querySelector('div[name="ForeignLang"]');
    output.classList.add('final');
    output.textContent = translated;

    // LiveLog
    if (document.querySelector('input[name="live-log-use-it"]').checked) {
      if (!is2ndLang) {
        if (emotion.isstart) {
          text = `(${emotion.currentemote})` + text;
        }
        livelog.exec(text, translated);
      }
    }
    // overflowに登録
    overflow.setTempTranslate(translated, is2ndLang);

    // 翻訳結果のスクロール処理
    let source = document.querySelector('input[name="obs-text-foreign-source"]').value || 'foreign';
    if (is2ndLang) {
      source = document.querySelector('input[name="obs-text-foreign2-source"]').value || 'foreign2';
    }
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
  };
  translate.onerror = (text, error) => {
    const output = document.querySelector('div[name="ForeignLang"]');
    output.textContent = "[ERROR] " + error;
    // LiveLog
    if (document.querySelector('input[name="live-log-use-it"]').checked) {
      livelog.exec(text, error);
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

  if (emotion.isstart) {
    utter.pitch += emotion.currenteadjust['pitch'];
    utter.rate += emotion.currenteadjust['rate'];
  }

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
    const target2 = document.querySelector('input[name="gas-target-2"]').value || ''
    translate.exec(text, apikey, source, target, target2);
  }
}
