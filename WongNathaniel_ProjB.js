// ORIGINAL SOURCES:
// Chap 5: TexturedQuad.js (c) 2012 matsuda and kanda
//					"WebGL Programming Guide" pg. 163
// RotatingTranslatedTriangle.js (c) 2012 matsuda
// JT_MultiShader.js  for EECS 351-1,
//									Northwestern Univ. Jack Tumblin
//	LineGrid.js 		Northwestern Univ. Jack Tumblin
//----------------------------------------------------------------------
//	LineGrid.js 		Northwestern Univ. Nathaniel Wong, for EECS 351-2
//----------------------------------------------------------------------

// Global Variables
// ============================================================================
//-----For WebGL usage:-------------------------
var gl;													// WebGL rendering context -- the 'webGL' object
																// in JavaScript with all its member fcns & data
var g_canvasID;									// HTML-5 'canvas' element ID#

//-----Mouse,keyboard, GUI variables-----------
var gui = new GUIbox(); // Holds all (Graphical) User Interface fcns & vars, for
                        // keyboard, mouse, HTML buttons, window re-sizing, etc.

//-----For the VBOs & Shaders:-----------------
preView = new VBObox0();		// For WebGLpreview: holds one VBO and its shaders
rayView = new VBObox1();		// for displaying the ray-tracing results.

//-----------Ray Tracer Objects:---------------
var g_myPic = new CImgBuf(256,256); // Create a floating-point image-buffer
                        // object to hold the image created by 'g_myScene' object.

var g_myScene = new CScene(g_myPic); // Create our ray-tracing object;
                        // this contains our complete 3D scene & its camera
                        // used to write a complete ray-traced image to the
                        // CImgBuf object 'g_myPic' given as argument.

var g_SceneNum = 0;			// scene-selector number; 0,1,2,... G_SCENE_MAX-1
var G_SCENE_MAX = 3;		// Number of scenes defined.

var g_AAcode = 1;			// Antialiasing setting: 1 == NO antialiasing at all.
                        // 2,3,4... == supersamples: 2x2, 3x3, 4x4, ...
var G_AA_MAX = 4;				// highest super-sampling number allowed.
var g_isJitter = 0;     // ==1 for jitter, ==0 for no jitter.

//-----For animation & timing:---------------------
var g_lastMS = Date.now();			// Timestamp (in milliseconds)

// All time-dependent params (you can add more!)
/*
var g_angleNow0  =  0.0; 			  // Current rotation angle, in degrees.
var g_angleRate0 = 45.0;				// Rotation angle rate, in degrees/second.
*/

function main() {

  // Retrieve the HTML-5 <canvas> element where webGL will draw our pictures:
  g_canvasID = document.getElementById('webgl');

  // Create the the WebGL rendering context: one giant JavaScript object
  gl = g_canvasID.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  gl.clearColor(0.2, 0.2, 0.2, 1);	  // set RGBA color for clearing <canvas>
  gl.enable(gl.DEPTH_TEST);           // CAREFUL! don't do depth tests for 2D!

  gui.init();                   // Register all Mouse & Keyboard Event-handlers

  // Initialize each of our 'vboBox' objects:
  preView.init(gl);		// VBO + shaders + uniforms + attribs for WebGL preview
  rayView.init(gl);		//  "		"		" to display ray-traced on-screen result.

  onBrowserResize();			// Re-size this canvas before we use it.

  drawAll();
}

function drawAll() {
//=============================================================================
// Re-draw all WebGL contents in our browser window.
// NOTE: this program doesn't have an animation loop!
//  We only re-draw the screen when the user needs it redrawn

  // Clear <canvas> color AND DEPTH buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Use OpenGL/ WebGL 'viewports' to map the CVV to the 'drawing context',
  // Draw in the LEFT viewport:
	gl.viewport(0,														// Viewport lower-left corner
							0,														// (x,y) location(in pixels)
  						gl.drawingBufferWidth/2, 			// viewport width, height.
  						gl.drawingBufferHeight);
	preView.switchToMe();  // Set WebGL to render from this VBObox.
	preView.adjust();		  // Send new values for uniforms to the GPU, and
	preView.draw();			  // draw our VBO's contents using our shaders.

  // Draw in the RIGHT viewport:

	gl.viewport(gl.drawingBufferWidth/2,   // Viewport lower-left corner
	            0,      // location(in pixels)
	            gl.drawingBufferWidth/2, 			// viewport width, height.
  	          gl.drawingBufferHeight);
    rayView.switchToMe(); // Set WebGL to render from this VBObox.
  	rayView.adjust();		  // Send new values for uniforms to the GPU, and
  	rayView.draw();			  // draw our VBO's contents using our shaders.
}

