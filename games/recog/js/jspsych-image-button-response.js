
/**
 * jspsych-image-button-response
 * Josh de Leeuw
 *
 * plugin for displaying a stimulus and getting a keyboard response
 *
 * documentation: docs.jspsych.org
 *
 **/

var score = 0; // initial num correct set to 0  

jsPsych.plugins["image-button-response"] = (function() {  

    var plugin = {};

    jsPsych.pluginAPI.registerPreload('image-button-response', 'stimulus', 'image');

    plugin.info = {
        name: 'image-button-response',
        description: '',
        parameters: {
            className: {
                type: jsPsych.plugins.parameterType.STRING, // BOOL, STRING, INT, FLOAT, FUNCTION, KEYCODE, SELECT, HTML_STRING, IMAGE, AUDIO, VIDEO, OBJECT, COMPLEX
                pretty_name: 'className',
                default: undefined,
                description: 'The category label.'
            },
            image_html: {
                type: jsPsych.plugins.parameterType.IMAGE,
                pretty_name: 'image HTML',
                default: '<img src="%imageURL%" height="400" width="400" id="image_html">',
                array: true,
                description: 'The html of the image cue used to prompt drawing. Can create own style.'
            },
            image_url: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'image urls',
                default: undefined,
                array: true,
                description: 'The URL for the image cues.'
            },
            session_id: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'session id',
                default: 'default_session_id',
                array: true,
                description: 'The unique identifer for each image'
            },
            choices: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Choices',
                default: undefined,
                array: true,
                description: 'The labels for the buttons.'
            },
            button_html: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Button HTML',
                default: '<button class="jspsych-btn" disabled="true">%choice%</button>',
                array: true,
                description: 'The html of the button. Can create own style.'
            },
            prompt: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Prompt',
                default: null,
                description: 'Any content here will be displayed under the button.'
            },
            message: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Message',
                default: null,
                description: 'Ask the mturker to pay attention to some specific details.'
            },
            stimulus_duration: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Stimulus duration',
                default: null,
                description: 'How long to hide the stimulus.'
            },
            trial_duration: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Trial duration',
                default: null,
                description: 'How long to show the trial.'
            },
            trial_num: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Trial number',
                default: null,
                description: 'The number id of the current trial for each player'
            },
            margin_vertical: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Margin vertical',
                default: '0px',
                description: 'The vertical margin of the button.'
            },
            margin_horizontal: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Margin horizontal',
                default: '8px',
                description: 'The horizontal margin of the button.'
            },
            response_ends_trial: {
                type: jsPsych.plugins.parameterType.BOOL,
                pretty_name: 'Response ends trial',
                default: true,
                description: 'If true, then trial will end when user responds.'
            },
        }
    }

    plugin.trial = function(display_element, trial) {

        // if(typeof trial.image_url === 'undefined'){
        //     console.error('Required parameter "stimulus" missing in image-button-response');
        // }

        // wrapper function to show everything, call this when you've waited what you
        // reckon is long enough for the data to come back from the db
        var start_time = 0;
        function show_display() {

            var html = "";

            // display the prompt
            if (trial.prompt !== null) {
                var html = '<div id="prompt">' + trial.prompt + '</div>';
            }
            // display the message
            if (trial.message !== null) {
                html += '<div class="msg-alert" id="message">' + trial.message.alert + '</div>';
            }

            // place the target drawing inside the image container (which has fixed location)
            html += '<div id="img_container">';

            var img_html_replaced = trial.image_html.replace('%imageURL%', trial.image_url);
            html += img_html_replaced;

            html += '</div>';

            //display buttons
            var buttons = [];
            if (Array.isArray(trial.button_html)) {
                if (trial.button_html.length == trial.choices.length) {
                    buttons = trial.button_html;
                } else {
                    console.error('Error in image-button-response plugin. The length of the button_html array does not equal the length of the choices array');
                }
            } else {
                for (var i = 0; i < trial.choices.length; i++) {
                    buttons.push(trial.button_html);
                }
            }
            html += '<div id="button_container">';
            for (var i = 0; i < trial.choices.length; i++) {
                var str = buttons[i].replace(/%choice%/g, trial.choices[i]);
                html += '<div class="jspsych-image-button-response-button" style="display: inline-block; margin:' + trial.margin_vertical + ' ' + trial.margin_horizontal + '" id="jspsych-image-button-response-button-' + i + '" data-choice="' + i + '">' + str + '</div>';
            }
            html += '</div>';

            // display score
            html += '<div id="score"> <p2> score: ' + parseInt(score) + '</p2></div>'


            display_element.innerHTML = html;
            setTimeout(function(){after_observation();},2500);
        }

        function after_observation(){
            $('.jspsych-btn').attr("disabled", false);
	    
            // start timing
            start_time = performance.now();

            for (var i = 0; i < trial.choices.length; i++) {
            display_element.querySelector('#jspsych-image-button-response-button-' + i).addEventListener('click', function (e) {
                var choice = e.currentTarget.getAttribute('data-choice'); // don't use dataset for jsdom compatibility
                after_response(choice);
            });
            }
	    
        }

        // wait for a little bit for data to come back from db (at least 1500ms), then show_display
        setTimeout(function() {show_display(); }, 1500);

        // store response
        var response = {
            rt: null,
            button: null
        };

        // function to handle responses by the subject
        function after_response(choice) {

            // measure rt
            var end_time = performance.now();
            var rt = end_time - start_time;
            response.button = choice;
            response.rt = rt;

            // disable all the buttons after a response
            var btns = document.querySelectorAll('.jspsych-image-button-response-button button');
            for(var i=0; i<btns.length; i++){
                //btns[i].removeEventListener('click');
                btns[i].setAttribute('disabled', 'disabled');
            }

            // after a valid response, the selected button will have class "responded"
            // which can be used to provide visual feedback that a response was recorded
            display_element.querySelector('#jspsych-image-button-response-button-' + choice).className += ' responded';

            if (trial.response_ends_trial) {
                end_trial(choice);
            }
        };

        // function to end trial when it is time
        function end_trial(choice) {
    	    var turkInfo = jsPsych.turk.turkInfo();

            // check if response matches target, i.e., whether response is correct
            var trial_correct;  
            var response = trial.choices[parseInt(choice)]
            var targetIndex = _.indexOf(trial.choices,trial.className);     
            if (response == trial.className) {
                trial_correct = 1;
                score += 1; 
            } else {
                trial_correct = 0;
            }        
    	    
            // data saving
            var trial_data = {
                dbname : trial.dbname,
                colname: trial.colname,
                iterationName: trial.iterationName,
                gameID : trial.gameID,                
                reaction_time: response.rt,
                image_url: trial.image_url,
                button_pressed: choice,
                response: trial.choices[parseInt(choice)],        
                className: trial.className,
                correct: trial_correct,
                score: score,
                trialNum: trial.trialNum,
                condition : trial.condition,                
                sketcherId : trial.sketcherId,
                orig_gameID : trial.orig_gameID,
                orig_trialNum : trial.orig_trialNum,
                orig_iterationname : trial.orig_iterationName,
                startTrialTime: start_time,
                endTrialTime: Date.now(),
        		workerId: turkInfo.workerId,
        		hitID: turkInfo.hitId,
        		aID: turkInfo.assignmentId
            };

            // show feedback
            if (trial_correct==true) {
             // show feedback by drawing GREEN box around TARGET if selected CORRECTLY    
                display_element.querySelector('#jspsych-image-button-response-button-' + choice).style.border = "4px solid #66B03B"
                // also bold/enlarge the score in bottom left corner 
                display_element.querySelector('#score p2').innerHTML = 'score: ' + score;
                // display_element.querySelector('#score p2').style.fontWeight = 'bold';
            } else {
                // draw RED box around INCORRECT response and BLACK box around TARGET
                display_element.querySelector('#jspsych-image-button-response-button-' + choice).style.border = "4px solid #D02B16"      
                display_element.querySelector('#jspsych-image-button-response-button-' + targetIndex).style.border = "4px solid #1e1e1e"                  
                // also bold/enlarge the score in bottom left corner 
                display_element.querySelector('#score p2').innerHTML = 'score: ' + score;
                // display_element.querySelector('#score p2').style.fontWeight = 'bold';         
            }

            // wait to screen and moving onto next trial until you show feedback
            jsPsych.pluginAPI.setTimeout(function() {
                              clear_display_move_on(trial_data);},1500);      

            
            function clear_display_move_on(trial_data) {
              // clear the display
              display_element.innerHTML = '';

              // move on to the next trial
              jsPsych.finishTrial(trial_data);

            };

        };


        // hide image if timing is set
        if (trial.stimulus_duration !== null) {
            jsPsych.pluginAPI.setTimeout(function() {
                display_element.querySelector('#jspsych-image-button-response-stimulus').style.visibility = 'hidden';
            }, trial.stimulus_duration);
        }

        // end trial if time limit is set
        if (trial.trial_duration !== null) {
            jsPsych.pluginAPI.setTimeout(function() {
                end_trial();
            }, trial.trial_duration);
        }

    };

    return plugin;
})();
