//@autor samuelm2
// An implementation of skybox and other stuff

var gl;
var canvas;

var inverted;
var light;

var image_count = 0;
var image_total = 6;

var faces = [];
var verts = [];
var norms = [];

var shaderProgram;
var texID;

// Create a place to store the texture coords for the mesh
var cubeTCoordBuffer;

// Create a place to store terrain geometry
var cubeVertexBuffer;

// Create a place to store the triangles
var cubeTriIndexBuffer;

var potVertexBuffer;
var potTriIndexBuffer;
var potNormalBuffer;
var potNormals;

var reflectVertex;
var reflectFragment;
var reflectProgram;

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];
var currentlyPressedKeys = {};

// Create a place to store the texture

var cubeImage_negx;
var currentRotateAmount = 0;
var teapotRotateAmount = 0;

var counter = 0;


var imgs = new Array(6);
var texs = new Array(6);
var cubeMap;
var urls = ["pos-z.png", "neg-z.png", "pos-y.png", "neg-y.png", "neg-x.png", "pos-x.png"];





var cubeTexture_negx;


// For animation 
var then =0;
var modelXRotationRadians = degToRad(0);
var modelYRotationRadians = degToRad(0);


/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShaderPot() {
    gl.uniformMatrix4fv(potProgram.pMatrixUniform, 
                      false, pMatrix);
    
}

function uploadProjectionMatrixToShader() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

function uploadProjectionMatrixToShaderReflective() {
    gl.uniformMatrix4fv(reflectProgram.pMatrixUniform, 
                      false, pMatrix);
}

function uploadModelViewMatrixToShaderReflective() {
  gl.uniformMatrix4fv(reflectProgram.mvMatrixUniform, false, mvMatrix);
}

function uploadModelViewMatrixToShaderPot() {
  gl.uniformMatrix4fv(potProgram.mvMatrixUniform, false, mvMatrix);
}

function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadProjectionMatrixToShader();
    
}

function setMatrixUniformsPot() {
    uploadModelViewMatrixToShaderPot();
    uploadProjectionMatrixToShaderPot();
    var normal = mat3.create();
    mat3.normalFromMat4(normal, mvMatrix);
    gl.uniformMatrix3fv(potProgram.nMatrixUniform, false, normal);
}

function setMatrixUniformsReflective() {
    uploadModelViewMatrixToShaderReflective();
    uploadProjectionMatrixToShaderReflective();
    var normal = mat3.create();
    mat3.normalFromMat4(normal, mvMatrix);
    gl.uniformMatrix3fv(reflectProgram.nMatrixUniform, false, normal);

    gl.uniformMatrix3fv(reflectProgram.invertMatrixUniform, false, inverted);
}

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

/**
 * Setup the fragment and vertex shaders
 */
function setupShadersPot() {

  potVertex = loadShaderFromDOM("potshader-vs");
  potFragment = loadShaderFromDOM("potshader-fs");

  potProgram = gl.createProgram();
  gl.attachShader(potProgram, potVertex);
  gl.attachShader(potProgram, potFragment);
  gl.linkProgram(potProgram); 
  
  gl.useProgram(potProgram);
  potProgram.vertexPositionAttribute = gl.getAttribLocation(potProgram, "aVertexPosition");
  gl.enableVertexAttribArray(potProgram.vertexPositionAttribute)
    
  potProgram.vertexNormalAttribute = gl.getAttribLocation(potProgram, "aVertexNormal");
  gl.enableVertexAttribArray(potProgram.vertexNormalAttribute);
    
;
    
  potProgram.mvMatrixUniform = gl.getUniformLocation(potProgram, "uMVMatrix");
  potProgram.pMatrixUniform = gl.getUniformLocation(potProgram, "uPMatrix");
  potProgram.nMatrixUniform = gl.getUniformLocation(potProgram, "normalMatrix");
  potProgram.light = gl.getUniformLocation(potProgram, "light");
}


/**
 * Setup the fragment and vertex shaders
 */
