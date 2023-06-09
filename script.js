// Get the hash of the url
const hash = window.location.hash
  .substring(1)
  .split("&")
  .reduce(function(initial, item) {
    if (item) {
      var parts = item.split("=");
      initial[parts[0]] = decodeURIComponent(parts[1]);
    }
    return initial;
  }, {});
window.location.hash = "";

// Set token
let _token = hash.access_token;

const authEndpoint = "https://accounts.spotify.com/authorize";

// Replace with your app's client ID, redirect URI and desired scopes
const clientId = "dbaf8fe7fce641d98710a68e488edf81";
const redirectUri = "https://chronosong2.pages.dev";
const scopes = [
  "streaming",
  "user-modify-playback-state",
  "user-library-modify"
];

// If there is no token, redirect to Spotify authorization
if (!_token) {
  window.location = `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join(
    "%20"
  )}&response_type=token`;
}

// Set up the Web Playback SDK
let deviceId;
let ids = [];

window.onSpotifyPlayerAPIReady = () => {
  const player = new Spotify.Player({
    name: "Big Spotify Button",
    getOAuthToken: cb => {
      cb(_token);
    }
  });

  // Error handling
  player.on("initialization_error", e => console.error(e));
  player.on("authentication_error", e => console.error(e));
  player.on("account_error", e => console.error(e));
  player.on("playback_error", e => console.error(e));

  // Playback status updates
  player.on("player_state_changed", state => {
   // console.log(state);
  });

  // Ready
  player.on("ready", data => {
  //  console.log("Ready with Device ID", data.device_id);
    deviceId = data.device_id;
  });

  // Connect to the player!
  player.connect();
};

// Play a specified track on the Web Playback SDK's device ID
function play(device_id, track) {
  $.ajax({
    url: "https://api.spotify.com/v1/me/player/play?device_id=" + device_id,
    type: "PUT",
    data: `{"uris": ["${track}"]}`,
    beforeSend: function(xhr) {
      xhr.setRequestHeader("Authorization", "Bearer " + _token);
    },
    success: function(data) {
    }
  });
}

