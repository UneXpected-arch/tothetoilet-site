// public/game/js/leaderboard.js

document.addEventListener("DOMContentLoaded", () => {
  const leaderboardContainer = document.getElementById("wipe-leader");

  // Create the leaderboard UI
  leaderboardContainer.innerHTML = `
    <div id="leaderboard-panel" style="padding:10px; background:rgba(14,35,65,.9); border-radius:12px; max-width:320px; margin:10px auto; font-family:sans-serif; color:white;">
      <h3 style="margin:0 0 8px; text-align:center;">🏆 Top Degens</h3>
      <ul id="leaderboard-list" style="list-style:none; padding:0; margin:0; font-size:14px;"></ul>
    </div>
  `;

  const list = document.getElementById("leaderboard-list");

  // Load initial leaderboard from server (if API exists)
  async function loadLeaderboard() {
    try {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("No leaderboard data");
      const data = await res.json();
      renderList(data);
    } catch (err) {
      console.warn("Leaderboard unavailable:", err);
    }
  }

  // Render leaderboard entries
  function renderList(entries) {
    list.innerHTML = "";
    entries.forEach((e, i) => {
      const li = document.createElement("li");
      li.textContent = `${i + 1}. ${e.name} — ${e.score}`;
      list.appendChild(li);
    });
  }

  // Save score to server
  async function saveScore(score) {
    try {
      const name = prompt("Enter your Degen Name:", "Anon");
      if (!name) return;
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, score })
      });
      if (res.ok) {
        loadLeaderboard();
      }
    } catch (err) {
      console.error("Failed to save score:", err);
    }
  }

  // Listen for gameOver event from index.html
  window.addEventListener("gameOver", e => {
    const score = e.detail.score;
    saveScore(score);
  });

  loadLeaderboard();
});