function setupReflectiveShader() {

  reflectVertex = loadShaderFromDOM("reflectshader-vs");
  reflectFragment = loadShaderFromDOM("reflectshader-fs");

  reflectProgram = gl.createProgram();
  gl.attachShader(reflectProgram, reflectVertex);
  gl.attachShader(reflectProgram, reflectFragment);
  gl.linkProgram(reflectProgram); 
  
  gl.useProgram(reflectProgram);
  reflectProgram.vertexPositionAttribute = gl.getAttribLocation(reflectProgram, "aVertexPosition");
  gl.enableVertexAttribArray(reflectProgram.vertexPositionAttribute)
    
  reflectProgram.vertexNormalAttribute = gl.getAttribLocation(reflectProgram, "aVertexNormal");
  gl.enableVertexAttribArray(reflectProgram.vertexNormalAttribute);
    
    
  reflectProgram.mvMatrixUniform = gl.getUniformLocation(reflectProgram, "uMVMatrix");
  reflectProgram.pMatrixUniform = gl.getUniformLocation(reflectProgram, "uPMatrix");
  reflectProgram.nMatrixUniform = gl.getUniformLocation(reflectProgram, "normalMatrix");
  reflectProgram.invertMatrixUniform = gl.getUniformLocation(reflectProgram, "inverseViewTransform");
}
  
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
        
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }
  
  gl.useProgram(shaderProgram);
    
  shaderProgram.texCoordAttribute = gl.getAttribLocation(shaderProgram, "aTexCoord");
  console.log("Tex coord attrib: ", shaderProgram.texCoordAttribute);
  gl.enableVertexAttribArray(shaderProgram.texCoordAttribute);
    
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  console.log("Vertex attrib: ", shaderProgram.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");

}

/**
 * Draw a cube based on buffers.
 */
function drawCube(){
    gl.useProgram(shaderProgram);
  // Draw the cube by binding the array buffer to the cube's vertices
  // array, setting attributes, and pushing it to GL.


  // Specify the texture to map onto the faces.


   var textures
  // Draw the cube.
  for(var i = 0; i < 6; i++) {
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

  // Set the texture coordinates attribute for the vertices.

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texs[i]);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer[i]);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }
  
}

/**
 * Draw call that applies matrix transformations to cube
 */
function draw() { 
    var transformVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);
 
    //Draw 
    mvPushMatrix();
    vec3.set(transformVec,0.0,0.0,-10.0);
    mat4.translate(mvMatrix, mvMatrix, transformVec);
    mat4.rotateY(mvMatrix,mvMatrix,currentRotateAmount);
    light = vec4.fromValues(0.,0,10.,1.);
    vec4.transformMat4(light, light, mvMatrix);
    drawCube();
    inverted = mat3.create();
    mat3.fromMat4(inverted, mvMatrix);
    mat3.invert(inverted, inverted);
    mvPushMatrix();
    mat4.rotateY(mvMatrix, mvMatrix, teapotRotateAmount);
    drawTeapot();
    mvPopMatrix();
    mvPopMatrix();
    
}

/**
 * Animation to be called from tick. Updates global rotation values.
 */
function animate() {
//    if (then==0)
//    {
//        then = Date.now();
//    }
//    else
//    {
//        now=Date.now();
//        // Convert to seconds
//        now *= 0.001;
//        // Subtract the previous time from the current time
//        var deltaTime = now - then;
//        // Remember the current time for the next frame.
//        then = now;
//
//        //Animate the rotation
//        modelXRotationRadians += 1.2 * deltaTime;
//        modelYRotationRadians += 0.7 * deltaTime;  
//    }
}

/**
 * Creates texture for application to cube.
 */
function setupTextures() {
//    for(var i = 0; i < 6; i++) {
//        imgs[i] = new Image();
//        imgs[i].onload = function() {
//            image_count++;
//            if(image_count == image_total) {
//                cubeMap = gl.createTexture();
//                gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
//                var locations = 
//            }
//        }
//    }
    for(var i = 0; i < 6; i++) {
        texs[i] = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texs[i]);
        imgs[i] = new Image();
        imgs[i].src = urls[i];   
    }
    imgs[0].onload = function() {
        handleTextureLoaded(imgs[0], texs[0]);
    }

    imgs[1].onload = function() {
        handleTextureLoaded(imgs[1], texs[1]);
    }    
    imgs[2].onload = function() {
        handleTextureLoaded(imgs[2], texs[2]);
    }    
    imgs[3].onload = function() {
        handleTextureLoaded(imgs[3], texs[3]);
    }    
    imgs[4].onload = function() {
        handleTextureLoaded(imgs[4], texs[4]);
    }
    imgs[5].onload = function() {
        handleTextureLoaded(imgs[5], texs[5]);
    }

// 
//// Fill the texture with a 1x1 blue pixel.
//gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
//              new Uint8Array([0, 0, 255, 255]));
//
//  cubeImage_negx = new Image();
//  cubeImage_negx.onload = function() { handleTextureLoaded(cubeImage_negx, cubeTexture_negx); }
//  cubeImage_negx.src = "neg-x.png";
   // https://goo.gl/photos/SUo7Zz9US1AKhZq49
}

/**
 * @param {number} value Value to determine whether it is a power of 2
 * @return {boolean} Boolean of whether value is a power of 2
 */
function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

/**
 * Texture handling. Generates mipmap and sets texture parameters.
 * @param {Object} image Image for cube application
 * @param {Object} texture Texture for cube application
 */
