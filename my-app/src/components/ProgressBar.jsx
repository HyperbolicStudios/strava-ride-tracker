function fadeColor(color, opacity) {
  return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`;
}

export default function ProgressBar({ label, percent, progressColor='green', backgroundColor=null}) {
  if (backgroundColor === null) {
    //set backgroundColor to be the progressColor, but faded
    backgroundColor = fadeColor(progressColor, 0.3); // add 33 for 20% opacity
  }

  return (
    <div class="progress-bar-container">
      <label class="progress-bar-label">{label}</label>
      <div class="progress-bar-background" style={{ backgroundColor }}>
        <div class="progress-bar-fill" style={{ backgroundColor: progressColor, width: `${percent}%` }}>
          <span class="progress-bar-percentage">{(percent)}%</span>
        </div>
      </div>

    </div>
      
  );
}