function makeid(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Create the Release Year Variable
let release_year;

function restart() {
  //Reload page
    location.reload();
}

// Create the roundResults to save the information each round to display at Results
let roundResults = [];

function getASong() {
  let random_seed = makeid(2);
  let random_offset = Math.floor(Math.random() * 2000); // returns a random integer from 0 to 9
  $.ajax({
    url:
      "https://api.spotify.com/v1/search?type=track&offset=" +
      random_offset +
      "&limit=1&q=" +
      random_seed,
    type: "GET",
    beforeSend: function(xhr) {
      xhr.setRequestHeader("Authorization", "Bearer " + _token);
    },
    success: function(data) {
      let trackUri = data.tracks.items[0].uri;
      let releaseDate = data.tracks.items[0].album.release_date;

      play(deviceId, trackUri);
      $("#current-track-name-save").attr("data-song", data.tracks.items[0].uri);
      $("#current-track-name-save").attr(
        "src",
        "https://cdn.glitch.com/eed3cfeb-d097-4769-9d03-2d3a6cc7c004%2Ficons8-heart-24.png?v=1597232027543"
      );
      $("#embed-uri").attr(
        "src",
        "https://open.spotify.com/embed/track/" + data.tracks.items[0].id
      );
      $("#current-track-name-save").css("display", "block");

      // save the release date in a variable
      let release_date = new Date(releaseDate).toLocaleDateString();
      const releaseYearString = release_date.slice(-4);
      release_year = parseInt(releaseYearString);
      totalYears = 2023 - release_year;

      $(".start").hide();
      let roundResult = {
      song: data.tracks.items[0].name,
      artist: data.tracks.items[0].artists[0].name,
      year: release_year,
      spotifyLink: "https://open.spotify.com/track/" + data.tracks.items[0].id,
      score: 0
    };

    roundResults.push(roundResult);

    },
    error : function() {
      setTimeout(getASong, 1000); // add a delay of 1 second before making another API request
    }
    });
}

// GAME LOGIC
let currentRound = 1;
const totalRounds = 5;
let totalScore = 0;
let score = 0;

//CREATE BOTH SLIDERS
const slider = document.getElementById('slider');

noUiSlider.create(slider, {
    start: 1950,
    step: 1,
    connect: 'lower',
    range: {
        'min': 1900,
        'max': 2023
    },
    pips: {
  mode: 'values',
  values: Array.from(Array(13).keys()).map(x => x * 10 + 1900),
  density: 10
}
});

// ADD LABEL FOR SELECTED YEAR
const yearLabel = document.createElement('div');
yearLabel.classList.add('year-label');
slider.parentElement.insertBefore(yearLabel, slider);

slider.noUiSlider.on('update', function (values, handle) {
    const year = Math.round(values[handle]);
    yearLabel.innerHTML = year;
});

slider.noUiSlider.set(1950);
yearLabel.innerHTML = 1950;

slider.noUiSlider.on('update', function (values, handle) {
    yearLabel.innerHTML = Math.round(values[handle]);
});

// SECOND SLIDER TO SHOW DIFFERENCE
const tooltipSlider = document.getElementById('slider2');

    noUiSlider.create(tooltipSlider, {
        start: [1950, 2023],
    tooltips: [true, true],
        step: 1,
        connect: true,
        range: {
            'min': 1900,
            'max': 2023
        },
        pips: {
            mode: 'values',
            values: Array.from(Array(13).keys()).map(x => x * 10 + 1900),
            density: 10
        }
    });

$("#round").html("Round " + currentRound + " of " + totalRounds);
$("#points").html("");
$(".next-round").hide();
$(".reload").hide();
$(".restart").hide();
$("#slider2").hide();

let highScore = localStorage.getItem("highScore");
$("#high-score-final").html(`High Score: ${highScore}`);

// LOAD THE FIRST SONG
getASong();

function submitAnswer() {
  const selectedYear = Math.round(slider.noUiSlider.get());

  slider2.noUiSlider.updateOptions({
  start: [selectedYear, release_year] });
  $("#slider2").show();

  const difference = Math.abs(selectedYear - release_year);
  if (difference === 0) {
    score = 1000;
  } else if (difference === 1) {
    score = 918;
  } else if (difference === 2) {
    score = 849;
  } else if (difference === 3) {
    score = 764;
  } else if (difference === 4) {
    score = 680;
  } else if (difference === 5) {
    score = 600;
  } else if (difference === 6) {
    score = 540;
  } else if (difference === 7) {
    score = 466;
  } else if (difference === 8) {
    score = 396;
  } else if (difference === 9) {
    score = 222;
  } else if (difference === 10) {
    score = 111;
  } else {
    score = 0;
  }

  totalScore += score;
  const result = `You scored ${score} points in Round ${currentRound} `;
  const total = `Total Score: ${totalScore}`;

  // Add top the roundResults to give a summary at the end
  roundResults[currentRound - 1].score = score;

  // update the HTML elements
    $("#points").html(result);
    $("#total-score").html(total);
    $(".submit").hide();
    $(".next-round").show();

    // Display the release year above the Spotify web player
    const releaseYearDiv = document.getElementById("release-year");
    releaseYearDiv.innerHTML = release_year;
    releaseYearDiv.style.display = "inline-block";

    // Display the release year and points scored with a fade-in animation
    const revealRelease = document.getElementById("release-year");
    revealRelease.classList.add("show");
    const revealPoints = document.getElementById("points");
    revealPoints.classList.add("show");

    if (currentRound < 5) {
        document.getElementById("next-round big-button").textContent = "Next Round";
    } else {
        document.getElementById("next-round big-button").textContent = "Results";
}

 // ADD FIREWORKS ON PERFECT SCORE
  if (score >= 1000) {
    $("body").addClass("fireworks");
    setTimeout(function() {
      particlesJS('fireworks-container', {
  "particles": {
    "number": {
      "value": 100,
      "density": {
        "enable": true,
        "value_area": 800
      }
    },
    "color": {
      "value": "#ff5349"
    },
    "shape": {
      "type": "circle",
      "stroke": {
        "width": 0,
        "color": "#ff5349"
      },
      "polygon": {
        "nb_sides": 5
      }
    },
    "opacity": {
      "value": 0.5,
      "random": true,
      "anim": {
        "enable": false,
        "speed": 1,
        "opacity_min": 0.1,
        "sync": false
      }
    },
    "size": {
      "value": 5,
      "random": true,
      "anim": {
        "enable": false,
        "speed": 40,
        "size_min": 0.1,
        "sync": false
      }
    },
    "line_linked": {
      "enable": false,
      "distance": 500,
      "color": "#ff5349",
      "opacity": 0.4,
      "width": 2
    },
    "move": {
      "enable": true,
      "speed": 6,
      "direction": "bottom",
      "random": false,
      "straight": false,
      "out_mode": "out",
      "bounce": false,
      "attract": {
        "enable": false,
        "rotateX": 600,
        "rotateY": 1200
      }
    }
  },
  "interactivity": {
    "detect_on": "canvas",
    "events": {
      "onhover": {
        "enable": false,
        "mode": "repulse"
      },
      "onclick": {
        "enable": false,
        "mode": "push"
      },
      "resize": true
    },
    "modes": {
      "grab": {
        "distance": 400,
        "line_linked": {
          "opacity": 1
        }
      },
      "bubble": {
        "distance": 400,
        "size": 40,
        "duration": 2,
        "opacity": 8,
        "speed": 3
      },
      "repulse": {
        "distance": 200,
        "duration": 0.4
      },
      "push": {
        "particles_nb": 4
      },
      "remove": {
        "particles_nb": 2
      }
    }
  },
  "retina_detect": true
    });
    }, 500); // delay the particleJS script by 500 milliseconds (does not work otherwise)
  }
}

// function to go to the next round
function nextRound() {

 // Remove the fireworks animation from the container
  $('body').removeClass('fireworks');
  $("#release-year").removeClass("show");
  $("#points").removeClass("show");

   currentRound++; // increment the round variable
   if (currentRound > totalRounds) {
    showFinalScore();
    showResults();
     $(".next-round").hide();
     $("#release-year").hide();
    return;
    }

  const round = `Round: ${currentRound} / ${totalRounds}`;
  $("#round").html(round);
  $(".submit").show();
  $(".next-round").hide();
  $("#slider2").hide();
  $(".reload").show();
  getASong();
}

function showFinalScore() {
 $("#spotify-web-player").hide();
 $(".next-round").hide();
 $("#points").css('display', 'none');
 $("#release-year").css('display', 'none');
 $(".reload").hide();
 $("#high-score-final").show();
 $(".restart").show();

// retrieve and display high score if possible
let highScore = localStorage.getItem("highScore");
if (!highScore || totalScore > highScore) {
    highScore = totalScore;
    localStorage.setItem("highScore", highScore);
}
    $("#high-score-final").html(`High Score: ${highScore}`);
}

function showResults() {
  const resultsContainer = document.getElementById("results-container");
  resultsContainer.innerHTML = "";

  for (let i = 0; i < roundResults.length; i++) {
    const roundResult = roundResults[i];

    const roundElement = document.createElement("div");
    roundElement.classList.add("round");

    const roundNumberElement = document.createElement("h3");
    roundNumberElement.textContent = `Round ${i + 1}`;

    const songElement = document.createElement("p");
    songElement.textContent = `${roundResult.song} by ${roundResult.artist}`;

    const spotifyLinkElement = document.createElement("a");
    spotifyLinkElement.href = roundResult.spotifyLink;
    spotifyLinkElement.textContent = "Listen on Spotify";

    const scoreElement = document.createElement("p");
    scoreElement.textContent = `Score: ${roundResult.score}`;

    roundElement.appendChild(roundNumberElement);
    roundElement.appendChild(songElement);
    roundElement.appendChild(spotifyLinkElement);
    roundElement.appendChild(scoreElement);

    resultsContainer.appendChild(roundElement);
  }
}