function handleTextureLoaded(image, texture) {
  counter++;
  if(counter == 6) {
      var targets = [
        gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 
        gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 
        gl.TEXTURE_CUBE_MAP_NEGATIVE_X, gl.TEXTURE_CUBE_MAP_POSITIVE_X 
    ];
        texID = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texID);
        for (var j = 0; j < 6; j++) {
            gl.texImage2D(targets[j], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imgs[j]);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }      
  }
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);  
    
    
  console.log("handleTextureLoaded, image = " + image);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
  // Check if the image is a power of 2 in both dimensions.
  if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
     // Yes, it's a power of 2. Generate mips.
     gl.generateMipmap(gl.TEXTURE_2D);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
     console.log("Loaded power of 2 texture");
  } else {
     // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
     console.log("Loaded non-power of 2 texture");
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

/**
 * Sets up buffers for cube.
 */
/**
 * Populate buffers with data
 */
function setupBuffers() {
  readTextFile("teapot_0.obj", parseTeapot);

  // Create a buffer for the cube's vertices.

  cubeVertexBuffer = gl.createBuffer();

  // Select the cubeVerticesBuffer as the one to apply vertex
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);

  // Now create an array of vertices for the cube.

  var vertices = [
    // Front face
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0, -1.0, -1.0,

    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    // Right face
     -1.0, -1.0, -1.0,
     -1.0,  1.0, -1.0,
     -1.0,  1.0,  1.0,
     -1.0, -1.0,  1.0,

    // Left face
    1.0, -1.0, -1.0,
    1.0, -1.0,  1.0,
    1.0,  1.0,  1.0,
    1.0,  1.0, -1.0
  ];
    
  for(var i = 0; i < vertices.length; i++) {
      vertices[i] *= 15;
  }

  // Now pass the list of vertices into WebGL to build the shape. We
  // do this by creating a Float32Array from the JavaScript array,
  // then use it to fill the current vertex buffer.

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // Map the texture onto the cube's faces.

  cubeTCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);

  var textureCoordinates = [
    // Front
    -1.0,  1.0,
    0.0,  1.0,
    0.0,  0.0,
    -1.0,  0.0,
    
    // Back
    1.0,  1.0,
    1.0,  0.0,
    0.0,  0.0,
    0.0,  1.0,
    
    // Top
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    0.0,  0.0,
    // Bottom
    1.0,  1.0,
    0.0,  1.0,
    0.0,  0.0,
    1.0,  0.0,
    // Right
    
    0.0,  1.0,
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    // Left

    1.0,  1.0,
    0.0,  1.0,
    0.0,  0.0,
    1.0,  0.0,
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                gl.STATIC_DRAW);

  // Build the element array buffer; this specifies the indices
  // into the vertex array for each face's vertices.

  cubeTriIndexBuffer = new Array(6);
  var cubeVertexIndices = [
    [0,  1,  2,      0,  2,  3],    // front
    [4,  5,  6,      4,  6,  7],    // back
    [8,  9,  10,     8,  10, 11],   // top
    [12, 13, 14,     12, 14, 15],   // bottom
    [16, 17, 18,     16, 18, 19],   // right
    [20, 21, 22,     20, 22, 23]    // left
  ]
  for(var i = 0; i < 6; i++) {
      cubeTriIndexBuffer[i] = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer[i]);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices[i]), gl.STATIC_DRAW);
  }
  //    gl.createBuffer();

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.



  // Now send the element array to GL

//  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
//      new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
    
    
}


/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  light = vec4.fromValues(0.,0,10.,1.);
  setupShadersPot();
  setupShaders();
  setupReflectiveShader();
  setupBuffers();
  setupTextures();
  tick();
}

/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    handleKeys();
    animate();
}


function handleKeyDown(event) {
  event.preventDefault();
  currentlyPressedKeys[event.keyCode] = true;
}

//----------------------------------------------------------------------------------
/**
 * 
 */
function handleKeyUp(event) {
  event.preventDefault();
  currentlyPressedKeys[event.keyCode] = false;
}

//----------------------------------------------------------------------------------
/**
 * 
 */
 function handleKeys() {
  if (currentlyPressedKeys[37] || currentlyPressedKeys[65]) {
    // Left cursor key or A
      currentRotateAmount -= .02;
  }
  if (currentlyPressedKeys[39] || currentlyPressedKeys[68]) {
    // Right cursor key or D
      currentRotateAmount += .02;

  } 
  if (currentlyPressedKeys[38] || currentlyPressedKeys[87]) {
      teapotRotateAmount += .02;

  } 
  if (currentlyPressedKeys[40] || currentlyPressedKeys[83]) {
      teapotRotateAmount -= 0.02;
  }

 }

/**
 * Gets a file from the server for processing on the client side.
 *
 * @param  file A string that is the name of the file to get
 * @param  callbackFunction The name of function (NOT a string) that will receive a string holding the file
 *         contents.
 *
 */


