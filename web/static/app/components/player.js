import Episode from "components/episode";
import { u, ajax } from "umbrellajs";

class ChangelogAudio {
  constructor() {
    if (typeof Audio === "undefined") {
      this.canPlay = false;
      return
    } else {
      this.canPlay = true;
    }

    this.audio = new Audio();
  }

  load(file, then) {
    this.audio.addEventListener("canplaythrough", then, false);
    this.audio.src = file;
  }

  play() {
    this.audio.play();
  }

  pause() {
    if (!this.playing()) return;
    this.audio.pause();
  }

  playing() {
    return this.audio.duration > 0 && !this.audio.paused;
  }

  currentSeek() {
    return this.audio.currentTime;
  }

  seek(to) {
    to = parseInt(to, 10);
    if (to < 0) to = 0;
    this.audio.currentTime = to;
  }
}

export default class Player {
  constructor(selector) {
    // not using turbolinks:load event because we want this to run exactly once
    window.onload = () => {
      this.audio = new ChangelogAudio();
      this.attachUI(selector);
      this.attachEvents();
    }
  }

  isPlaying() {
    return this.audio.playing();
  }

  start() {
    if (!this.episode) return;
    this.audio.load(this.episode.audio(), this.play.bind(this));
  }

  play() {
    requestAnimationFrame(this.step.bind(this));
    this.audio.play();
    this.playButton.addClass("is-playing").removeClass("is-paused is-loading");
  }

  pause() {
    this.audio.pause();
    this.playButton.addClass("is-paused").removeClass("is-playing is-loading");
  }

  togglePlayPause() {
    if (this.audio.playing()) {
      this.pause();
    } else {
      this.play();
    }
  }

  seekBy(to) {
    const currentSeek = this.audio.currentSeek() || 0;
    this.audio.seek(currentSeek + to);
  }

  load(episode) {
    this.resetUI();
    this.playButton.addClass("is-loading");
    ajax(episode, {}, (error, data) => {
      this.episode = new Episode(data);
      this.loadUI();
      this.show();
      this.start();
    });
  }

  attachUI(selector) {
    this.container = u(selector);
    this.player = this.container.find(".js-player");
    this.art = this.container.find(".js-player-art");
    this.nowPlaying = this.container.find(".js-player-now-playing");
    this.title = this.container.find(".js-player-title");
    this.prevNumber = this.container.find(".js-player-prev-number");
    this.prevButton = this.container.find(".js-player-prev-button");
    this.nextNumber = this.container.find(".js-player-next-number");
    this.nextButton = this.container.find(".js-player-next-button");
    this.scrubber = this.container.find(".js-player-scrubber");
    this.track = this.container.find(".js-player-track");
    this.duration = this.container.find(".js-player-duration");
    this.current = this.container.find(".js-player-current");
    this.playButton = this.container.find(".js-player-play-button");
    this.backButton = this.container.find(".js-player-back-button");
    this.forwardButton = this.container.find(".js-player-forward-button");
    this.closeButton = this.container.find(".js-player-close");
    this.hideButton = this.container.find(".js-player-hide");
  }

  attachEvents() {
    this.playButton.handle("click", () => { this.togglePlayPause(); });
    this.backButton.handle("click", () => { this.seekBy(-15); });
    this.forwardButton.handle("click", () => { this.seekBy(15); });
    this.scrubber.on("input", (event) => { this.scrub(event.target.value); });
    this.scrubber.on("change", (event) => { this.scrubEnd(event.target.value); });
    this.closeButton.handle("click", () => { this.closePlayer(); });
    this.hideButton.handle("click", () => { this.hide(); });
  }

  loadUI() {
    this.art.attr("src", this.episode.art());
    this.nowPlaying.text(this.episode.nowPlaying());
    this.title.text(this.episode.title());
    this.duration.text(Episode.formatTime(this.episode.duration()));
    this.scrubber.attr("max", this.episode.duration());

    if (this.episode.hasPrev()) {
      this.prevNumber.text(this.episode.prevNumber());
      this.prevButton.data("play", this.episode.prevLocation());
    } else {
      this.prevNumber.text("");
      this.prevButton.first().removeAttribute("data-play");
    }

    if (this.episode.hasNext()) {
      this.nextNumber.text(this.episode.nextNumber());
      this.nextButton.data("play", this.episode.nextLocation());
    } else {
      this.nextNumber.text("");
      this.nextButton.first().removeAttribute("data-play");
    }
  }

  resetUI() {
    this.nowPlaying.text("Loading...");
    this.title.text("");
    this.current.text("0:00");
    this.duration.text("0:00");
    this.prevNumber.text("");
    this.prevButton.first().removeAttribute("data-play");
    this.nextNumber.text("");
    this.nextButton.first().removeAttribute("data-play");
    this.scrubber.first().value = 0;
    this.track.first().style.width = "0%";
  }

  step() {
    const seek = Math.round(this.audio.currentSeek() || 0);
    const percentComplete = seek / this.episode.duration() * 100;

    if (!this.isScrubbing) {
      this.current.text(Episode.formatTime(seek));
      this.scrubber.first().value = seek;
      this.track.first().style.width = `${percentComplete}%`;
    }

    if (this.audio.playing()) {
      requestAnimationFrame(this.step.bind(this));
    }
  }

  scrub(to) {
    this.isScrubbing = true;
    const percentComplete = to / this.episode.duration() * 100;
    this.current.text(Episode.formatTime(to));
    this.track.first().style.width = `${percentComplete}%`;
  }

  scrubEnd(to) {
    this.isScrubbing = false;
    this.audio.seek(to);
  }

  show() {
    this.player.addClass("podcast-player--is-active").removeClass("podcast-player--is-hidden");
  }

  hide() {
    this.player.toggleClass("podcast-player--is-hidden");
  }

  closePlayer() {
    this.pause();
    this.player.removeClass("podcast-player--is-active");
  }
}
