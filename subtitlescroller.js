class RTAWSubtitleScroller {

  #isBreak;

  constructor() { };

  #sleep = async (timer) => {
    return new Promise(resolve => setTimeout(resolve, timer));
  }

  iterate = async function* (text, remain, limit) {
    const self = this;

    const count = text.length - limit

    // First Attackのみちょっと時間をかける
    yield text.substr(0, Math.min(text.length, limit));    
    await self.#sleep(1000);

    for (let i = 1; i < count; i++) {
      if (self.#isBreak) {
        return;
      }
      await self.#sleep(remain);
      yield text.substr(i + 1, Math.min(text.length, limit));
    }

  };

  break = () => {
    const self = this;

    self.#isBreak = true;
  };
};
