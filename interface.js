let imgURL = null;

// A: Visitor drops a file over the window
const dragThrottlecb = throttle( detectDragging, 100);
window.dragzone.addEventListener('dragover', function(event) {
    event.preventDefault(); // Prevent default behavior to allow drop
    dragThrottlecb();
});

let dragEndCounter;
function detectDragging(event) {
    document.body.classList.add('dragging-file');
    clearTimeout(dragEndCounter);
    dragEndCounter = setTimeout( () => {
        document.body.classList.remove('dragging-file');
    }, 120);
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
    }else {
        document.body.classList.add('app-started');
        jQuery('.screen--initialize').one( 'transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function(){
            document.querySelector('.screen--initialize').classList.add('hidden');
        }
        );
    }
    createP5Sketch();
    

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