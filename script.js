// Spotify credentials
const clientId = "41145da745e74ef8bb6e57a16a98997e";
const redirectUri = "https://chronosong.vercel.app/";
const scopes = "streaming user-read-email user-read-private user-modify-playback-state";

// Spotify credentials
const clientId = "YOUR_CLIENT_ID_HERE"; // Replace with your Client ID
const redirectUri = "http://localhost:3000/"; // Update for Vercel later

// Game state
let round = 1;
let score = 0;
const totalRounds = 10;
let currentSongYear;
const rankings = [];
let token;
let audio;

// DOM elements
const loginBtn = document.getElementById("login-btn");
const spotifyPlayer = document.getElementById("spotify-player");
const nowPlaying = document.getElementById("now-playing");
const playPauseBtn = document.getElementById("play-pause-btn");
const seekSlider = document.getElementById("seek-slider");
const volumeSlider = document.getElementById("volume-slider");
const gameContainer = document.getElementById("game-container");
const slider = document.getElementById("year-slider");
const selectedYearSpan = document.getElementById("selected-year");
const guessBtn = document.getElementById("guess-btn");
const roundSpan = document.getElementById("round");
const scoreSpan = document.getElementById("score");
const result = document.getElementById("result");
const finalScoreDiv = document.getElementById("final-score");
const finalScoreValue = document.getElementById("final-score-value");
const rankingsList = document.getElementById("rankings");
const playAgainBtn = document.getElementById("play-again");

// Auth functions
function generateRandomString(length) {
    return Array(length).fill(0).map(() => Math.random().toString(36)[2]).join("");
}

function login() {
    const state = generateRandomString(16);
    localStorage.setItem("spotify_auth_state", state);
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user-read-private&state=${state}`;
    window.location = authUrl;
}

function getTokenFromUrl() {
    const hash = window.location.hash.substring(1).split("&").reduce((acc, item) => {
        const [key, value] = item.split("=");
        acc[key] = value;
        return acc;
    }, {});
    console.log("Hash:", hash);
    const storedState = localStorage.getItem("spotify_auth_state");
    if (hash.state === storedState && hash.access_token) {
        token = hash.access_token;
        console.log("Token set:", token);
        window.location.hash = "";
        localStorage.removeItem("spotify_auth_state");
        loginBtn.style.display = "none";
        spotifyPlayer.style.display = "block";
        gameContainer.style.display = "block";
        startRound();
    } else {
        console.error("Auth failed. Hash state:", hash.state, "Stored state:", storedState);
    }
}

// Player controls
audio = new Audio();
audio.addEventListener("timeupdate", () => {
    seekSlider.value = audio.currentTime;
});
audio.addEventListener("loadedmetadata", () => {
    seekSlider.max = audio.duration;
});

playPauseBtn.addEventListener("click", () => {
    if (audio.paused) {
        audio.play();
        playPauseBtn.textContent = "Pause";
    } else {
        audio.pause();
        playPauseBtn.textContent = "Play";
    }
});

seekSlider.addEventListener("input", () => {
    audio.currentTime = seekSlider.value;
});

volumeSlider.addEventListener("input", () => {
    audio.volume = volumeSlider.value / 100;
});

// Game logic
async function startRound() {
    const song = await getRandomSong();
    currentSongYear = new Date(song.album.release_date).getFullYear();
    roundSpan.textContent = round;
    scoreSpan.textContent = score;
    result.textContent = "";
    nowPlaying.textContent = `${song.name} by ${song.artists[0].name}`;
    seekSlider.value = 0;
    playSong(song.preview_url);
}

async function getRandomSong() {
    const query = generateRandomString(2);
    const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=50`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await response.json();
    const tracks = data.tracks.items.filter(track => track.popularity >= 30 && track.preview_url);
    return tracks[Math.floor(Math.random() * tracks.length)];
}

function playSong(url) {
    audio.src = url;
    audio.volume = volumeSlider.value / 100;
    audio.play();
    playPauseBtn.textContent = "Pause";
}

slider.addEventListener("input", () => {
    selectedYearSpan.textContent = slider.value;
});

guessBtn.addEventListener("click", () => {
    audio.pause();
    const guess = parseInt(slider.value);
    const diff = Math.abs(guess - currentSongYear);
    let roundScore = diff >= 10 ? 0 : Math.round(100 * Math.pow(0.5, diff / 2)); // Logarithmic drop-off

    score += roundScore;
    result.textContent = `Song year: ${currentSongYear}. You scored: ${roundScore}`;
    scoreSpan.textContent = score;

    round++;
    if (round <= totalRounds) {
        setTimeout(startRound, 2000);
    } else {
        endGame();
    }
});

function endGame() {
    audio.pause();
    finalScoreValue.textContent = score;
    rankings.push(score);
    rankings.sort((a, b) => b - a);
    rankingsList.innerHTML = rankings.map((s, i) => `<li>${i + 1}. ${s}</li>`).join("");
    finalScoreDiv.style.display = "block";
    gameContainer.style.display = "none";
    spotifyPlayer.style.display = "none";
}

playAgainBtn.addEventListener("click", () => {
    round = 1;
    score = 0;
    finalScoreDiv.style.display = "none";
    spotifyPlayer.style.display = "block";
    gameContainer.style.display = "block";
    startRound();
});

// Init
loginBtn.addEventListener("click", login);
if (window.location.hash) {
    console.log("Checking URL for token...");
    getTokenFromUrl();
} else {
    console.log("Please log in to start");
}
