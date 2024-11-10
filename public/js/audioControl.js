document.addEventListener('DOMContentLoaded', function () {
  const audioUrl = '/audio/Absurd.mp3'; // Path to your audio file
  let audio = new Audio(audioUrl);
  audio.loop = true;

  // Check if the audio was previously playing
  if (localStorage.getItem('audioPlaying') === 'true') {
    audio.play().catch((error) => console.error('Playback error:', error));
  }

  // Play and Mute Button Elements
  const playButton = document.getElementById('play-button');
  const muteButton = document.getElementById('mute-button');

  // Set initial button text
  playButton.textContent = audio.paused ? 'Play' : 'Pause';
  muteButton.textContent = audio.muted ? 'Unmute' : 'Mute';

  // Play/Pause functionality
  playButton.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().catch((error) => console.error('Error playing audio:', error));
      localStorage.setItem('audioPlaying', 'true');
      playButton.textContent = 'Pause';
    } else {
      audio.pause();
      localStorage.setItem('audioPlaying', 'false');
      playButton.textContent = 'Play';
    }
  });

  // Mute/Unmute functionality
  muteButton.addEventListener('click', () => {
    audio.muted = !audio.muted;
    muteButton.textContent = audio.muted ? 'Unmute' : 'Mute';
  });

  // Save audio state on unload (in case of navigation)
  window.addEventListener('beforeunload', () => {
    localStorage.setItem('audioPlaying', !audio.paused);
    localStorage.setItem('audioMuted', audio.muted);
  });

  // Restore audio mute state
  if (localStorage.getItem('audioMuted') === 'true') {
    audio.muted = true;
    muteButton.textContent = 'Unmute';
  }
});
