var oldCallback;
var score = 0;
var num_trials = 105;
var catch_freq = Math.round(num_trials/5);

function sendData() {
    console.log('sending data to mturk');
    jsPsych.turk.submitToTurk({'score':score});
    
}

var consentHTML = {
    'str1' : '<p>In this HIT, you will view some sketches that were intended to depict one of eight different animals: </p><p><b> BEAR, CAT, DUCK, LION, PIG, RABBIT, SHEEP, or SWAN.</b> </p><p> Your task is to guess which animal the sketch was intended to represent.</p>',
    'str2' : '<p>We expect this hit to take approximately 8-10 minutes to complete, including the time it takes to read instructions.</p>',
    'str3' : "<p>If you encounter a problem or error, send us an email (sketchloop@gmail.com) and we will make sure you're compensated for your time! Please pay attention and do your best! Thank you!</p><p> Note: We recommend using Chrome. We have not tested this HIT in other browsers.</p>",
    'str4' : ["<u><p id='legal'>Consenting to Participate:</p></u>",
        "<p id='legal'>By completing this HIT, you are participating in a study being performed by cognitive scientists in the Stanford Department of Psychology. If you have questions about this research, please contact the <b>Sketchloop Admin</b> at <b><a href='mailto://sketchloop@gmail.com'>sketchloop@gmail.com</a> </b>. You must be at least 18 years old to participate. Your participation in this research is voluntary. You may decline to answer any or all of the following questions. You may decline further participation, at any time, without adverse consequences. Your anonymity is assured; the researchers who have requested your participation will not receive any personal information about you.</p>"].join(' ')
};

var instructionsHTML = {
    'str1':'<p> A different sketch will appear on each trial. After a brief two-second delay, the buttons will become active (dark gray) so you can make your guess. </p> <p><b> Please take your time to be as accurate as you can. </p> </p>',
    'str2':"<p> When you finish, please click the submit button to finish the game.</p> <p><b> IMPORTANT: If a popup appears asking you if you are sure you want to leave the page, you must click YES. This will cause the HIT to submit. </b>  </p><p> Let's begin! </p>"
};

var welcomeTrial = {
    type: 'instructions',
    pages: [
        consentHTML.str1,
        consentHTML.str2,
        consentHTML.str3,
        consentHTML.str4,
        instructionsHTML.str1,
        instructionsHTML.str2
    ],
    show_clickable_nav: true,
    allow_keys:  false
};

var acceptHTML = {
    'str1' : '<p> Welcome! In this HIT, you will view some drawings produced by children who were trying to trace a shape as accurately as they could. Your task is to rate each tracing on a 5-point scale. </p>',
    'str2' : '<p> This is only a demo! If you are interested in participating, please accept the HIT in MTurk before continuing further. </p>'
}

var previewTrial = {
    type: 'instructions',
    pages: [acceptHTML.str1, acceptHTML.str2],
    show_clickable_nav: true,
    allow_keys: false
}

var goodbyeTrial = {
    type: 'instructions',
    pages: [
        '<p> Once you click the submit button, you will be prompted with a pop-up asking you if you are sure that you want to leave the site. Please click YES to leave the site, which will trigger submission of this HIT to Amazon Mechanical Turk. </p>'
    ],
    show_clickable_nav: true,
    allow_backward:false,
    button_label_next: 'Submit the HIT',
    on_finish: function() { sendData();}
};

// define trial object with boilerplate
function Trial () {
    this.type = 'image-button-response';    
    this.dbname ='collabdraw_recog';
    this.colname = 'collab8';
    this.iterationName = 'pilot0';    
    this.prompt = "Which animal was this sketch intended to represent?";
    this.image_url = "img/catch.png";
    this.className ='lion';
    this.choices = ['bear', 'cat', 'duck', 'lion', 'pig', 'rabbit', 'sheep', 'swan'];
    this.dev_mode = true;
}

function setupGame () {

    // number of trials to fetch from database is defined in ./app.js
    var socket = io.connect();
    socket.on('onConnected', function(d) {
        // get workerId, etc. from URL (so that it can be sent to the server)
        var turkInfo = jsPsych.turk.turkInfo();

        // pull out info from server
        var id = d.id;

        // at end of each trial save score locally and send data to server
        var main_on_finish = function(data) {
            if (data.score) {
                score = data.score;
            }
            socket.emit('currentData', data);
        };

        var main_on_start = function(trial) {
            socket.removeListener('stimulus', oldCallback);
            oldCallback = newCallback;

            if(trial.trialNum % catch_freq != 0) {
                var newCallback = function (d) {
                    trial.image_url = d.url;
                    trial.orig_gameID = d.gameID;                    
                    trial.className = d.className;
                    trial.repetition = d.repetition;
                    trial.orig_trialNum = d.trialNum;
                    trial.condition = d.condition;
                    trial.sketcherId = d.sketcherId;
                    trial.orig_iterationName = d.iterationName;
                };
                // call server for stims
                socket.emit('getStim', {gameID: id});
                socket.on('stimulus', newCallback);

            }

        };

        // Bind trial data with boilerplate
        var trials = _.map(_.rangeRight(num_trials), function(trialData, i) {
            return _.extend(new Trial, trialData, {
                gameID: id,
                trialNum : i,
                post_trial_gap: 1000, // add brief ITI between trials
                on_start: main_on_start,
                on_finish : main_on_finish
            });
        });
	
        // Stick welcome trial at beginning & goodbye trial at end
        if (!turkInfo.previewMode) {
            trials.unshift(welcomeTrial);
        } else {
            trials.unshift(previewTrial); // if still in preview mode, tell them to accept first.
        }
        trials.push(goodbyeTrial);

        jsPsych.init({
            timeline: trials,
            default_iti: 1000,
            show_progress_bar: true
        });
    });


}
