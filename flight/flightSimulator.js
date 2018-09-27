
//@author samuelm2

var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;
var orientation;
var tempquat;
var framecounter = 0;
var transform = vec3.fromValues(0,0,0);
var currentSpeed = 0.001;
var currentlyPressedKeys = {};

// Create a place to store terrain geometry
var tVertexPositionBuffer;

//Create a place to store normals for shading
var tVertexNormalBuffer;

// Create a place to store the terrain triangles
var tIndexTriBuffer;

var tVertexColorBuffer;

//Create a place to store the traingle edges
var tIndexEdgeBuffer;

// View parameters
var eyePt = vec3.fromValues(.0,0.4,1.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0,0.0,0);

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];


//-------------------------------------------------------------------------
/**
 * Populates terrain buffers for terrain generation
 */
function setupTerrainBuffers() {
    
    var vTerrain=[];
    var fTerrain=[];
    var nTerrain=[];
    var eTerrain=[];
    var cTerrain=[];
    var gridN=128;
    var gridSize = 5;
    
    var numT = terrainFromIteration(gridN, -gridSize,gridSize,-gridSize,gridSize, vTerrain, fTerrain, nTerrain, cTerrain);
    console.log("Generated ", numT, " triangles"); 
    tVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vTerrain), gl.STATIC_DRAW);
    tVertexPositionBuffer.itemSize = 3;
    tVertexPositionBuffer.numItems = (gridN+1)*(gridN+1);
    
    // Specify normals to be able to do lighting calculations
    tVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nTerrain),
                  gl.STATIC_DRAW);
    tVertexNormalBuffer.itemSize = 3;
    tVertexNormalBuffer.numItems = (gridN+1)*(gridN+1);

    // Specify colors to be able to do color calculators
    tVertexColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cTerrain),
                  gl.STATIC_DRAW);
    tVertexColorBuffer.itemSize = 3;
    tVertexColorBuffer.numItems = (gridN+1)*(gridN+1);
    
    // Specify faces of the terrain 
    tIndexTriBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fTerrain),
                  gl.STATIC_DRAW);
    tIndexTriBuffer.itemSize = 1;
    tIndexTriBuffer.numItems = numT*3;
    
    //Setup Edges
     generateLinesFromIndexedTriangles(fTerrain,eTerrain);  
     tIndexEdgeBuffer = gl.createBuffer();
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(eTerrain),
                  gl.STATIC_DRAW);
     tIndexEdgeBuffer.itemSize = 1;
     tIndexEdgeBuffer.numItems = eTerrain.length;
    
     
}

//-------------------------------------------------------------------------
/**
 * Draws terrain from populated buffers
 */
function drawTerrain(){
 gl.polygonOffset(0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   

  // Bind color buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexColorBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 
                           tVertexColorBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
 //Draw 
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
 gl.drawElements(gl.TRIANGLES, tIndexTriBuffer.numItems, gl.UNSIGNED_SHORT,0);      
}

//-------------------------------------------------------------------------
/**
 * Draws edge of terrain from the edge buffer
 */
function drawTerrainEdges(){
 gl.polygonOffset(1,1);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
 //Draw 
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
 gl.drawElements(gl.LINES, tIndexEdgeBuffer.numItems, gl.UNSIGNED_SHORT,0);      
}

//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
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

//----------------------------------------------------------------------------------
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

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
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

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}


//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
    setupTerrainBuffers();
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 
    var transformVec = vec3.create();
    var up = vec3.fromValues(0.0,1.0,0.0);
    var viewDir = vec3.fromValues(0.0,0.0,-1.);
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction   
 
    // Then generate the lookat matrix and initialize the MV matrix to that view
    vec3.transformQuat(up, up, orientation);
    vec3.transformQuat(viewDir, viewDir, orientation);
    vec3.add(viewPt, eyePt, viewDir);
    mat4.lookAt(mvMatrix,eyePt,viewPt,up); 

    
    vec3.scale(viewDir, viewDir, currentSpeed);
    vec3.add(eyePt, eyePt, viewDir);

    mvPushMatrix();

    //var rotation  = mat4.create();
    //mat4.fromQuat(rotation, orientation);

    vec3.set(transformVec,0.0,-0.25,-3.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);

    //mat4.mul(mvMatrix, rotation, mvMatrix);
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-90));

    setMatrixUniforms();
    
    uploadLightsToShader([0,1,1],[0.0,0.0,0.0],[1.0,1.0,1.0],[.5,.5,.5]);
    drawTerrain();

    mvPopMatrix();
  
}

//----------------------------------------------------------------------------------
/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
function animate() {
   handleKeys();
}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  orientation = quat.create();
  quat.identity(orientation);
  tempquat = quat.create();
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.80, 0.85, 1, 1);
  gl.enable(gl.DEPTH_TEST);
  tick();
}

//----------------------------------------------------------------------------------
/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}

//----------------------------------------------------------------------------------
/**
 * 
 */
 function handleKeys() {
  if (currentlyPressedKeys[37] || currentlyPressedKeys[65]) {
    // Left cursor key or A
    var tempquat = quat.create();
    quat.fromEuler(tempquat, 0, 0, .5);
    quat.normalize(tempquat, tempquat);
    //vec3.transformQuat(up, up, tempquat);
    quat.mul(orientation, orientation, tempquat);
  }
  if (currentlyPressedKeys[39] || currentlyPressedKeys[68]) {
    // Right cursor key or D
    var tempquat = quat.create();
    quat.fromEuler(tempquat, 0, 0, -.5);
    quat.normalize(tempquat, tempquat);
    //vec3.transformQuat(up, up, tempquat);
    quat.mul(orientation, orientation, tempquat);

  } 
  if (currentlyPressedKeys[38] || currentlyPressedKeys[87]) {
    //Up or W
    var tempquat = quat.create()
    quat.fromEuler(tempquat, .20, 0, 0);
    quat.normalize(tempquat, tempquat);
    quat.mul(orientation, orientation, tempquat);
  } 
  if (currentlyPressedKeys[40] || currentlyPressedKeys[83]) {
    //Down or S
    var tempquat = quat.create()
    quat.fromEuler(tempquat, -.20, 0, 0);
    quat.normalize(tempquat, tempquat);
    quat.mul(orientation, orientation, tempquat);
  } else if(currentlyPressedKeys[187]) {
    currentSpeed += .00005;
  } else if(currentlyPressedKeys[189]) {
    if(currentSpeed > .001) {
          currentSpeed -= .00005;
      }
  }

 }

//----------------------------------------------------------------------------------
/**
 * 
 */
function handleKeyDown(event) {
  event.preventDefault();
  currentlyPressedKeys[event.keyCode] = true;
  console.log(event.keyCode);
}

//----------------------------------------------------------------------------------
/**
 * 
 */
function handleKeyUp(event) {
  event.preventDefault();
  currentlyPressedKeys[event.keyCode] = false;
}

