class RTAWLiveLog {

  constructor() { };

  exec = (text, translated, apikey, param1, param2) => {
    const self = this;

    if (text === "") {
      return;
    }
    // Discordに投げる
// AKfycbxzJr1bb-yZ_VxrhA1GJCmidRiaVIGPnMvP0BEBk2aZCT_afxw
// 837393923076784228
// RdKnaFYPngaQ2A69Lnr7vpQnFxT4gY4PNKeVqWhzLcGdUSqrSt7tI4yGoO1PzyaEIRKg
    console.log(
      `https://script.google.com/macros/s/${apikey}/exec?text=${(text)}&translated=${translated}&param1=${param1}&param2=${param2}`)
    $.ajax({
      url: `https://script.google.com/macros/s/${apikey}/exec?text=${(text)}&translated=${translated}&param1=${param1}&param2=${param2}`,
      dataType: "jsonp",
      jsonpCallback: "test",
      timeout: 10000
    }).done(function(data) {
      console.log(data);
    })
    .fail(function(data) {
      console.log(data);
    });
  };

};

/** JSONP用のダミーコールバック. */
function test() { }
