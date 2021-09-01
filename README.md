# ALPACA-RTAW

generAtes reaL-time subtitles in multiPle lAnguages ​​from voiCe recognition And Reads Them Aloud. 
(with obs and obs-Websocket

音声認識からリアルタイムで翻訳し、認識結果と翻訳結果を音声合成で読み上げる。

OBS連携することで、音声認識した文字列と翻訳した文字列をOBS上に表示する。

# 動作環境

- Google Chrome

- OBS + OBS-Websocket

- localhost.run (またはngrokなど他のstunnelツール)

## localhost.run の使い方

OBSの動いてるPC上でコマンドプロンプトを開いて以下を実行する。

```shell
> ssh -R 80:localhost:(OBS-WebSocketで指定したポート番号) localhost.run
```

コマンドに失敗する場合は[FAQ](http://localhost.run/docs/faq)を見ること。

「xxxxxx.localhost.run tunneled with tls termination」と出れば完了。

ALPACARTAWから繋ぐには、IPAddrにxxxxxx.localhost.run、Portに443を指定する。

# SpeechRecognition

## Recognize continuity

音声認識が行われるたびに、継続的に結果を返すのか、あるいは1つの結果のみ返すのかを制御する。（ON：する / OFF：しない）

デフォルト：する

## Recognize lang

音声認識する言語を設定する。

デフォルト：ja_JP

## Dictionary

音声認識結果に適用する**UTF8**エンコーディングで**JSON形式**の辞書を設定する。

デフォルト：なし

## Start

音声認識を開始する。

# Speaker adaptation (v1.3 -)

音声認識結果に適用する辞書をトレーニングにより生成する。

## Adapt target

トレーニングしたい文字列を設定する。

デフォルト：なし

## Training

トレーニングを開始する。

- 実行にはAdapt targetの設定が必須

- 音声認識はNative outputに出力される

トレーニングが正しく行われた場合、即座に現時点の読み込み済みの辞書を更新する。（ファイルには保存しない

## FileSave

辞書をローカル保存する。

# Speech translate settings

## GAS deploy key

翻訳機能を持つgoogle apps scriptのデプロイキーを設定する。

デフォルト：アルパカさんの

落ちてる場合は自分で用意すること。

``` js
// サンプル
function doGet(e) {
  var p = e.parameter;
  var translatedText = LanguageApp.translate(p.text, p.source, p.target);
  return ContentService.createTextOutput(e.parameter.callback + '({"translated" : "' + translatedText + '"});').setMimeType(ContentService.MimeType.JAVASCRIPT);
}
```

## Native lang

母国語を設定する。

デフォルト：ja

## Foreign lang

翻訳対象の言語を設定する。

デフォルト：en

## Foreign lang 2

翻訳対象の第二言語を設定する。未指定なら翻訳しない。

デフォルト：なし

## Test

翻訳をテスト実行する。

テスト文字列は日本語なので、NativeLangには"ja"を設定しておくこと。

# Speech voice settings

## Native voice

母国語の音声を設定する。

デフォルト：取得可能な音声一覧の先頭

## Volume

母国語の音声の音量を設定する。

デフォルト：1

## Pitch

母国語の音声の音程を設定する。

デフォルト：1

## Rate

母国語の音声の速度を設定する。

デフォルト：1

## Test

母国語で音声合成をテスト実行する。

## Foreign voice / Foreign voice2

翻訳対象の言語の音声を設定する。

デフォルト：取得可能な音声一覧の先頭

## Volume

翻訳対象の言語の音声の音量を設定する。

デフォルト：1

## Pitch

翻訳対象の言語の音声の音程を設定する。

デフォルト：1

## Rate

翻訳対象の言語の音声の速度を設定する。

デフォルト：1

## Test

翻訳対象の言語で音声合成をテスト実行する。

# OBS connection settings

[OBS](https://obsproject.com/ja)と[OBS-Websocket](https://github.com/Palakis/obs-websocket)の設定をしておくこと。

## 動作確認環境

OBS：26.1.1

OBS-Websocket：4.9.0

## Auto reconnect

OBSとの接続が切れた場合に自動で再接続するか？（ON：する / OFF：しない）

デフォルト：OFF

## IPAddr

OBSがインストールされているPCのIPv4アドレスを設定する。

デフォルト：localhost

## Port

OBS-Websocketで設定したポート番号を指定する。

デフォルト：4444

## Password

OBS-Websocketで設定したパスワードを指定する。

## Connect

OBSに接続する。状態はボタン右に表示される。

- OPEN

OBSとの接続を開始した。

- CONNECTED

OBSとの接続が完了した。

- ERROR

OBSとの接続に失敗した。

# OBS TextGDIPlus settings

## Native source

母国語表示用のOBSのテキストソース名を設定する。

デフォルト：native

## Foreign source

翻訳対象の言語のOBSのテキストソース名を設定する。

デフォルト：foreign

## Foreign source 2

翻訳対象の第二言語のOBSのテキストソース名を設定する。

デフォルト：foreign2

## Silent breaker source

該当機能用のOBSのテキストソース名を設定する。

デフォルト：silent

## Timeout

OBSのテキストソースに表示された字幕が消えるまでの時間（ミリ秒）。

デフォルト：未設定

- 未設定、数値として評価できない場合は消えない

- 1000ms未満の場合は5000msになる

## Subtitle limit

OBSのテキストソースに表示するテキストの最大長。

デフォルト：未設定

- 未設定、数値として評価できない場合は制限しない

最大長を超えて文字列が表示される場合

- 未確定状態の場合

最大長を超えないように左にパディングするみたいな雰囲気。

- 確定状態の場合

Subtitle scroll timeで指定した時間ごとに自動スクロールする。

## Subtitle scroll time

Subtitle limitが有効の場合、確定状態のスクロールする時間。（ミリ秒）

デフォルト：300ms

## Use interimResults

Windowsのみ

音声認識の途中経過を取得するか？（ON：する / OFF：しない）

デフォルト：OFF

この機能をONにした場合、以下の処理が発生する。

- OBSに途中経過を送信する。
- 「Native source」で指定したテキストソースに「rtawfilter」という名前のフィルターがかかっている場合、それを以下のように制御する。

-> 途中経過の場合はフィルターをON

-> 確定した場合はフィルターをOFF

例えば、予め色補正フィルター（不透明度50など）を付けておくことで途中経過は半透明、確定したらフィルターが外れて不透明になる。といったことができる。

# Replay settings

音声コマンドでリプレイを表示する。

- OBSのリプレイバッファを有効にすること。

- 本機能には OBSプラグイン「Advanced Scene Switcher」もしくは相当の機能が必要。（リプレイ再生後のシーン戻し用）

- 本機能には OBSプラグイン「Directory waitch miedia」もしくは相当の機能が必要。（リプライバッファ最新保存をメディアソースに自動設定する用）

## Use replay

Replay機能を有効にする。（ON：する / OFF：しない）

デフォルト：OFF

## keyword - Save

Replayを保存する音声コマンドを設定する。

デフォルト：なし

## keyword - Move

Replayを再生するためのシーン切り替え音声コマンドを設定する。

デフォルト：なし

## Replay scene

keyword - Move コマンドで移動するシーン名を設定する。

デフォルト：なし

# Overflow settings

確定された字幕がすぐに流れないように過去ログを一定時間別枠表示する。

## Use overflow

Overflow機能を有効にする。（ON：する / OFF：しない）

デフォルト：OFF

## Overflow source

該当機能表示用のOBSのテキストソース名を設定する。

デフォルト：overflow

- 過去の字幕は生成時刻の降順（新しいものが上）で送出される

## Overflow start timeout

字幕を別枠表示対象にするまでの時間。（ミリ秒）

デフォルト：10000

ここで指定した時間内に新たな字幕入力が発生した場合、別枠表示が発生する。

## Overflow keep timeout

字幕を別枠表示し続ける時間。（ミリ秒）

デフォルト：30000

ここで指定した時間内は字幕が別枠表示で維持される。

## Overflow limit

別枠表示する字幕の行数。

デフォルト：3

ここで指定した行数だけ字幕が別枠表示で維持される。
この数値を超えた場合、Overflow keep timeoutの設定は無視され、生成時刻の古い字幕から消去する。

## Overflow resolution

別枠表示中の字幕の表示残り時間を確認する間隔を決定する指標値。

デフォルト：3

ここで指定した回数、Overflow keep timeoutの時間内に字幕の表示残り時間をチェックする。

数値が高いほど正確な時間を刻めるが、負荷も上がるので環境に合わせて適宜調整する。

## Overflow format

別枠表示中に使用する字幕のフォーマットを指定する。

デフォルト：${text}(${translate})

- ${text}

母国語の字幕に置換される。

- ${translate}

外国語の字幕に置換される。

ただし、翻訳処理の解決前に新たな字幕入力が発生した場合は、外国語の字幕は空文字で置換される。

# Silent breaker settings

~~SilentBreaker機能は、無言状態を検知すると起動し、任意の文字列をOBSに送出、読み上げる。~~

本機能の提供は終了した。

# LiveLog settings

Discordに字幕と同じ文章をロギングする機能。

この機能はGoogleScriptApp経由でDiscordのWEBHOOKを呼び出すようにしている。

# Use live log

LiveLog機能を有効にする。（ON：する / OFF：しない）

デフォルト：OFF

## API key

DiscordのWEBHOOKを呼び出す実装をしたGASのAPIキー。

デフォルト：なし

実装サンプルは下記参照。

```javascript
function doGet(e) {
  var p = e.parameter;

  const WEBHOOK_URL = "https://discord.com/api/webhooks/" + p.param1 + "/" + p.param2; //取得したWebhookURLを追加

  const payload = {
    username: p.name,
    content: p.text + "(" + p.translated + ")",
  };

  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
  });
}
```

## Param1 & Param2

DiscordのWEBHOOKのURLの一部を設定する。

https://discord.com/api/webhooks/**Param1**/**Param2**

デフォルト：なし

# 特記

- 各項目はパスワード以外クライアントPCに保存し、パスワードのみ画面を閉じると削除する。
