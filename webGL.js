'use strict';

/* The code in this file was derived from */
//https://namelessalgorithm.com/webgl_raymarch/
/*   For an introduction to raymarching   */
//https://github.com/wsmind/webglparis2015-raymarching/tree/master/shaders
/*             Useful Sources             */
//https://github.com/nopjia/WebGL-RayMarch
//https://www.youtube.com/watch?v=s6t0mJsgUKw


const vsGLSL = `
attribute vec2 aVertexPosition;
attribute vec2 aPlotPosition;
attribute vec2 aJuliaPosition;

varying vec2 vPosition;
varying vec2 vJuliaPosition;//unused

void main(void) {
  gl_Position = vec4(aVertexPosition, 1.0, 1.0);
  vPosition = aPlotPosition;
  vJuliaPosition = aJuliaPosition;
}
`;

const fsGLSL = `
precision mediump float;

varying vec2 vJuliaPosition;//unused
varying vec2 vPosition;

uniform float time;
uniform vec3 relativePosition;
uniform vec2 relativeRotation;

// SDF Functions
vec3 translate(vec3 p, vec3 v) {return p - v;} 
float or(float a, float b) { return min(a,b); }
float and(float a, float b) { return max(a,b); }

// Local Space
float sdSphere(vec3 p) { return length(p + relativePosition) - 1.0; }
float sdBox(vec3 p) {
  return max(
    max(
      p.x * p.x - 0.4,
      p.y * p.y - 0.4
    ),
      p.z * p.z - 0.4
  );
}



// World Space
float sdField(vec3 p) { //, vec2 r) {
  return sdBox(p);
}

void main(void) {
  vec3 pos = vec3(vPosition.x, vPosition.y, 0.0);

  vec3 direction = pos - vec3(0.0, 0.0, -1.0);

  // ray marching
  float d = 10.0;
  for(int i = 0; i < 256; i++) {
    d = sdField(pos);
    pos += direction * d;
    if(d < 0.02 || pos.z > 100.0) break;
  }

  float r = 0.0, g = 0.0, b = 0.0;
  if(d<=0.02) {
    
    // estimate normal based on finite difference approx of gradient
    vec3 gradient = sdField(pos) - vec3(
      sdField(pos + vec3(.001,.000,.000)),
      sdField(pos + vec3(.000,.001,.000)),
      sdField(pos + vec3(.000,.000,.001))
    );
    vec3 normal = normalize( gradient );

    // red diffuse light
    vec3 l = normalize(vec3(0.5,-0.5,+0.5));
    r = dot( normal, l ) * 1.0;
    //r = normal.x * 0.5 + 0.5;
    //g = normal.y * 0.5 + 0.5;
    //b = normal.z * 0.5 + 0.5;
    // green diffuse light
    g = dot( normal, normalize(vec3(-0.4,0.4,+0.4))) * 0.2;
    // blue diffuse light
    b = dot( normal, normalize(vec3(0.9,-0.3,+0.4))) * 0.3;
    
  }
  gl_FragColor = vec4(r, g, b, 1.0);
}
`;

/* Global Variables */
var t = 0; // R - for use in animation (time)
var timer = 0;// R
var gl;// 1
var shaderProgram;//2
var aVertexPosition;
var aPlotPosition;
var aJuliaPosition;
var timeLocation;
var relativePosition;
var relativeRotation;
var cameraPosition = [0, 0, 0];
var cameraRotation = [0, 0];

/* Helper Functions */
function resizeCanvas(w) {
  var ratio = 425 / 330;
  if (w == -1) {
    canvas.parentNode.style.position = "absolute";
    canvas.parentNode.style.top = 0;
    w = canvas.parentNode.parentNode.offsetHeight * ratio;
  }
  else {
    canvas.parentNode.style.position = "";
    canvas.parentNode.style.top = "";
  }
  canvas.width = w;
  canvas.height = w / ratio;

  gl.viewport(0, 0, canvas.width, canvas.height);
    
  render();
}


/*** Rendering ***/

function render() {
  var cornerIx;
  var corners = [];
  for (cornerIx in baseCorners) {
    var tp = t + Math.sin(t * 0.27 + cornerIx * Math.PI / 2) * (Math.sin(t * 0.55) * 0.4 + 0.4);
    corners.push(Math.sin(tp * 0.7));
    corners.push(Math.sin(tp));
  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners), gl.STATIC_DRAW);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function animate() {
  /*t += 0.01;
  if (t > Math.PI * 200) {
    t -= Math.PI * 200;
  }

  gl.uniform1f(timeLocation, t);
  */
  gl.uniform3fv(relativePosition, [-cameraPosition.x, -cameraPosition.y, -cameraPosition.z]);
  //gl.uniform2fv(relativeRotation, [-cameraRotation.x, -cameraRotation.y]);
  render();
}

function fixedLoop() {
  if (timer) {
    clearInterval(timer);
    timer = 0;
  }
  else {
    timer = setInterval(animate, 15);// Update scene every 15ms
  }
}


/*** WebGL Initialization ***/

function initGL(canvas) {// init STEP 1
  try {
    gl = canvas.getContext("webgl");
    gl.viewport(0, 0, canvas.width, canvas.height);
  } catch(e) {}
  if (!gl) {
    alert("Could not initialise WebGL, sorry :-(");
  }
}


function initShaders() {// init STEP 2
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

  gl.shaderSource(vertexShader, vsGLSL);
  gl.shaderSource(fragmentShader, fsGLSL);

  gl.compileShader(vertexShader);
  gl.compileShader(fragmentShader);

  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(vertexShader))
  };
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(fragmentShader))
  };

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramParameter(shaderProgram))
  };

  gl.useProgram(shaderProgram);

  //Search attributes
  aVertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  aPlotPosition = gl.getAttribLocation(shaderProgram, "aPlotPosition");
  aJuliaPosition = gl.getAttribLocation(shaderProgram, "aJuliaPosition");
    gl.enableVertexAttribArray(aVertexPosition);
    gl.enableVertexAttribArray(aPlotPosition);
    gl.enableVertexAttribArray(aJuliaPosition);
  timeLocation = gl.getUniformLocation(shaderProgram, "time");
  relativePosition = gl.getUniformLocation(shaderProgram, "relativePosition");
  relativeRotation = gl.getUniformLocation(shaderProgram, "relativeRotation");
}


var baseCorners = [// REMOVE
  [ 1.7,  1.2],
  [-1.7,  1.2],
  [ 1.7, -1.2],
  [-1.7, -1.2],
];

function initBuffers() {// init STEP 3
  const vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  var vertices = [
     1.0,  1.0,
    -1.0,  1.0,
     1.0, -1.0,
    -1.0, -1.0,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);


  var plotPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, plotPositionBuffer);
  var cornerIx;
  var corners = [];
  for (cornerIx in baseCorners)
  {
    corners.push(baseCorners[cornerIx][0]); // x
    corners.push(baseCorners[cornerIx][1]); // y
  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners), gl.STATIC_DRAW);
  gl.vertexAttribPointer(aPlotPosition, 2, gl.FLOAT, false, 0, 0);


  const juliaPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, juliaPositionBuffer);
  gl.vertexAttribPointer(aJuliaPosition, 2, gl.FLOAT, false, 0, 0);
}


/*** Initialization ***/

async function init() {
  const canvas = document.querySelector('canvas');
  
  initGL(canvas);
  initShaders();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);

  initBuffers();
}
window.onload = init();//   typo?
window.onresize = resizeCanvas(window.innerWidth);
document.onload = fixedLoop();