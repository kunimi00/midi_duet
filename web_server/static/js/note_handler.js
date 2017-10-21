var isPlaying = false;      
var startTime;              // very begining timing
var current16thNote = 0;        // upcoming note index
var lookahead = 25.0;       // How frequently to call scheduling function (in milliseconds)
var scheduleAheadTime = 0.1;    // How far ahead to schedule audio (sec)
                            // This is calculated from lookahead, and overlaps 
                            // with next interval (in case the timer is late)

var nextNoteTime = 0.0;     // when the next note is due.
var noteResolution = 2;     // 0 == 16th, 1 == 8th, 2 == quarter note
var noteLength = 0.05;      // length of "beep" (in seconds)

var notesInQueue = [];      // the notes that have been put into the web audio,
							// and may or may not have played yet. {note, time}

var timerWorker = new Worker("js/timer_worker.js"); // interval setter

var audioContext = new (window.AudioContext || window.webkitAudioContext)();
var tempo = 60
var num_notes_per_sequence = 16


function nextNote() {
    var secondsPerBeat = 60.0 / tempo;    
    nextNoteTime += 0.25 * secondsPerBeat;
    current16thNote++;
    if (current16thNote == 16) {
        current16thNote = 0;
    }
}

function scheduleNote( beatNumber, time ) {
    // push the note on the queue
    notesInQueue.push( { note: beatNumber, time: time } );

    if ( (noteResolution==1) && (beatNumber%2))
        return; // we're not playing non-8th 16th notes
    if ( (noteResolution==2) && (beatNumber%4))
        return; // we're not playing non-quarter 8th notes

    // create an oscillator
    var osc = audioContext.createOscillator();
    var oscGainNode = audioContext.createGain();
    oscGainNode.gain.value = 0.2
    
    osc.connect(oscGainNode);

    oscGainNode.connect(audioContext.destination);

    if (beatNumber % 16 === 0) {    // beat 0 == high pitch
        osc.frequency.value = 880.0;
        emitMelody();
    }
    else if (beatNumber % 4 === 0 )    // quarter notes = medium pitch
        osc.frequency.value = 440.0;
    // else                        // other 16th notes = low pitch
    //     osc.frequency.value = 440.0;

    osc.start( time );
    osc.stop( time + noteLength );
}

function scheduler() {
    // while there are notes that will need to play before the next interval, 
    // schedule them and advance the pointer.
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime ) {
        scheduleNote( current16thNote, nextNoteTime );
        nextNote();
    }
}

function play_metronome() {
    isPlaying = !isPlaying;

    if (isPlaying) { // start playing
        current16thNote = -1;
        nextNoteTime = audioContext.currentTime;
        timerWorker.postMessage("start");
        return "stop";
    } else {
        timerWorker.postMessage("stop");
        return "play";
    }
}


// start timer worker process
function init_timer(){

	timerWorker.onmessage = function(e) {
	        if (e.data == "tick") {
	            // console.log("tick!");
	            scheduler();
	        }
	        else
	            console.log("message: " + e.data);
	    };

	timerWorker.postMessage({"interval":lookahead});
}

init_timer();
play_metronome();



