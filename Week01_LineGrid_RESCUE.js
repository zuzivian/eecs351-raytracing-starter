//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// TABS set to 2.
//
// ORIGINAL SOURCES:
// Chap 5: TexturedQuad.js (c) 2012 matsuda and kanda
//					"WebGL Programming Guide" pg. 163
// RotatingTranslatedTriangle.js (c) 2012 matsuda
// JT_MultiShader.js  for EECS 351-1,
//									Northwestern Univ. Jack Tumblin
//----------------------------------------------------------------------
//	traceWeek01_LineGrid.js 		Northwestern Univ. Jack Tumblin
//----------------------------------------------------------------------
//	--add comments
//	--add mouse & keyboard functions + on-screen display & console reporting
//	--two side-by-side viewports:
//			LEFT:	--3D line-drawing preview
//			RIGHT:--texture-map from a Uint8Array object.
//						(NOTE: Not all versions of WebGL offer floating-point textures:
//							instead our ray-tracer will fill a Float32Array array in a
//               CImgBuf object. To display that image, our CImgBuf object
//	             converts RGB 32-bit floats to 8 bit RGB integers for
//               the Uint8Array texture map we show on-screen.
//               (convert by rounding: intRGB = floatRGB*255.5)
//	--include re-sizing so that HTML-5 canvas always fits browser-window width
//							(see 351-1 starter code: 7.11.JT_HelloCube_Resize.js, .html)
//	--revise to use VBObox0,VBObox1 objects; each holds one VBO & 1 shader pgm,
//			so that changes to code for WebGL preview in the left viewport won't
//			affect code for the right viewport that displays ray-traced result by
//			texture-mapping.
//	--Update VBObox code: drop old VBOboxes.js, add JT_VBObox-Lib.js (vers. 18)
//    with 'switchToMe()' and improved animation timing
// --Unify our user-interface's global variables into one 'GUIbox' object.
//==============================================================================

// Global Variables
//   (These are almost always a BAD IDEA, but here they eliminate lots of
//    tedious function arguments.
//    Later, collect them into just a few global, well-organized objects!)
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
var g_lastMS = Date.now();			// Timestamp (in milliseconds) for our
                                // most-recently-drawn WebGL screen contents.
                                // Set & used by moveAll() fcn to update all
                                // time-varying params for our webGL drawings.
  // All time-dependent params (you can add more!)
/*
var g_angleNow0  =  0.0; 			  // Current rotation angle, in degrees.
var g_angleRate0 = 45.0;				// Rotation angle rate, in degrees/second.
*/
//--END---GLOBAL VARIABLES------------------------------------------------------

function main() {
//=============================================================================
// Function that begins our Javascript program (because our HTML file specifies
// its 'body' tag to define the 'onload' parameter as main() )

//  test_glMatrix();		// make sure that the fast vector/matrix library we use
  										// is available and working properly.

  // Retrieve the HTML-5 <canvas> element where webGL will draw our pictures:
  g_canvasID = document.getElementById('webgl');

  // Create the the WebGL rendering context: one giant JavaScript object that
  // contains the WebGL state machine, adjusted by big sets of WebGL functions,
  // built-in variables & parameters, and member data. Every WebGL func. call
  // will follow this format:  gl.WebGLfunctionName(args);
  //gl = getWebGLContext(g_canvasID); // SIMPLE version.
  // Here's a BETTER version:
  gl = g_canvasID.getContext("webgl", { preserveDrawingBuffer: true});
	// This fancier-looking version disables HTML-5's default screen-clearing,
	// so that our drawAll() function will over-write previous on-screen results
	// until we call the gl.clear(COLOR_BUFFER_BIT); function. )
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  gl.clearColor(0.2, 0.2, 0.2, 1);	  // set RGBA color for clearing <canvas>
  gl.enable(gl.DEPTH_TEST);           // CAREFUL! don't do depth tests for 2D!

  gui.init();                   // Register all Mouse & Keyboard Event-handlers
                                // (see JT_GUIbox-Lib.js )

test_glMatrix();	// Make sure you understand how glMatrix.js library works.
					// (open console to see what's printed there)

  // Initialize each of our 'vboBox' objects:
  preView.init(gl);		// VBO + shaders + uniforms + attribs for WebGL preview
  rayView.init(gl);		//  "		"		" to display ray-traced on-screen result.

  onBrowserResize();			// Re-size this canvas before we use it. (ignore the
  // size settings from our HTML file; fill browser window with canvas whose
  // width is twice its height.)

  drawAll();
//----------------------------------------------------------------------------
// NOTE! Our ray-tracer ISN'T 'animated' in the usual sense!
// --No 'tick()' function, no continual automatic re-drawing/refreshing.
// --Instead, call 'drawAll()' after user makes an on-screen change, e.g. after
// mouse drag, after mouse click, after keyboard input, and after ray-tracing.
// --You can also re-draw screen to show ray-tracer progress on-screen:
//  try calling drawAll() after ray-tracer finishes each set of 16 scanlines,
//  or perhaps re-draw after every 1-2 seconds of ray-tracing.
//----------------------------------------------------------------------------
}

