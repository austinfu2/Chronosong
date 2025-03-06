// Spotify credentials
const clientId = "41145da745e74ef8bb6e57a16a98997e";
const redirectUri = "https://chronosong.vercel.app/";
const scopes = "user-read-email user-read-private user-modify-playback-state user-read-playback-state streaming app-remote-control";

// Game state
let round = 1;
let score = 0;
const totalRounds = 10;
let currentSongYear;
const rankings = [];
let token;
let player;
let deviceId;
let isPlaying = false;
let sdkReady = false;

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
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}&show_dialog=true`; // Force fresh login
    window.location.href = authUrl;
}

function getTokenFromUrl() {
    const hash = window.location.hash.substring(1).split("&").reduce((acc, item) => {
        const [key, value] = item.split("=");
        acc[key] = value;
        return acc;
    }, {});

    if (hash.access_token) {
        token = hash.access_token;
        console.log("Token set:", token);
        window.location.hash = "";

        if (sdkReady) {
            setupPlayer();
        } else {
            console.log("Token received, but SDK not ready. Waiting...");
            const checkSDK = setInterval(() => {
                if (sdkReady) {
                    setupPlayer();
                    clearInterval(checkSDK);
                }
            }, 500);
        }
    } else {
        console.error("No access token found in URL");
    }
}

// Spotify player setup
window.onSpotifyWebPlaybackSDKReady = () => {
    console.log("Spotify SDK loaded");
    sdkReady = true;
    if (token) {
        setupPlayer();
    } else {
        console.log("SDK ready, waiting for token...");
    }
};

function setupPlayer() {
    if (!sdkReady || !window.Spotify) {
        console.error("Spotify SDK not loaded yet");
        return;
    }
    player = new window.Spotify.Player({
        name: "ChronoSong Player",
        getOAuthToken: cb => cb(token),
        volume: volumeSlider.value / 100
    });

    player.addListener("ready", ({ device_id }) => {
        console.log("Player ready with Device ID:", device_id);
        if (device_id) {
            deviceId = device_id;
            activateDevice(device_id);
        } else {
            console.error("Failed to retrieve device ID. Retrying in 2 seconds...");
            setTimeout(setupPlayer, 2000);
        }
    });

    player.addListener("not_ready", ({ device_id }) => {
        console.log("Device offline:", device_id);
    });

    player.connect().then(success => {
        if (success) console.log("Player connected successfully.");
        else console.error("Player connection failed.");
    }).catch(err => console.error("Player connect error:", err));
}

function activateDevice(deviceId) {
    console.log("Activating device:", deviceId);

    fetch("https://api.spotify.com/v1/me/player/play?device_id=" + deviceId, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            uris: ["spotify:track:4uLU6hMCjMI75M1A2tKUQC"] // Example song
        })
    })
    .then(response => {
        if (!response.ok) throw new Error(`Activation failed: ${response.status}`);
        console.log("Device activated!");
        startRound();
    })
    .catch(err => console.error("Activation error:", err));
}

// Player controls
playPauseBtn.addEventListener("click", () => {
    if (isPlaying) player.pause();
    else player.resume();
});

seekSlider.addEventListener("input", () => {
    player.seek(seekSlider.value * 1000);
});

volumeSlider.addEventListener("input", () => {
    player.setVolume(volumeSlider.value / 100);
});

// Game logic
async function startRound() {
    try {
        nowPlaying.textContent = "Loading song...";
        const song = await getRandomSong();
        if (!song || !song.album) throw new Error("Invalid song data");
        currentSongYear = new Date(song.album.release_date).getFullYear();
        roundSpan.textContent = round;
        scoreSpan.textContent = score;
        result.textContent = "";
        nowPlaying.textContent = `${song.name} by ${song.artists[0].name}`;
        seekSlider.value = 0;
        playSong(song.uri);
    } catch (error) {
        console.error("Start round error:", error);
        nowPlaying.textContent = "Failed to load song. Retrying...";
        setTimeout(startRound, 2000);
    }
}

async function getRandomSong() {
    const queries = ["pop", "rock", "jazz", "hits", "2020s"];
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
        const query = queries[Math.floor(Math.random() * queries.length)];
        try {
            const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=50`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Search failed: ${response.status}`);
            const data = await response.json();
            const tracks = data.tracks.items.filter(track => track.popularity >= 30);
            if (tracks.length === 0) {
                console.log(`No tracks for query "${query}", retrying...`);
                attempts++;
                continue;
            }
            return tracks[Math.floor(Math.random() * tracks.length)];
        } catch (error) {
            console.error(`Search attempt ${attempts + 1} failed:`, error);
            attempts++;
        }
    }
    throw new Error("No valid tracks found after max attempts");
}

function playSong(uri) {
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ uris: [uri], position_ms: 0 })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(`Play failed: ${response.status} - ${err.error.message} (${err.error.reason})`);
            });
        }
        console.log(`Playing ${uri}`);
        isPlaying = true;
        playPauseBtn.textContent = "Pause";
    })
    .catch(err => {
        console.error("Play error:", err);
        nowPlaying.textContent = `Play error: ${err.message}. Skipping...`;
        setTimeout(startRound, 1000);
    });
}

slider.addEventListener("input", () => {
    selectedYearSpan.textContent = slider.value;
});

guessBtn.addEventListener("click", () => {
    player.pause();
    const guess = parseInt(slider.value);
    const diff = Math.abs(guess - currentSongYear);
    let roundScore = diff >= 10 ? 0 : Math.round(100 * Math.pow(0.5, diff / 2));

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
    player.pause();
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
    console.log("OAuth Token:", token);
    console.log("Device ID:", deviceId);
} else {
    console.log("Please log in to start");
}
