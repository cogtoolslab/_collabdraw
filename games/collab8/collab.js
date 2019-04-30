const sketch = function(p) {
  const  socket = io.connect();
  const BASE_URL = 'https://storage.googleapis.com/quickdraw-models/sketchRNN/models/';
  const BASE_PATH = '../lib/sketch-rnn-weights/';
//  const sketcherModels = ['bird', 'ant','ambulance','angel','alarm_clock','antyoga','backpack','barn','basket','bear','bee','beeflower','bicycle','book','brain','bridge','bulldozer','bus','butterfly','cactus','calendar','castle','cat','catbus','catpig','chair','couch','crab','crabchair','crabrabbitfacepig','cruise_ship','diving_board','dog','dogbunny','dolphin','duck','elephant','elephantpig','everything','eye','face','fan','fire_hydrant','firetruck','flamingo','flower','floweryoga','frog','frogsofa','garden','hand','hedgeberry','hedgehog','helicopter','kangaroo','key','lantern','lighthouse','lion','lionsheep','lobster','map','mermaid','monapassport','monkey','mosquito','octopus','owl','paintbrush','palm_tree','parrot','passport','peas','penguin','pig','pigsheep','pineapple','pool','postcard','power_outlet','rabbit','rabbitturtle','radio','radioface','rain','rhinoceros','rifle','roller_coaster','sandwich','scorpion','sea_turtle','sheep','skull','snail','snowflake','speedboat','spider','squirrel','steak','stove','strawberry','swan','swing_set','the_mona_lisa','tiger','toothbrush','toothpaste','tractor','trombone','truck','whale','windmill','yoga','yogabicycle'];
// const classifierModels = ['bird', 'ant','ambulance','angel','alarm_clock','antyoga','backpack','barn','basket','bear','bee','beeflower','bicycle','book','brain','bridge','bulldozer','bus','butterfly','cactus','calendar','castle','cat','catbus','catpig','chair','couch','crab','crabchair','crabrabbitfacepig','cruise_ship','diving_board','dog','dogbunny','dolphin','duck','elephant','elephantpig','everything','eye','face','fan','fire_hydrant','firetruck','flamingo','flower','floweryoga','frog','frogsofa','garden','hand','hedgeberry','hedgehog','helicopter','kangaroo','key','lantern','lighthouse','lion','lionsheep','lobster','map','mermaid','monapassport','monkey','mosquito','octopus','owl','paintbrush','palm_tree','parrot','passport','peas','penguin','pig','pigsheep','pineapple','pool','postcard','power_outlet','rabbit','rabbitturtle','radio','radioface','rain','rhinoceros','rifle','roller_coaster','sandwich','scorpion','sea_turtle','sheep','skull','snail','snowflake','speedboat','spider','squirrel','steak','stove','strawberry','swan','swing_set','the_mona_lisa','tiger','toothbrush','toothpaste','tractor','trombone','truck','whale','windmill','yoga','yogabicycle']; 
    // const sketcherModels = ['barn', 'couch', 'chair', 'bicycle', 'cruise_ship', 'truck', 'bear', 'cat', 'rabbit', 'dog', 'sheep', 'bird', 'frog', 'face', 'palm_tree', 'castle', 'key'];
  // const sketcherModels = ['airplane','bear','bicycle','bird','car','cat','chair','couch','cruise_ship','cup','dog','fish','frog','house','key','rabbit','sailboat','scissors','sheep','speedboat','train','tree','truck','whale'];
  // const sketcherModels = ['bear', 'bicycle', 'bird', 'cat', 'chair', 'couch', 'cruise_ship', 'dog', 'frog', 'key', 'rabbit', 'sheep', 'speedboat', 'truck', 'whale'];
  // const animals =  ['ant', 'bear', 'bee', 'butterfly', 'cat', 'crab', 'dog', 'dolphin', 'duck', 'elephant', 'frog', 'kangaroo', 'lion', 'lobster', 'monkey', 'octopus', 'owl', 'parrot', 'penguin', 'pig', 'rabbit', 'sea_turtle', 'snail', 'squirrel', 'swan', 'tiger']
  // const sketcherModels = ['bear','bird','cat','dog','butterfly','rabbit','sheep','whale'];
  // const sketcherModels = ['bear', 'butterfly', 'cat', 'dog', 'duck', 'elephant', 'kangaroo', 'lion', 'monkey', 'octopus', 'owl', 'parrot', 'penguin', 'pig', 'rabbit', 'sea_turtle', 'snail', 'swan', 'tiger']
    // const classifierModels = ['airplane','bear','bicycle','bird','car','cat','chair','couch','cruise ship','cup','dog','fish','frog','house','key','rabbit','sailboat','scissors','sheep','speedboat','train','tree','truck','whale'];
    const sketcherModels = ['bear','cat','duck','lion','pig','rabbit','sheep','swan'];
    const classifierModels = ['bear','cat','duck','lion','pig','rabbit','sheep','swan'];
   // const sketcherModels = ['airplane','bear','bicycle','bird','car','cat','chair','couch','cruise ship','cup','dog','duck','fish','frog','house','key','lion','pig','rabbit','sailboat','scissors','sheep','speedboat','swan','train','tree','truck','whale'];
//    const classifierModels = ['airplane','bear','bicycle','bird','car','cat','chair','couch','cruise ship','cup','dog','duck','fish','frog','house','key','lion','pig','rabbit','sailboat','scissors','sheep','speedboat','swan','train','tree','truck','whale'];

    
    
  let model;
  let classifier;

  // Model
  let modelState;
  const temperature = 0.01;
  let modelLoaded = false;
  let modelIsActive = false;

  // Model pen state.
  let dx, dy;
  let x, y;
  let startX, startY; // Keep track of the first point of the last raw line.
  let pen = [0,0,0]; // Model pen state, [pen_down, pen_up, pen_end].
  let previousPen = [1, 0, 0]; // Previous model pen state.
  const PEN = {DOWN: 0, UP: 1, END: 2};
  const epsilon = 2.0; // to ignore data from user's pen staying in one spot.

  // Drawing.
  let pg;
  let currentRawLine = [];
  let allRawLines = [];
  let fullDrawing = [];  // all the unsimplified lines.
  let strokes = []; // all the strokes in the drawing.
  let userPen = 0; // above = 0 or below = 1 the paper.
  let previousUserPen = 0;
  let canvasResized = 0; // keep track of whether canvas was resized (and thus cleared) at some point during this trial
  const canvasPadding = 300; 
    
  // Task params.
  let humanFirst = true;
  let robotDone = false;

  // Instructions.
  let header = "";
  let paragraph = "";
  let buttonLabel = "";

  // Data to collect.
  let humanStrokes = 0;
  let robotStrokes = 0;
  let startTime = performance.now();
  let endTime = performance.now();
  let sketchStart = 0;

  // Classifier
  const classifierImageSize = 64;
  let classifierPixelSize;
  const printClfOutputFlag = true;

  // Session
  const gameID = UUID();
  const urlParams = getURLParams();
  let splashIsOpen = true;

  // Experiment ID
  const dbname = 'collabdraw';
  const colname = 'collab'; 
  const iterationName = 'testing';
  const experimentDesign = 'baseline'; // options: 'prepost', 'baseline'

  // Construct trial list.
  let currTrial = 0;
  let numClasses = 0;
  let numReps = 0;
  let classList = [];
  let trialDict = {};

  if (experimentDesign=='prepost') {
    numClasses = 8;
    numReps = 5;
    sampledClasses = _.shuffle(_.range(sketcherModels.length)).slice(0,numClasses);
    conds = _.flatten([_.times(numClasses/2, _.constant('collab')), _.times(numClasses/2,_.constant('solo'))]);
    classCondDict = _.zipObject(sampledClasses,conds);
    classList = _.flatMap(_.range(0,numReps), curRep => {return _.shuffle(sampledClasses)});
    trialDict = _.map(classList, (c,i) => {
                        return _.extend({},{'classInd':c,
                                            'condition':classCondDict[c],
                                            'className':sketcherModels[c],
                                            'trialNum':i,
                                            'repetition': Math.floor(i/numClasses) + 1,
                                            'phase': (i < numClasses ) ? 'pre' : ((i >= numClasses*(numReps-1)) ? 'post' : 'collab')
                                           }
                                        )
                        });
  } else if (experimentDesign=='baseline') {
    numClasses = 8;
    numReps = 4;
    sampledClasses = _.shuffle(_.range(sketcherModels.length)).slice(0,numClasses);
    conds = _.flatten([_.times(numReps/2, _.constant('collab')), _.times(numReps/2,_.constant('solo'))]);
    classList = _.flatten(_.map(sampledClasses, (x) => {return _.times(numReps,_.constant(x))}));
    condList = _.flatMap(_.range(0,numClasses), curClass => {return _.shuffle(conds)});
    repList = _.flatten(_.times(numClasses,_.constant(_.range(4))));
    const trialDict0 = _.map(classList, (c,i) => {
                        return _.extend({}, {'classInd':c,
                                             'condition': condList[i],
                                             'className': sketcherModels[c],
                                             'repetition': repList[i],
                                             'phase': 'collab'
                                             })
    })
    const trialDict1 = _.flatten(_.map(_.chunk(_.sortBy(trialDict0, ['repetition']), numClasses), _.shuffle));
    trialDict = _.map(trialDict1, (c,i) => {
      return _.extend(c,{'trialNum':i})
    });
  }

  console.log(trialDict);
  let currentClass = trialDict[currTrial]['classInd'];

  /*
   * Main p5 code
   */
  p.setup = function() {
    // Initialize the canvas
    const containerSize = document.getElementById('sketch').getBoundingClientRect();
    const screenWidth = Math.floor(containerSize.width - canvasPadding);
    const screenHeight = Math.floor(containerSize.height - canvasPadding);
    const size = Math.min(screenWidth, screenHeight);
    p.createCanvas(size, size);
    pg = p.createGraphics(size, size);
    p.frameRate(60);
    const canvasSize = document.getElementById('defaultCanvas0');
    const canvasWidth = Math.floor(canvasSize.width);
    const canvasHeight = Math.floor(canvasSize.height);  

    // Initialize the classifier.
    classifier = new mc.QuickClassifier(model_params); // "model_params" is a global from quick_weights.js
    classifierPixelSize = size / classifierImageSize;

    // Initialize with first class in trialDict
    initModel(trialDict[currTrial]['classInd']);
    currentClass = trialDict[currTrial]['classInd'];
    currentModel.textContent = sketcherModels[currentClass];

    if ((trialDict[currTrial]['condition']=='solo' || trialDict[currTrial]['phase'] != 'collab') && (trialDict[currTrial]['condition'] != 'robot')) {
      instructionPre.textContent = 'Draw a ';
      instructionPost.textContent = 'on your own.';
    }

    btnAdvance.addEventListener('click', nextTrial);
    btnGo.addEventListener('click', () => {
      closeSplash();
      // splashIsOpen = false;
      // splash.classList.add('hidden');
    });
  };

  p.windowResized = function () {
    console.log('resize canvas');
    canvasResized ++;
    const containerSize = document.getElementById('sketch').getBoundingClientRect();
    const screenWidth = Math.floor(containerSize.width);
    const screenHeight = Math.floor(containerSize.height);
    rendered = pg.get(); // clone p5.Graphics as p5.Image
    pg = p.createGraphics(rendered.width, rendered.height);
    // p.resizeCanvas(screenWidth, screenHeight);
  };

  /*
  * Human is drawing.
  */
  p.mousePressed = function () {
    if (p.isInBounds()) {
      x = p.mouseX;
      y = p.mouseY;
      if (!startX) {
        humanStrokes = 0;
        startX = x;
        startY = y;
      }
      userPen = 1; // down!
      startTime = performance.now();
      previousUserPen = userPen;
      humanTurn();
    }
  }

  p.mouseReleased = function () {
    if (p.isInBounds()) {
      userPen = 0;  // Up!
      endTime = performance.now();
      humanStrokes++;
      addStrokesToModel();
      //redrawWhatWeHave();
      previousUserPen = userPen;
      if (trialDict[currTrial]['condition']=='collab' && trialDict[currTrial]['phase']=='collab') {
        setTimeout(function(){robotTurn();}, 500);
      }
    }
  }

  p.mouseDragged = function () {
    if (!modelIsActive && p.isInBounds()) {
      const dx0 = p.mouseX - x;
      const dy0 = p.mouseY - y;
      if (dx0*dx0+dy0*dy0 > epsilon*epsilon) { // Only if pen is not in same area.
        dx = dx0;
        dy = dy0;
        userPen = 1;
        if (previousUserPen == 1) {
          p.line(x, y, x+dx, y+dy); // draw line connecting prev point to current point.
        }
        x += dx;
        y += dy;
        currentRawLine.push([x, y]);
      }
      previousUserPen = userPen;
    }
    return false;
  }

 /*
  * Model is drawing.
  */
  p.draw = function() {
    if (!modelLoaded || !modelIsActive) {
      return;
    }

    // New state.
    pen = previousPen;
    modelState = model.update([dx, dy, ...pen], modelState);
    const pdf = model.getPDF(modelState, temperature);
    [dx, dy, ...pen] = model.sample(pdf);

    // If we finished the previous drawing, start a new one.
    if (pen[PEN.END] === 1) {
      robotDone = true;
      console.log('Robot thinks it finished drawing.');
      console.log(`
        Category: ${sketcherModels[currentClass]}
        #human turns: ${humanStrokes}
        #robot turns: ${robotStrokes}
        Drawing time: ${(performance.now() - startTime)/1000}s`);
      if (trialDict[currTrial]['condition'] != 'robot') {humanTurn();}
      returnFeedback();
    } else if (pen[PEN.UP] === 1) {
      robotStrokes++;
      addStrokesToModel();
      if (trialDict[currTrial]['condition'] != 'robot') {humanTurn();}
      //redrawWhatWeHave();
      previousPen = pen;
      return;
    } else {
      // Only draw on the paper if the pen is still touching the paper.
      if (previousPen[PEN.DOWN] === 1) {
        p.line(x, y, x+dx, y+dy);
      }
      // Update.
      x += dx;
      y += dy;
      previousPen = pen;
      currentRawLine.push([x, y]);
    }
  };

  p.isInBounds = function () {
    return !splashIsOpen && p.mouseX >= 0 && p.mouseY >= 0 && p.mouseX < p.width && p.mouseY < p.height;
  }

  /*
  * Helpers.
  */
  function addStrokesToModel() {
    // Save this stroke for the classifier.
    fullDrawing.push(currentRawLine);

    const currentRawLineSimplified = model.simplifyLine(currentRawLine);
    // console.log('currentRawLineSimplified', currentRawLineSimplified);
    let lastX, lastY;

    // If it's an accident...ignore it.
    if (currentRawLineSimplified.length > 1) {
      // Model needs to keep track of the first point of the last line.
      if (allRawLines.length === 0) {
        lastX = startX;
        lastY = startY;
      } else {
        // The last line.
        const idx = allRawLines.length - 1;
        const lastPoint = allRawLines[idx][allRawLines[idx].length-1];
        lastX = lastPoint[0];
        lastY = lastPoint[1];
      }
      // Encode this line as a stroke, and feed it to the model.
      const stroke = model.lineToStroke(currentRawLineSimplified, [lastX, lastY]);
      // console.log('lineToStroke(simplified line)', stroke);
      // console.log('modelIsActive: ', modelIsActive);

      // append current stroke to cumulative array of strokes so far
      allRawLines.push(currentRawLineSimplified);
      strokes = strokes.concat(stroke);
      encodeStrokes(strokes);
      results = classifyDrawing(fullDrawing.flat()); // pass in list of points, but dont end up using them

      // send stroke information to server
      stroke_data = {
        dbname:dbname,
        colname:colname,
        iterationName:iterationName,
        expDesign: experimentDesign,
        dataType: 'stroke',
        gameID: gameID,
        workerId: urlParams['workerId'],
        assignmentId: urlParams['assignmentId'],
        hitId: urlParams['hitId'],
        strokeStartTimestamp: startTime,
        strokeEndTimestamp: endTime,
        time: Date.now(),
        numStrokes: parseInt(humanStrokes) + parseInt(robotStrokes),
        humanStrokes: parseInt(humanStrokes),
        robotStrokes: parseInt(robotStrokes),
        classInd: trialDict[currTrial]['classInd'],
        className: trialDict[currTrial]['className'],
        repetition: trialDict[currTrial]['repetition'],
        condition: trialDict[currTrial]['condition'],
        phase: trialDict[currTrial]['phase'],
        trialNum: currTrial,
        sketcherId: modelIsActive ? 'robot' : 'human',
        firstMover: humanFirst ? 'human' : 'robot',
        currentRawLineSimplified:currentRawLineSimplified,
        stroke:stroke,
        robotThinksDone: robotDone ? true : false,
        canvasResized: canvasResized,
        cnnClassifierProbs:results['probs'],
        bitmap: results['image']
      };

      socket.emit('stroke', stroke_data);

    }
    currentRawLine = [];
  }

  function redrawWhatWeHave() {
    // Clear the canvas.
    p.background(255, 255, 255, 255);
    p.stroke('green');

    let x = startX;
    let y = startY;
    let dx, dy;
    let pen = [0,0,0];
    let previousPen = [1,0,0];
    for( let i = 0; i < strokes.length; i++) {
      [dx, dy, ...pen] = strokes[i];

      if (previousPen[PEN.END] === 1) { // End of drawing.
        break;
      }

      // Only draw on the paper if the pen is still touching the paper.
      if (previousPen[PEN.DOWN] === 1) {
        p.line(x, y, x+dx, y+dy);
      }
      x += dx;
      y += dy;
      previousPen = pen;
    }
  }

  function classifyDrawing(points) {
    if (points.length === 0 || points[0] === undefined) {
      return;
    }

    // Create a pixellated version of this to pass it to the classifier.
    // const image = new Uint8Array(classifierImageSize * classifierImageSize);
    // for (let i = 0; i < points.length; i++) {
    //   const point = points[i];
    //   if (!point) {
    //     continue;
    //   }
    //   const col = Math.floor(point[0] / classifierPixelSize);
    //   const row = Math.floor(point[1] / classifierPixelSize);
    //   image[row * classifierImageSize + col] = 1;
    // }

    // Create a pixellated version of this to pass it to the classifier.
    const sketch = document.getElementById('defaultCanvas0');
    const image = extractBitmap(sketch,classifierImageSize);

    const probs = classifier.predict(image);
    const probDict = getClassProbDict(probs);

    // print out classifier output if flag set to true
    printClfOutputFlag && printClassifierOutput(image, probs);

    function printClassifierOutput(image, probs) {
      // Print the image
      for (let row = 0; row < classifierImageSize; row++) {
        let str = '';
        for (let col = 0; col < classifierImageSize; col++) {
          str += image[row * classifierImageSize + col] === 1 ? 'x' : ' ';
        }
        console.log(`${(row+'').padStart(3, '0')} ${str}`);
      }
      // Sort the probabilities and keep the indices.
      const mappedProbs = [];
      for (let i = 0; i < probs.length; i++) {
        mappedProbs.push({index:i, value: probs[i]});
      }
      mappedProbs.sort((a, b) => {
        return b.value - a.value;
      });

      // Print the classes.
      for (let i = 0; i < 8; i++) {
        console.log(classifierModels[mappedProbs[i].index], mappedProbs[i].value);
      }      

    }

    function getClassProbDict(probs) {
      return _.mapKeys(probs, function(value, key){ return classifierModels[key]; });
    }

    // return image and class probs 
    return {'image':image, 'probs': probDict};
  }

  function restart() {
    // Reset the drawing.
    p.background(255, 255, 255, 255);
    p.strokeWeight(5);
    currentRawLine = [];
    strokes = [];
    allRawLines = [];
    fullDrawing = [];

    // Reset the user drawing state.
    userPen = 1;
    previousUserPen = 0;

    // Reset the model drawing state.
    pen = [0,0,0];
    previousPen = [0, 1, 0];
    robotDone = false; // true if pen.end state is 1.

    // Restart the stats.
    humanStrokes = robotStrokes = 0;
    canvasResized = 0;

    // Initialize the turn.
    if (humanFirst) {
      startX = startY = undefined;
     // modelState = model.zeroState();
     // modelState = model.update(model.zeroInput(), modelState);
      humanTurn();
    } else {
      // Start drawing in the middle-ish of the screen.
      startX = x = p.width / 2.0;
      startY = y = p.height / 3.0;
      dx = dy = 0;
      modelState = model.zeroState();
      modelState = model.update(model.zeroInput(), modelState);
      robotTurn();
    }
    // Record sketch start timestamp
    sketchStart = performance.now();

  };

  function initModel(index) {
    modelLoaded = false;
    whoseTurn.textContent = 'Loading...';
//    document.getElementById('sketch').classList.add('loading');

    if (model) {
      model.dispose();
    }

     model = new ms.SketchRNN(`${BASE_URL}${sketcherModels[index]}.gen.json`);
     // model = new ms.SketchRNN(`${BASE_PATH}${sketcherModels[index]}.gen.json`);
     // console.log(`${BASE_PATH}${sketcherModels[index]}.gen.json`);
    model.initialize().then(() => {
      modelLoaded = true;
  //    document.getElementById('sketch').classList.remove('loading');
      console.log(`🤖${sketcherModels[index]} loaded.`);
      model.setPixelFactor(3.0);  // Bigger -> large outputs
      restart();
    });
  };

  function nextTrial() {

    // Only advance to next trial iff something has been drawn
    if (allRawLines.length>0) {

      // Get CNN classifier output
      results = classifyDrawing(fullDrawing.flat());

      // Render drawing out
      let dataURL = document.getElementById('defaultCanvas0').toDataURL();
      dataURL = dataURL.replace('data:image/png;base64,','');

      // send whole sketch data object
      sketch_data = {
        dbname:dbname,
        colname:colname,
        iterationName:iterationName,
        dataType: 'sketch',
        expDesign: experimentDesign,
        gameID: gameID,
        workerId: urlParams['workerId'],
        assignmentId: urlParams['assignmentId'],
        hitId: urlParams['hitId'],
        sketchStartTimestamp : sketchStart,
        sketchEndTimestamp : performance.now(),
        sketchDuration : performance.now() - sketchStart,
        time: Date.now(),
        numStrokes: parseInt(humanStrokes) + parseInt(robotStrokes),
        humanStrokes: parseInt(humanStrokes),
        robotStrokes: parseInt(robotStrokes),
        classInd: trialDict[currTrial]['classInd'],
        className: trialDict[currTrial]['className'],
        repetition: trialDict[currTrial]['repetition'],
        condition: trialDict[currTrial]['condition'],
        phase: trialDict[currTrial]['phase'],
        trialNum: currTrial,
        sketcherId: modelIsActive ? 'robot' : 'human',
        firstMover: humanFirst ? 'human' : 'robot',
        pngString: dataURL,
        robotThinksDone: robotDone ? true : false,
        canvasResized: canvasResized,
        cnnClassifierProbs:results['probs'],
        bitmap: results['image']
      };
      socket.emit('sketch', sketch_data);

      // If final trial reached, then end gracefully and submit data to MTurk
      if (currTrial>=numClasses*numReps - 1) { // that is, if previous trial was the final one, hence minus 1
        header = "That's all! Thanks for playing!";
        paragraph = " ";
        buttonLabel = 'Submit HIT';
        reopenSplash(header,paragraph,buttonLabel);
        btnGo.removeEventListener('click', () => {closeSplash();});
        btnGo.addEventListener('click', () => {
          turk.submit({'score':0},true);
        });
      } else {
        // Increment trial counter
        currTrial += 1;
        currentClass = trialDict[currTrial]['classInd'];
        currentModel.textContent = sketcherModels[currentClass];
        trialCounter.textContent = 'trial ' + parseInt(currTrial+1) + ' of ' + parseInt(trialDict.length);
        if ((trialDict[currTrial]['condition']=='solo' || trialDict[currTrial]['phase'] != 'collab') && (trialDict[currTrial]['condition'] != 'robot')) {
          instructionPre.textContent = 'Draw a ';
          instructionPost.textContent = 'on your own.';
        } else {
          instructionPre.textContent = "Let's draw a ";
          instructionPost.textContent = 'together.';
          // Make this trial type switch more salient by re-opening splash page
          header = "Let's draw together!";
          paragraph = "On this trial, you'll be collaborating with the robot to make a recognizable drawing. You will each take turns producing one stroke at a time.";
          buttonLabel = "Let's go!";
          reopenSplash(header,paragraph,buttonLabel);
        }
        console.log('Next class to draw: ', currentModel.textContent);
        initModel(currentClass);
      }
    } else {
      alert('Please make a drawing before proceeding.');
    }
  }

  function humanTurn() {
    p.stroke('#EC5953');
    if (trialDict[currTrial]['phase'] == 'collab' && trialDict[currTrial]['condition'] == 'collab') {
      whoseTurn.textContent = 'Your turn.';
    } else {
      whoseTurn.textContent = ' ';
    }
    modelIsActive = false;
    //progressBar.hidden = true;
  }

  function robotTurn() {
    p.stroke('#F7CC4E');
    if (trialDict[currTrial]['phase'] == 'collab' && trialDict[currTrial]['condition'] == 'collab') {
      whoseTurn.textContent = 'My turn.';
    } else {
      whoseTurn.textContent = ' ';
    }
    modelIsActive = true;
    //progressBar.hidden = false;
  }

  function encodeStrokes(sequence) {
    if (sequence.length <= 5) {
      return;
    }

    // Encode the strokes in the model.
    let newState = model.zeroState();
    newState = model.update(model.zeroInput(), newState);
    newState = model.updateStrokes(sequence, newState, sequence.length-1);

    // Reset the actual model we're using to this one that has the encoded strokes.
    modelState = model.copyState(newState);

    // Reset the state.
    const idx = allRawLines.length - 1;
    const lastPoint = allRawLines[idx][allRawLines[idx].length-1];
    x = lastPoint[0];
    y = lastPoint[1];

    // Update the pen state.
    const s = sequence[sequence.length-1];
    dx = s[0];
    dy = s[1];
    previousPen = [s[2], s[3], s[4]];
  }

  function returnFeedback () {
    whoseTurn.textContent = 'All done?';
  }

  function UUID () {
    var baseName = (Math.floor(Math.random() * 10) + '' +
          Math.floor(Math.random() * 10) + '' +
          Math.floor(Math.random() * 10) + '' +
          Math.floor(Math.random() * 10));
    var template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    var id = baseName + '-' + template.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
    return id;
  };

  function getURLParams () {
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = location.search.substring(1);

    var urlParams = {};
    while ((match = search.exec(query))) {
      urlParams[decode(match[1])] = decode(match[2]);
    }
    return urlParams;
  };

  function closeSplash () {
      splash.classList.add('hidden');
      splashIsOpen = false;
  }

  function reopenSplash(heasder,paragraph,buttonLabel) {
    splashIsOpen = true;
    splash.classList.remove('hidden');
    document.querySelector('#splash .content h1').innerHTML = header;
    document.querySelector('#splash .content p').innerHTML = paragraph;
    document.querySelector('#splash .control').innerHTML = buttonLabel;
  }

  function extractBitmap(sketch,imsize) {

    // rescale image to be close to 64x64
    var scaleFactor = imsize/sketch.width;
    var rescaled = resize(sketch, scaleFactor);    
    var imgData = rescaled.getContext('2d').getImageData(0, 0, imsize, imsize);    

    // now go through and get all filled in pixels in R channel
    var pixels  = imgData.data;
    const binaryImage = new Uint8Array(imsize * imsize);
    // getImageData is RGBA, and you 
    // want to start with blue channel, so the 2nd index
    for (var i = 2, n = pixels.length; i < n; i += 4) {
      const point = pixels[i];
      const ind = Math.floor(i/4);
      const thresh = 200;      
      // voxels darker than thresh in blue channel set to 1 (filled in)
      // voxels brighter than thresh in blue channel probably still blank (empty)
      binaryImage[ind] = point < thresh ? 1 : 0;        
    }
    return binaryImage;    
  }

  var resize = function( img, scale ) {
      // Takes an image and a scaling factor and returns the scaled image

      // The original image is drawn into an offscreen canvas of the same size
      // and copied, pixel by pixel into another offscreen canvas with the 
      // new size.

      var widthScaled = img.width * scale;
      var heightScaled = img.height * scale;

      var orig = document.createElement('canvas');
      orig.width = img.width;
      orig.height = img.height;
      var origCtx = orig.getContext('2d');
      origCtx.drawImage(img, 0, 0);
      var origPixels = origCtx.getImageData(0, 0, img.width, img.height);

      var scaled = document.createElement('canvas');
      scaled.width = widthScaled;
      scaled.height = heightScaled;
      var scaledCtx = scaled.getContext('2d');
      var scaledPixels = scaledCtx.getImageData( 0, 0, widthScaled, heightScaled );

      for( var y = 0; y < heightScaled; y++ ) {
          for( var x = 0; x < widthScaled; x++ ) {
              var index = (Math.floor(y / scale) * img.width + Math.floor(x / scale)) * 4;
              var indexScaled = (y * widthScaled + x) * 4;
              scaledPixels.data[ indexScaled ] = origPixels.data[ index ];
              scaledPixels.data[ indexScaled+1 ] = origPixels.data[ index+1 ];
              scaledPixels.data[ indexScaled+2 ] = origPixels.data[ index+2 ];
              scaledPixels.data[ indexScaled+3 ] = origPixels.data[ index+3 ];
          }
      }
      scaledCtx.putImageData( scaledPixels, 0, 0 );
      return scaled;
  }



};

const p5Sketch = new p5(sketch, 'sketch');