function onSuperSampleButton() {
//=============================================================================
// advance to the next antialiasing mode.
	//console.log('ON-SuperSample BUTTON!');
  g_AAcode += 1;
  if(g_AAcode > G_AA_MAX) g_AAcode = 1; // 1,2,3,4, 1,2,3,4, 1,2,... etc

  if(g_AAcode==1) {
    if (g_isJitter==0)
      document.getElementById('AAreport').innerHTML = "1 sample/pixel. No jitter.";
    else
      document.getElementById('AAreport').innerHTML = "1 sample/pixel, JTTERED.";
  }
  else { // g_AAcode !=1
    if(g_isJitter==0)
      document.getElementById('AAreport').innerHTML = g_AAcode+"x"+g_AAcode+" Supersampling. No jitter.";
    else
      document.getElementById('AAreport').innerHTML = g_AAcode+"x"+g_AAcode+" JITTERED Supersampling";
  }
}

function onJitterButton() {
	//console.log('ON-JITTER button!!');
  g_isJitter = g_isJitter ? 0 : 1;

  if(g_AAcode==1) {
    if (g_isJitter==0)
      document.getElementById('AAreport').innerHTML = "1 sample/pixel. No jitter.";
    else
      document.getElementById('AAreport').innerHTML = "1 sample/pixel, JTTERED.";
  }
  else { // g_AAcode !=1
    if(g_isJitter==0)
      document.getElementById('AAreport').innerHTML = g_AAcode+"x"+g_AAcode+" Supersampling. No jitter.";
    else
      document.getElementById('AAreport').innerHTML = g_AAcode+"x"+g_AAcode+" JITTERED Supersampling";
  }
}

function onSceneButton() {
	//console.log('ON-SCENE BUTTON!');
	if(g_SceneNum < 0 || g_SceneNum >= G_SCENE_MAX) g_SceneNum = 0;
	else g_SceneNum = g_SceneNum +1;

	document.getElementById('SceneReport').innerHTML = 'Scene Number ' + g_SceneNum;

  // Change g_myPic contents:
  g_myPic.setTestPattern(g_SceneNum);
  // transfer g_myPic's new contents to the GPU;
  rayView.switchToMe(); // be sure OUR VBO & shaders are in use, then
  rayView.reload();     // re-transfer VBO contents and texture-map contents
  drawAll();
}

function onBrowserResize() {
  // Called when user re-sizes their browser window

	//Make a square canvas/CVV fill the SMALLER of the width/2 or height:
	if(innerWidth > 2*innerHeight) {  // fit to brower-window height
		g_canvasID.width = 2*innerHeight - 20;  // (with 20-pixel margin)
		g_canvasID.height = innerHeight - 20;   // (with 20-pixel margin_
	  }
	else {	// fit canvas to browser-window width
		g_canvasID.width = innerWidth - 20;       // (with 20-pixel margin)
		g_canvasID.height = 0.5*innerWidth - 20;  // (with 20-pixel margin)
	  }
  drawAll();     // re-draw browser contents using the new size.
}

function print_mat4(a, nameStr) {
//==============================================================================
// Pretty-print contents of a glMatrix 4x4 matrix object in console.
  var res = 3;    // resolution: how many digits to print after decimal point.

// FIND largest # of digits in front of decimal point.
  var cnt, iVal;    // array index; integer part of a[cnt],
  var len=0, pad=0; // # digits in iVal, largest len value found.
  for(cnt=0,len=0; cnt<16; cnt++) {
    iVal = Math.floor(a[cnt]);
    len = iVal.toString().length;
    if(len > pad) pad = len;
  }
  pad = pad+res+1;  // enough room for leading digits, trailing digits + sign
	console.log( '\n-------',nameStr,'-------\n',
'row0=[' + a[ 0].toFixed(res).padStart(pad, " ") + ', '
         + a[ 4].toFixed(res).padStart(pad, " ") + ', '
         + a[ 8].toFixed(res).padStart(pad, " ") + ', '
         + a[12].toFixed(res).padStart(pad, " ") + ']\n',
'row1=[' + a[ 1].toFixed(res).padStart(pad, " ") + ', '
         + a[ 5].toFixed(res).padStart(pad, " ") + ', '
         + a[ 9].toFixed(res).padStart(pad, " ") + ', '
         + a[13].toFixed(res).padStart(pad, " ") + ']\n',
'row2=[' + a[ 2].toFixed(res).padStart(pad, " ") + ', '
         + a[ 6].toFixed(res).padStart(pad, " ") + ', '
         + a[10].toFixed(res).padStart(pad, " ") + ', '
         + a[14].toFixed(res).padStart(pad, " ") + ']\n',
'row3=[' + a[ 3].toFixed(res).padStart(pad, " ") + ', '
         + a[ 7].toFixed(res).padStart(pad, " ") + ', '
         + a[11].toFixed(res).padStart(pad, " ") + ', '
         + a[15].toFixed(res).padStart(pad, " ") + ']\n' );
}