function readTextFile(file, callbackFunction)
{
    console.log("reading "+ file);
    var rawFile = new XMLHttpRequest();
    var allText = [];
    rawFile.open("GET", file, true);
    
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                 callbackFunction(rawFile.responseText);
                 console.log("Got text file!");
                 
            }
        }
    }
    rawFile.send(null);
}


function parseTeapot(fileString) {
    var lines = fileString.split("\n");
    var numV = 0;
    var numF = 0;
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        line = line.replace(/\s+/g, " ");
        var elements = line.split(" ");

        if(line[0] == 'v') {
            verts.push(parseFloat(elements[1]));
            verts.push(parseFloat(elements[2]));
            verts.push(parseFloat(elements[3]));
            numV +=1;
        } else if(line[0] == 'f') {
            numF +=1;
            faces.push(parseInt(elements[1]) - 1);
            faces.push(parseInt(elements[2]) - 1);
            faces.push(parseInt(elements[3]) - 1);
            

            
        } else{
            //do nothing
        }
    }
    norms = new Array(verts.length);
    console.log(faces.length);
    for(var i = 0; i < verts.length; i++) {
        norms[i] = 0;
    }
    for(var i = 0; i < faces.length/3; i++) {
        var index1 = faces[3*i];
        var index2 = faces[3*i + 1];
        var index3 = faces[3*i + 2];
        
        var point1 = vec3.fromValues(verts[3*index1], verts[3*index1 + 1], verts[3*index1 +2]);
        var point2 = vec3.fromValues(verts[3*index2], verts[3*index2 + 1], verts[3*index2 +2]);
        var point3 = vec3.fromValues(verts[3*index3], verts[3*index3 + 1], verts[3*index3 +2]);
        
        var diff1 = vec3.create();
        var diff2 = vec3.create();
        vec3.sub(diff1, point2, point1);
        vec3.sub(diff2, point3, point1);
        var norm = vec3.create();
        
        vec3.cross(norm, diff1, diff2);
        
        norms[3*index1] += norm[0];
        norms[3*index1 + 1] += norm[1];
        norms[3*index1 + 2] += norm[2];
        
        norms[3*index2] += norm[0];
        norms[3*index2 + 1] += norm[1];
        norms[3*index2 + 2] += norm[2];
        
        norms[3*index3] += norm[0];
        norms[3*index3 + 1] += norm[1];
        norms[3*index3 + 2] += norm[2];
        
    }
    
    for(var i = 0; i < verts.length; i++) {
        var norm = vec3.fromValues(norms[3*i], norms[3*i + 1], norms[3*i + 2]);
        vec3.normalize(norm, norm);
        norms[3*i] = norm[0];
        norms[3*i+1] = norm[1];
        norms[3*i+2] = norm[2];
    }
    
    console.log(norms);
    
    
    potVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, potVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    potVertexBuffer.itemSize = 3;
    potVertexBuffer.numItems = numV/3;
    console.log(numF);
    
    potNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, potNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(norms), gl.STATIC_DRAW);
    potNormalBuffer.itemSize = 3;
    potNormalBuffer.numItems = 6768/3;
    
    potTriIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, potTriIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), gl.STATIC_DRAW);
    potTriIndexBuffer.itemSize = 1;
    potTriIndexBuffer.numItems = numF;
    
    
}

function drawTeapot() {
    if(potVertexBuffer == null) {
        return;
    }
    
    if(document.getElementById("phong").checked) {
        gl.useProgram(potProgram);
        gl.uniform4fv(potProgram.light, light);
        setMatrixUniformsPot();

        gl.bindBuffer(gl.ARRAY_BUFFER, potVertexBuffer);
        gl.vertexAttribPointer(potProgram.vertexPositionAttribute, potVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, potNormalBuffer);
        gl.vertexAttribPointer(potProgram.vertexNormalAttribute, 
                           3,
                           gl.FLOAT, false, 0, 0);   

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, potTriIndexBuffer);
        gl.drawElements(gl.TRIANGLES, 6768 , gl.UNSIGNED_SHORT, 0);
    } else {
       gl.useProgram(reflectProgram);
       setMatrixUniformsReflective();
        
        gl.bindBuffer(gl.ARRAY_BUFFER, potVertexBuffer);
        gl.vertexAttribPointer(reflectProgram.vertexPositionAttribute, potVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, potNormalBuffer);
        gl.vertexAttribPointer(reflectProgram.vertexNormalAttribute, 
                           3,
                           gl.FLOAT, false, 0, 0);   

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, potTriIndexBuffer);
        gl.drawElements(gl.TRIANGLES, 6768 , gl.UNSIGNED_SHORT, 0);
       
    }

}