function print_mat4(a, nameStr) {
//==============================================================================
// Pretty-print contents of a glMatrix 4x4 matrix object in console.
// Used in test_glMatrix() function below; a handy debugging tool too.
    //'String.padStart()' leaves space for minus sign & 2
  var res = 3;    // resolution: how many digits to print after decimal point.

// TRICKY: for all matrix elements,
// FIND largest # of digits in front of decimal point.
// -----------------
  var cnt, iVal;    // array index; integer part of a[cnt],
  var len=0, pad=0; // # digits in iVal, largest len value found.
  for(cnt=0,len=0; cnt<16; cnt++) {
    iVal = Math.floor(a[cnt]);
    len = iVal.toString().length;
    if(len > pad) pad = len;
 //   console.log('floor(a[', cnt, ']) length: ', iVal.toString().length);
  }
  pad = pad+res+1;  // enough room for leading digits, trailing digits + sign
//  console.log("pad:", pad);
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

function test_glMatrix() {
//=============================================================================
// Make sure that the fast vector/matrix library we use is available and works
// properly. My search for 'webGL vector matrix library' found the GitHub
// project glMatrix is intended for WebGL use, and is very fast, open source
// and well respected.		 	SEE:       http://glmatrix.net/
// 			NOTE: cuon-matrix.js library (supplied with our textbook: "WebGL
// Programming Guide") duplicates some of the glMatrix.js functions. For
// example, the glMatrix.js function 		mat4.lookAt() 		is a work-alike
//	 for the cuon-matrix.js function 		Matrix4.setLookAt().
// Try some vector vec4 operations:
	var myV4 = vec4.fromValues(1,8,4,7);				// create a 4-vector
																							// (without 'var'? global scope!)
  console.log('-----TEST------\n-----glMatrix.js library------------');
  var outV4 = vec4.create();
  console.log('0):\n var outV4 = vec4.create();\n result:');
  console.log('outV4 object:\n ', outV4);
  console.log('\n outV4[0]: ', outV4[0],
              '\n outV4[1]: ', outV4[1],
              '\n outV4[2]: ', outV4[2],
              '\n outV4[3]: ', outV4[3] );
  console.log('1):\n var myV4 = vec4.fromValues(1,8,4,7);  result:\n', myV4);
	console.log('\n myV4[0] = ', myV4[0],
	            '\n myV4[1] = ', myV4[1],
	            '\n myV4[2] = ', myV4[2],
	            '\n myV4[3] = ', myV4[3] );
	console.log("  **OR** use the vec4.str() member function that returns the",
	            " vector as a string, so that: console.log(vec4.str(myV4));");
	console.log("will print: \n ", vec4.str(myV4));

	console.log('2):\n var yerV4 = vec4.fromValues(1,1,1,1); result:');
	var yerV4 = vec4.fromValues(1,1,1,1);
	console.log('\n yerV4[] object:\n ', yerV4);
	console.log('or if we print the vec4.str(yerV4) string:', vec4.str(yerV4));
	console.log('3):\n vec4.subtract(outV4, yerV4, myV4);\n');
	vec4.subtract(outV4, yerV4, myV4);
		console.log('\n RESULT: outV4[] object:\n ', outV4);
	console.log("or print string from vec4.str(myV4):\n", vec4.str(myV4));

	console.log('4):=================\n  4x4 Matrix tests:\n4):=================\n',
	            '  var myM4 = mat4.create();\n   ',
	            '("creates" a 4x4 identity matrix)');
	            // Try some matrix mat4 operations:
	var myM4 = mat4.create();							// create a 4x4 matrix
	console.log('\n print myM4 object:\n ', myM4);
	console.log('\nHmmm. Is this "row-major" order? \n',
	            ' (Starts at upper left,\n',
	            '  right-to-left on top row,\n',
	            '  repeat on next-lower row, etc)?');
	console.log('\nOr is it "column-major" order?\n',
	            ' (Starts at upper left,\n',
	            '  top-to-bottom on left column,\n',
	            '  repeat on next-rightwards column, etc)?');
	// Nice illustration: https://en.wikipedia.org/wiki/Row-_and_column-major_order

	console.log('\nMake a translate matrix from a vec3 or vec4 displacement to find out:\n',
	            'var transV3 = vec3.fromValues(0.6,0.7,0.8);\n',
				'var transV4 = vec4.fromValues( 6, 7, 8, 9):\n');
	var transV3 = vec3.fromValues(0.60, 0.70, 0.80); // a 3D translation vector
	var transV4 = vec4.fromValues(6,7,8,9);       // a '4D' translation vector
	console.log('\n mat4.translate(myM4, myM4, transV3);\n',
	            '   (this means: myM4 = myM4 translated by transV3)');
	mat4.translate(myM4, myM4, transV3);	// make into translation matrix
  console.log('\n print myM4 object made from transV3:', myM4);
  myM4 = mat4.create();
	mat4.translate(myM4, myM4, transV4);
  console.log('\n print myM4 object made from transV4:', myM4);
  console.log("AHA!! As you can see, mat4.translate() IGNORES the vec4 'w' value. Good!")
	//---------------------------------------------------------------------------
	// As you can see, the 'mat4' object stores matrix contents in COLUMN-first
	// order; to display this translation matrix correctly, do this
	console.log('\n !AHA! COLUMN-MAJOR order:\n',
	 'top-to-bottom starting at leftmost column.\n',
	 'I wrote a print_mat4() fcn (just above)--\n',
	 'Call print_mat4(myM4,"Translation matrix myM4"):');
	 print_mat4(myM4, "Translation matrix myM4");
 // re-sizing text for print_mat4() function
  console.log("check print_mat4() resizing by setting myMat elements to varied digits:");
  var myMat = mat4.create();
  myMat[ 0] = 0.9876543;
  myMat[ 1] = -0.9876543;
  myMat[ 2] = 1.9876543;
  myMat[ 3] = -1.9876543;
  myMat[ 4] = 12.9876543;
  myMat[ 5] = -12.9876543;
  myMat[ 6] = 123.9876543;
  myMat[ 7] = -123.9876543;
  myMat[ 8] = 1234.9876543;
  myMat[ 9] = -1234.9876543;
  myMat[10] = 12345.9876543;
  myMat[11] = -12345.9876543;
  myMat[12] = 123456.9876543;
  myMat[13] = -123456.9876543;
  print_mat4(myMat, "myMat");

	console.log('SUGGESTION:\n write similar fcns for mat2,mat3, vec2,vec3,vec4,',
				' OR look into later versions of the glMatrix library...');
	// Now test glMatrix concatenation;
  console.log('\n---------------------------',
              '\n Matrix Concatenation.',
              '\n---------------------------',
              '\n  glMatrix offers composable transform functions such as',
              '\n     mat4.translate(out,a,v)',
              '\n     mat4.rotate(out,a,rad,axis)',
              '\n     mat4.scale(out,a,v)');
  console.log('\n? HOW do these fcns compute [out]',
              "\n from input matrix [a] and the function's",
              '\n newly-specified transform matrix [NEW]?',
              '\n ??? Does it compute [out] = [a][NEW]?',
              '\n ??? or does it find [out] = [NEW][a]?');
  console.log('Try it:\n',
              'var rotM4 = mat4.create(); //4x4 identity matrix');
  var rotM4 = mat4.create();
  console.log('\n Then mat4.rotateZ(rotM4, rotM4, glMatrix.toRadians(30.0);');
  mat4.rotateZ(rotM4, rotM4, glMatrix.toRadian(30.0));
  print_mat4(rotM4,"rotM4 == z-axis rotation +30deg");
  console.log('now "translate" rotM4:\n',
              ' mat4.translate(outM4, rotM4, [5,0,0]);');
  var outM4 = mat4.create();
  mat4.translate(outM4, rotM4, [5,0,0]);
  print_mat4(outM4,"outM4 == rotM4 then translate(5,0,0)");
  console.log("=======\n !YES! \n=======\nthat's what we wanted!");
  console.log (' We have [rot][NEW],',
              '\n just like cuon-matrix.js',
              '\n== we transform drawing axes, not vertex coords',
              '("Method2" in lecture notes).');
/*
// DOUBLE-CHECK using matrix multiply:
  console.log('=============\n',
  '--DOUBLE-CHECK-- this result using matrix multiply:');
  var trnM4 = mat4.create();
  mat4.translate(trnM4, trnM4, [5,0,0]);
  print_mat4(trnM4,"trnM4==translate(5,0,0)");
  print_mat4(rotM4,"rotM4==rotateZ(+30deg)");
  mat4.multiply(outM4,rotM4,trnM4); //  multiply(out,a,b) finds [out] = [a][b];
  print_mat4(outM4,"outM4==[rotM4][trnM4]");
  console.log(" --------YES! [rotM4][trnM4] is what we want.");
  mat4.multiply(outM4,trnM4,rotM4); // multiply in opposite order
  print_mat4(outM4,"outM4==[trnM4][rotM4]");
  console.log(" xxxxxxxx NO! [trnM4][rotM4] IS NOT what we want.");
*/
}

function drawAll() {
//=============================================================================
// Re-draw all WebGL contents in our browser window.
//
// NOTE: this program doesn't have an animation loop!
//  We only re-draw the screen when the user needs it redrawn:
//  we call this function just once by main() at program start; or
//  by onBrowserResize() whenever our browser window size changes; or
//  by the GUIbox object 'gui' methods for user input from mouse, keyboard, or
//  on-screen buttons and controls (e.g. 't' or 'T' keys; mouse-drag;...)

  // Clear <canvas> color AND DEPTH buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Use OpenGL/ WebGL 'viewports' to map the CVV to the 'drawing context',
	// (for WebGL, the 'gl' context describes how we draw on the HTML-5 canvas)
	// Details? see  https://www.khronos.org/registry/webgl/specs/1.0/#2.3
  // Draw in the LEFT viewport:
  //------------------------------------------
	// CHANGE from our default viewport:
	// gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	// to a half-width viewport on the right side of the canvas:
	gl.viewport(0,														// Viewport lower-left corner
							0,														// (x,y) location(in pixels)
  						gl.drawingBufferWidth/2, 			// viewport width, height.
  						gl.drawingBufferHeight);
	preView.switchToMe();  // Set WebGL to render from this VBObox.
	preView.adjust();		  // Send new values for uniforms to the GPU, and
	preView.draw();			  // draw our VBO's contents using our shaders.

  // Draw in the RIGHT viewport:
  //------------------------------------------
  // MOVE our viewport from the left half of the canvas to the right:
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
  // report it:
  if(g_AAcode==1) {
    if(g_isJitter==0) {
  		document.getElementById('AAreport').innerHTML =
  		"1 sample/pixel. No jitter.";
      console.log("1 sample/pixel. No Jitter.");
    }
    else {
  		document.getElementById('AAreport').innerHTML =
  		"1 sample/pixel, but jittered.";
      console.log("1 sample/pixel, but jittered.")
    }
  }
  else { // g_AAcode !=1
    if(g_isJitter==0) {
  		document.getElementById('AAreport').innerHTML =
  		g_AAcode+"x"+g_AAcode+" Supersampling. No jitter.";
      console.log(g_AAcode,"x",g_AAcode,"Supersampling. No Jitter.");
    }
    else {
  		document.getElementById('AAreport').innerHTML =
  		g_AAcode+"x"+g_AAcode+" JITTERED Supersampling";
      console.log(g_AAcode,"x",g_AAcode," JITTERED Supersampling.");
    }
  }
}

function onJitterButton() {
//=============================================================================
	console.log('ON-JITTER button!!');
	if(g_isJitter ==0) g_isJitter = 1;      // toggle 0,1,0,1,...
	else g_isJitter = 0;

  // report it:
  if(g_AAcode==1) {
    if(g_isJitter==0) {
  		document.getElementById('AAreport').innerHTML =
  		"1 sample/pixel. No jitter.";
      console.log("1 sample/pixel. No Jitter.");
    }
    else {
  		document.getElementById('AAreport').innerHTML =
  		"1 sample/pixel, but jittered.";
      console.log("1 sample/pixel, but jittered.")
    }
  }
  else { // g_AAcode !=0
    if(g_isJitter==0) {
  		document.getElementById('AAreport').innerHTML =
  		g_AAcode+"x"+g_AAcode+" Supersampling. No jitter.";
      console.log(g_AAcode,"x",g_AAcode,"Supersampling. No Jitter.");
    }
    else {
  		document.getElementById('AAreport').innerHTML =
  		g_AAcode+"x"+g_AAcode+" JITTERED Supersampling";
      console.log(g_AAcode,"x",g_AAcode," JITTERED Supersampling.");
    }
  }
}

function onSceneButton() {
//=============================================================================
	//console.log('ON-SCENE BUTTON!');
	if(g_SceneNum < 0 || g_SceneNum >= G_SCENE_MAX) g_SceneNum = 0;
	else g_SceneNum = g_SceneNum +1;

	document.getElementById('SceneReport').innerHTML =
  			'Show Scene Number' + g_SceneNum;

  // Change g_myPic contents:
  g_myPic.setTestPattern(g_SceneNum);
  // transfer g_myPic's new contents to the GPU;
  rayView.switchToMe(); // be sure OUR VBO & shaders are in use, then
  rayView.reload();     // re-transfer VBO contents and texture-map contents
  drawAll();
}

function onBrowserResize() {
//=============================================================================
// Called when user re-sizes their browser window , because our HTML file
// contains:  <body onload="main()" onresize="onBrowserResize()">

	//Make a square canvas/CVV fill the SMALLER of the width/2 or height:
	if(innerWidth > 2*innerHeight) {  // fit to brower-window height
		g_canvasID.width = 2*innerHeight - 20;  // (with 20-pixel margin)
		g_canvasID.height = innerHeight - 20;   // (with 20-pixel margin_
	  }
	else {	// fit canvas to browser-window width
		g_canvasID.width = innerWidth - 20;       // (with 20-pixel margin)
		g_canvasID.height = 0.5*innerWidth - 20;  // (with 20-pixel margin)
	  }
// console.log('NEW g_canvas width,height=' +
//  						g_canvasID.width + ', ' + g_canvasID .height);
 drawAll();     // re-draw browser contents using the new size.
}
