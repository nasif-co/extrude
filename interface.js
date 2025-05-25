let imgURL = null;
let droppedFile = false;

// A: Visitor drops a file over the window
const dragThrottlecb = throttle( detectDragging, 100);
window.dragzone.addEventListener('dragover', function(event) {
    event.preventDefault(); // Prevent default behavior to allow drop
    dragThrottlecb();
});

let dragEndCounter;
function detectDragging(event) {
    if(!droppedFile) {
        document.body.classList.add('dragging-file');
        clearTimeout(dragEndCounter);
        dragEndCounter = setTimeout( () => {
            document.body.classList.remove('dragging-file');
        }, 120);
    }
}

window.dragzone.addEventListener('drop', function (event) {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                //Skip non-image files
                continue;
            }
            droppedFile = true;
            document.body.classList.remove('dragging-file');
            imgURL = URL.createObjectURL(file);
            startApp(true);
            break; // Only handle the first image
        }
    }
});


// B: Visitor uploads a file through the button
document.querySelector('.options__item-input').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        imgURL = URL.createObjectURL(file);
        startApp();
    } else {
        console.log('Selected file is not an image :(');
    }
});


// C: Visitor clicks on the webcam option
document.querySelector('.options__item--webcam').addEventListener('click', function(){
    startApp();
});

function startApp( instant = false ) {
    //Stop receiving files
    window.dragzone.classList.add('screen--disabled');

    //Animate app screen start
    if(instant) {
        document.body.classList.add('app-started-no-transition');
        createP5Sketch();
    }else {
        document.body.classList.add('app-started');
        let transitionEndCounter;
            jQuery('.screen--initialize').one( 'transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function(e){
                document.querySelector('.screen--initialize').classList.add('hidden');
                clearTimeout(transitionEndCounter);
                //Don't start sketch until we are absolutely ready
                transitionEndCounter = setTimeout(createP5Sketch, 500);
            }
        );
    }
    
}

//Functionalities
function throttle( cb, delay ) {
    //From https://codedamn.com/news/javascript/throttling-in-javascript
    let wait = false;
    let storedArgs = null;

    function checkStoredArgs() {
      if ( storedArgs == null ) {
        wait = false;
      } else {
        cb(...storedArgs);
        storedArgs = null;
        setTimeout( checkStoredArgs, delay );
      }
    }

    return (...args) => {
      if ( wait ) {
        storedArgs = args;
        return;
      }

      cb(...args);
      wait = true;
      setTimeout( checkStoredArgs, delay );
    };
}

function disablePropagationFromSlider() {
    const slider = document.querySelector('input[type=range]');

    slider.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });

    slider.addEventListener('mousemove', (e) => {
        if (e.buttons > 0) { // if mouse button is being held down
            e.stopPropagation();
        }
    });

    slider.addEventListener('mouseup', (e) => {
        e.stopPropagation();
    });
}
disablePropagationFromSlider();

window.addEventListener('DOMContentLoaded', () => {
    document.body.style.setProperty('--svh', `${window.innerHeight * 0.01}px`);
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            document.body.style.setProperty('--svh', `${window.innerHeight * 0.01}px`);
        }, 50);
    });
}, { once: true });