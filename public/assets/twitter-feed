// public/assets/twitter-feed.js
async function loadTweets() {
  try {
    const res = await fetch('/api/twitter-media');
    const data = await res.json();
    const tweetsContainer = document.getElementById('tweets');

    if (!data.data) {
      tweetsContainer.innerHTML = '<p>Unable to load tweets.</p>';
      return;
    }

    tweetsContainer.innerHTML = data.data.map(tweet => {
      const date = new Date(tweet.created_at);
      return `
        <div class="tweet">
          <p>${tweet.text}</p>
          <time>${date.toLocaleString()}</time>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading tweets', err);
    document.getElementById('tweets').innerHTML = '<p>Failed to load tweets.</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadTweets);
