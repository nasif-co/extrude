let depthEstimation;
loadTransformers();

//Detect if WebGPU is available
let webGPUAvailable = navigator.gpu;
let modelOptions = {
    dtype: 'fp16',
    progress_callback: logProgress
}
if(navigator.gpu) {
    modelOptions.device = 'webgpu';
}

async function loadTransformers() {
    try {
      const module = await import(
        "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0"
      );
      const { pipeline } = module;

    // Load the depth estimation model
    depthEstimation = await pipeline(
        "depth-estimation", // Model task
        "onnx-community/depth-anything-v2-small", //Pretrained model
        modelOptions
    );

      return;
    } catch (error) {
      console.error("Failed to load transformers.js", error);
      alert('Failed to load AI model. Reload the site or try a different device if this is a mobile phone.');
    }
}

let app;

function createP5Sketch() {
    app = new p5(p5Code, window.appcontainer);
}

const p5Code = ( sketch ) => {
    let video;
    let source;
    let photogrammetry;
    let placeholder;
    let snapshot;
    let rendering = false;
    let capturing = false;
    let finishedRender = 0;

    sketch.preload = () => {
        if(imgURL != null) {
            source = sketch.loadImage(imgURL);
        }
    }
  
    sketch.setup = () => {
        sketch.createCanvas(window.innerWidth, window.innerHeight, sketch.WEBGL);
        sketch.pixelDensity(1);
        
        if(imgURL == null) {
            document.querySelector('.shutter-outer').classList.add('shutter-outer--enabled');
            video = sketch.createCapture(sketch.VIDEO, {'flipped': true});
            if(window.innerWidth > video.innerHeight) {
              video.size(640, 480);
            }else {
              video.size(480*0.75, 640*0.75);
            }
            video.hide();
            snapshot = sketch.createGraphics(video.width, video.height);
            capturing = true;
            document.querySelector('.shutter-outer').addEventListener('click', function(){
                snapshot.image(video, 0, 0);
                sketch.image(snapshot, 0, 0);
                capturing = false;
                video.remove();
                document.querySelector('.shutter-outer').classList.remove('shutter-outer--enabled');
                processVideo();
            }, {once: true});

        }else {
            if(source.height > source.width) {
                source.resize(0, 640);
            }else {
                source.resize(640, 0);
            }
            snapshot = sketch.createGraphics(source.width, source.height);
            snapshot.image(source, 0, 0);
            sketch.translate(-snapshot.width/2,-snapshot.height/2, 100);
            if (window.matchMedia("(max-width: 580px)").matches) {
              sketch.translate(0, 0, -400);
            }
            sketch.image(snapshot, 0, 0);
            processVideo();
        }

        photogrammetry = new p5.Geometry();

        //Initialize restart button
        document.querySelector('#restart').addEventListener('click', function(){
            window.location.reload();
        });

        //Initialize download button
        document.querySelector('#download').addEventListener('click', function(){
            sketch.saveCanvas('snapshot.png');
            snapshot.save('texture.jpg');
            photogrammetry.saveObj('3Dmodel.obj');
        });
    };
  
    sketch.draw = () => {
    sketch.translate(-snapshot.width/2,-snapshot.height/2, 100);
    if (window.matchMedia("(max-width: 580px)").matches) {
      sketch.translate(0, 0, -400);
    }
    sketch.clear();
      if(capturing) {
        snapshot.image(video, 0, 0);
        sketch.image(snapshot, 0, 0);
        return;
      }

      if(photogrammetry != null){
        sketch.orbitControl();
        //Only render the 3D model if it is not being generated
        if(!rendering) {
          document.querySelector('.loader').classList.remove('loading');
          if(sketch.frameCount-finishedRender < 180) {
            sketch.scale(1,1, easeInOutCubic(sketch.constrain((sketch.frameCount-finishedRender)/180,  0, 1)));
          } else {
            document.querySelector('.controls').classList.add('active');
            sketch.translate(0,0, (-window.extrude.value + 1)*100);
            sketch.scale(1,1, Number(window.extrude.value));
          }
          sketch.texture(snapshot);
          sketch.noStroke();
          sketch.model(photogrammetry);
        }else {
          sketch.image(snapshot, 0, 0);
        }
      }
    };


    let threshold = 255; //disable threshold for now

    async function processVideo() {
        //Set the rendering flag
        rendering = true;
        document.querySelector('.loader').classList.add('loading');
        //Turn the image drawn to the snapshot to a data url and feed it into the model
        let depthResult = await depthEstimation(snapshot.canvas.toDataURL());
        //When we get the results back, load the pixels of the image we sent
        snapshot.loadPixels();
        
        //Reset the photogrammetry object
        //sketch.freeGeometry(photogrammetry);
        photogrammetry = new p5.Geometry();
        
        let { depth } = depthResult;
        
        //Go through the image pixels
        for (let y = 0; y < snapshot.height; y++) {
          for (let x = 0; x < snapshot.width; x++) {
            
            //Get the index for current pixel in the model result buffer
            let index = x + y * snapshot.width;
           
            //Get the z depth value for the current pixel
            let z = depth.data[index];
            
            //Create the vertex as a vector and set its UV
            const voxel = sketch.createVector(x, y, z);
            photogrammetry.vertices.push(voxel);
            //photogrammetry.uvs.push(x/snapshot.width, y/snapshot.height);

            // Add UV coordinates
            const above = x + (y - 1) * snapshot.width;
            const left = (x - 1) + y * snapshot.width;
            if( 
                (x > 0 && y == 0 && Math.abs(depth.data[left] - z) > threshold) ||
                ( x == 0 && y > 0 && Math.abs(depth.data[above] - z) > threshold) ||
                (x > 0 && y > 0 && (Math.abs(depth.data[left] - z) > threshold || Math.abs(depth.data[above] - z) > threshold ) )
              ) {
                //Don't connect the vertex to its left and top neighbors if their z's are too different
                photogrammetry.uvs.push(0, 0);
                //console.log('here');
            }else {
              //Otherwise, do connect them by setting the corresponding UV
              photogrammetry.uvs.push(x/snapshot.width, y/snapshot.height);
            }
            
            //Manually set the faces of the 3D model
            //Only up to width - 1 and y - 1 because we draw the
            //face to the next pixel right and down, which don't
            //existe when we reach the edge
            if(x < snapshot.width - 1 && y < snapshot.height - 1) {
              let a = index;
              let b = index + 1;
              let c = index + snapshot.width;
              let d = index + snapshot.width + 1;
      
              //Each "pixel" with 4 vertices consists of two
              //triangles splitting it in the middle. We 
              //add each to the faces array
              photogrammetry.faces.push([a, b, c]); // First triangle
              photogrammetry.faces.push([b, d, c]); // Second triangle
            }
          }
        }
        photogrammetry.computeNormals();

        //Make the first pixel of the texture transparent so we can use it to
        //set the transparent areas of the model
        snapshot.erase(255);
        snapshot.rect(0,0, 1,1);
        snapshot.noErase();

        //End of rendering
        rendering = false;
        finishedRender = sketch.frameCount;
    }
    
    function easeInOutCubic(number){
        return number < 0.5 ? 4 * number * number * number : 1 - Math.pow(-2 * number + 2, 3) / 2;
    }
};

function logProgress(data) {
  if(data.progress && data.status == 'progress' && data.file.includes('.onnx')) {
    document.querySelector('.downloader span').textContent = Math.round(data.progress) + '%';
  }
  
  if(data.status == 'ready') {
    document.querySelector('.screen--loading').classList.remove('screen--loading');
  }
}