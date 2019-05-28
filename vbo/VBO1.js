/*=====================
  VBObox-Lib.js library:
  =====================

	-------------------------------------------------------
	A MESSY SET OF CUSTOMIZED OBJECTS--NOT REALLY A 'CLASS'
	-------------------------------------------------------
As each 'VBObox' object can contain:
  -- a DIFFERENT GLSL shader program,
  -- a DIFFERENT set of attributes that define a vertex for that shader program,
  -- a DIFFERENT number of vertices to used to fill the VBOs in GPU memory, and
  -- a DIFFERENT set of uniforms transferred to GPU memory for shader use.
  THUS:
		I don't see any easy way to use the exact same object constructors and
		prototypes for all VBObox objects.  Every additional VBObox objects may vary
		substantially, so I recommend that you copy and re-name an existing VBObox
		prototype object, and modify as needed, as shown here.
		(e.g. to make the VBObox3 object, copy the VBObox2 constructor and
		all its prototype functions, then modify their contents for VBObox3
		activities.)

*/
// Written for EECS 351-2,	Intermediate Computer Graphics,
//							Northwestern Univ. EECS Dept., Jack Tumblin
// 2016.05.26 J. Tumblin-- Created; tested on 'TwoVBOs.html' starter code.
// 2017.02.20 J. Tumblin-- updated for EECS 351-1 use for Project C.
// 2018.04.11 J. Tumblin-- minor corrections/renaming for particle systems.
//    --11e: global 'gl' replaced redundant 'myGL' fcn args;
//    --12: added 'SwitchToMe()' fcn to simplify 'init()' function and to fix
//      weird subtle errors that sometimes appear when we alternate 'adjust()'
//      and 'draw()' functions of different VBObox objects. CAUSE: found that
//      only the 'draw()' function (and not the 'adjust()' function) made a full
//      changeover from one VBObox to another; thus calls to 'adjust()' for one
//      VBObox could corrupt GPU contents for another.
//      --Created vboStride, vboOffset members to centralize VBO layout in the
//      constructor function.
//    -- 13 (abandoned) tried to make a 'core' or 'resuable' VBObox object to
//      which we would add on new properties for shaders, uniforms, etc., but
//      I decided there was too little 'common' code that wasn't customized.
//    --14: improved animation timing; moved all literals to the constructor;
//=============================================================================


//=============================================================================
//=============================================================================
function VBObox1() { // (JUST ONE instance: as 'rayView' var
                      // that shows ray-traced image-on-screen as a texture map
//=============================================================================
//=============================================================================
// CONSTRUCTOR for one re-usable 'VBObox1' object that holds all data and fcns
// needed to render vertices from one Vertex Buffer Object (VBO) using one
// separate shader program (a vertex-shader & fragment-shader pair) and one
// set of 'uniform' variables.

// Constructor goal:
// Create and set member vars that will ELIMINATE ALL LITERALS (numerical values
// written into code) in all other VBObox functions. Keeping all these (initial)
// values here, in this one coonstrutor function, ensures we can change them
// easily WITHOUT disrupting any other code, ever!

	this.VERT_SRC =	//--------------------- VERTEX SHADER source code
  'attribute vec4 a_Position;\n' +
  'attribute vec2 a_TexCoord;\n' +
  'varying vec2 v_TexCoord;\n' +
  //
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  v_TexCoord = a_TexCoord;\n' +
  '}\n';

	this.FRAG_SRC = //---------------------- FRAGMENT SHADER source code
  'precision mediump float;\n' +							// set default precision
  //
  'uniform sampler2D u_Sampler;\n' +
  'varying vec2 v_TexCoord;\n' +
  //
  'void main() {\n' +
  '  gl_FragColor = texture2D(u_Sampler, v_TexCoord);\n' +
  '}\n';

	this.vboContents = //---------------------
	new Float32Array ([					// Array of vertex attribute values we will
                              // transfer to GPU's vertex buffer object (VBO);
    // Quad vertex coordinates(x,y in CVV); texture coordinates tx,ty
    -1.00,  1.00,   	0.0, 1.0,			// upper left corner  (borderless)
    -1.00, -1.00,   	0.0, 0.0,			// lower left corner,
     1.00,  1.00,   	1.0, 1.0,			// upper right corner,
     1.00, -1.00,   	1.0, 0.0,			// lower left corner.
		 ]);

	this.vboVerts = 4;							// # of vertices held in 'vboContents' array;
	this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;
	                              // bytes req'd by 1 vboContents array element;
																// (why? used to compute stride and offset
																// in bytes for vertexAttribPointer() calls)
  this.vboBytes = this.vboContents.length * this.FSIZE;
                                // (#  of floats in vboContents array) *
                                // (# of bytes/float).
	this.vboStride = this.vboBytes / this.vboVerts;
	                              // (== # of bytes to store one complete vertex).
	                              // From any attrib in a given vertex in the VBO,
	                              // move forward by 'vboStride' bytes to arrive
	                              // at the same attrib for the next vertex.

	            //----------------------Attribute sizes
  this.vboFcount_a_Position = 2;  // # of floats in the VBO needed to store the
                                  // attribute named a_Pos1. (2: x,y values)
  this.vboFcount_a_TexCoord = 2;  // # of floats for this attrib (r,g,b values)
  console.assert((this.vboFcount_a_Position +     // check the size of each and
                  this.vboFcount_a_TexCoord) *   // every attribute in our VBO
                  this.FSIZE == this.vboStride, // for agreeement with'stride'
                  "Uh oh! VBObox1.vboStride disagrees with attribute-size values!");

              //----------------------Attribute offsets
	this.vboOffset_a_Position = 0;  //# of bytes from START of vbo to the START
	                                // of 1st a_Position attrib value in vboContents[]
  this.vboOffset_a_TexCoord = (this.vboFcount_a_Position) * this.FSIZE;
                                // == 2 floats * bytes/float
                                //# of bytes from START of vbo to the START
                                // of 1st a_TexCoord attrib value in vboContents[]

	            //-----------------------GPU memory locations:
	this.vboLoc;									// GPU Location for Vertex Buffer Object,
	                              // returned by gl.createBuffer() function call
	this.shaderLoc;								// GPU Location for compiled Shader-program
	                            	// set by compile/link of VERT_SRC and FRAG_SRC.
								          //------Attribute locations in our shaders:
	this.a_PositionLoc;				    // GPU location: shader 'a_Position' attribute
	this.a_TexCoordLoc;						// GPU location: shader 'a_TexCoord' attribute

	            //---------------------- Uniform locations &values in our shaders
/*	// Using glmatrix.js:   ***NOT NEEDED** for this VBObox;
	//						because it draws a texture-mapped image in the CVV.
	this.mvpMat = mat4.create();	    // Transforms CVV axes to model axes.
	this.u_mvpMatLoc;					// GPU location for u_mvpMat uniform
*/
  this.u_TextureLoc;            // GPU location for texture map (image)
  this.u_SamplerLoc;            // GPU location for texture sampler
};

VBObox1.prototype.init = function() {
//==============================================================================
// Prepare the GPU to use all vertices, GLSL shaders, attributes, & uniforms
// kept in this VBObox. (This function usually called only once, within main()).
// Specifically:
// a) Create, compile, link our GLSL vertex- and fragment-shaders to form an
//  executable 'program' stored and ready to use inside the GPU.
// b) create a new VBO object in GPU memory and fill it by transferring in all
//  the vertex data held in our Float32array member 'VBOcontents'.
// c) If shader uses texture-maps, create and load them and their samplers.
// d) Find & save the GPU location of all our shaders' attribute-variables and
//  uniform-variables (needed by switchToMe(), adjust(), draw(), reload(), etc.)
// -------------------
// CAREFUL!  before you can draw pictures using this VBObox contents,
//  you must call this VBObox object's switchToMe() function too!
//--------------------
// a) Compile,link,upload shaders-----------------------------------------------
	this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
	if (!this.shaderLoc) {
    console.log(this.constructor.name +
    						'.init() failed to create executable Shaders on the GPU. Bye!');
    return;
  }
// CUTE TRICK: let's print the NAME of this VBObox object: tells us which one!
//  else{console.log('You called: '+ this.constructor.name + '.init() fcn!');}

	gl.program = this.shaderLoc;		// (to match cuon-utils.js -- initShaders())

// b) Create VBO on GPU, fill it------------------------------------------------
	this.vboLoc = gl.createBuffer();
  if (!this.vboLoc) {
    console.log(this.constructor.name +
    						'.init() failed to create VBO in GPU. Bye!');
    return;
  }

  // Specify the purpose of our newly-created VBO on the GPU.  Your choices are:
  //	== "gl.ARRAY_BUFFER" : the VBO holds vertices, each made of attributes
  // (positions, colors, normals, etc), or
  //	== "gl.ELEMENT_ARRAY_BUFFER" : the VBO holds indices only; integer values
  // that each select one vertex from a vertex array stored in another VBO.
  gl.bindBuffer(gl.ARRAY_BUFFER,	      // GLenum 'target' for this GPU buffer
  								this.vboLoc);				  // the ID# the GPU uses for this buffer.

  // Fill the GPU's newly-created VBO object with the vertex data we stored in
  //  our 'vboContents' member (JavaScript Float32Array object).
  //  (Recall gl.bufferData() will evoke GPU's memory allocation & management:
  //	 use gl.bufferSubData() to modify VBO contents without changing VBO size)
  gl.bufferData(gl.ARRAY_BUFFER, 			  // GLenum target(same as 'bindBuffer()')
 					 				this.vboContents, 		// JavaScript Float32Array
  							 	gl.STATIC_DRAW);			// Usage hint.
  //	The 'hint' helps GPU allocate its shared memory for best speed & efficiency
  //	(see OpenGL ES specification for more info).  Your choices are:
  //		--STATIC_DRAW is for vertex buffers rendered many times, but whose
  //				contents rarely or never change.
  //		--DYNAMIC_DRAW is for vertex buffers rendered many times, but whose
  //				contents may change often as our program runs.
  //		--STREAM_DRAW is for vertex buffers that are rendered a small number of
  // 			times and then discarded; for rapidly supplied & consumed VBOs.

// c) Make/Load Texture Maps & Samplers:----------------------------------------
  this.u_TextureLoc = gl.createTexture(); // Create object in GPU memory to
                                          // to hold texture image.
  if (!this.u_TextureLoc) {
    console.log(this.constructor.name +
    						'.init() Failed to create the texture object on the GPU');
    return -1;	// error exit.
  }
  // Get the GPU location for the texture sampler assigned to us (as uniform)
  var u_SamplerLoc = gl.getUniformLocation(this.shaderLoc, 'u_Sampler');
  if (!u_SamplerLoc) {
    console.log(this.constructor.name +
    						'.init() Failed to find GPU location for texture u_Sampler');
    return -1;	// error exit.
  }

  // Fill our global floating-point image object 'g_myPic' with a test-pattern.
  g_myPic.setTestPattern(0);    // 0 == colorful 'L' shape. 1 == all orange.
  // the g_myPic.iBuf member is a uint8 array; data source for WebGL texture map

  // Enable texture unit0 for our use
  gl.activeTexture(gl.TEXTURE0);
  // Bind the texture object we made in initTextures() to the target
  gl.bindTexture(gl.TEXTURE_2D, this.u_TextureLoc);
  // allocate memory and load the texture image into the GPU
  gl.texImage2D(gl.TEXTURE_2D,    //  'target'--the use of this texture
  						0, 									//  MIP-map level (default: 0)
  						gl.RGB, 					  // GPU's data format (RGB? RGBA? etc)
              g_myPic.xSiz,         // texture image width in pixels
              g_myPic.ySiz,         // texture image height in pixels.
							0,									// byte offset to start of data
  						gl.RGB, 					  // source/input data format (RGB? RGBA?)
  						gl.UNSIGNED_BYTE,	  // data type for each color channel
              g_myPic.iBuf);        // 8-bit RGB image data source.
  // Set the WebGL texture-filtering parameters
  gl.texParameteri(gl.TEXTURE_2D,		// texture-sampling params:
  						     gl.TEXTURE_MIN_FILTER,
  						     gl.LINEAR);
  // Set the texture unit 0 to be driven by our texture sampler:
  gl.uniform1i(this.u_SamplerLoc, 0);

// d1) Find All Attributes:-----------------------------------------------------
//  Find & save the GPU location of all our shaders' attribute-variables and
//  uniform-variables (for switchToMe(), adjust(), draw(), reload(), etc.)
  this.a_PositionLoc = gl.getAttribLocation(this.shaderLoc, 'a_Position');
  if(this.a_PositionLoc < 0) {
    console.log(this.constructor.name +
    						'.init() Failed to get GPU location of attribute a_Position');
    return -1;	// error exit.
  }
 	this.a_TexCoordLoc = gl.getAttribLocation(this.shaderLoc, 'a_TexCoord');
  if(this.a_TexCoordLoc < 0) {
    console.log(this.constructor.name +
    						'.init() failed to get the GPU location of attribute a_TexCoord');
    return -1;	// error exit.
  }
  // d2) Find All Uniforms:-----------------------------------------------------
  //Get GPU storage location for each uniform var used in our shader programs:
/* NONE yet...
 this.u_ModelMatrixLoc = gl.getUniformLocation(this.shaderLoc, 'u_ModelMatrix');
  if (!this.u_ModelMatrixLoc) {
    console.log(this.constructor.name +
    						'.init() failed to get GPU location for u_ModelMatrix uniform');
    return;
  }
*/
}

VBObox1.prototype.switchToMe = function () {
//==============================================================================
// Set GPU to use this VBObox's contents (VBO, shader, attributes, uniforms...)
//
// We only do this AFTER we called the init() function, which does the one-time-
// only setup tasks to put our VBObox contents into GPU memory.  !SURPRISE!
// even then, you are STILL not ready to draw our VBObox's contents onscreen!
// We must also first complete these steps:
//  a) tell the GPU to use our VBObox's shader program (already in GPU memory),
//  b) tell the GPU to use our VBObox's VBO  (already in GPU memory),
//  c) tell the GPU to connect the shader program's attributes to that VBO.

// a) select our shader program:
  gl.useProgram(this.shaderLoc);
//		Each call to useProgram() selects a shader program from the GPU memory,
// but that's all -- it does nothing else!  Any previously used shader program's
// connections to attributes and uniforms are now invalid, and thus we must now
// establish new connections between our shader program's attributes and the VBO
// we wish to use.

// b) call bindBuffer to disconnect the GPU from its currently-bound VBO and
//  instead connect to our own already-created-&-filled VBO.  This new VBO can
//    supply values to use as attributes in our newly-selected shader program:
	gl.bindBuffer(gl.ARRAY_BUFFER,	    // GLenum 'target' for this GPU buffer
										this.vboLoc);			// the ID# the GPU uses for our VBO.

// c) connect our newly-bound VBO to supply attribute variable values for each
// vertex to our SIMD shader program, using 'vertexAttribPointer()' function.
// this sets up data paths from VBO to our shader units:
  // 	Here's how to use the almost-identical OpenGL version of this function:
	//		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml )
  gl.vertexAttribPointer(
		this.a_PositionLoc,//index == ID# for the attribute var in GLSL shader pgm;
		this.vboFcount_a_Position, // # of floats used by this attribute: 1,2,3 or 4?
		gl.FLOAT,		  // type == what data type did we use for those numbers?
		false,				// isNormalized == are these fixed-point values that we need
									//									normalize before use? true or false
		this.vboStride,// Stride == #bytes we must skip in the VBO to move from the
		              // stored attrib for this vertex to the same stored attrib
		              //  for the next vertex in our VBO.  This is usually the
									// number of bytes used to store one complete vertex.  If set
									// to zero, the GPU gets attribute values sequentially from
									// VBO, starting at 'Offset'.
									// (Our vertex size in bytes: 4 floats for pos + 3 for color)
		this.vboOffset_a_Position);
		              // Offset == how many bytes from START of buffer to the first
  								// value we will actually use?  (we start with position).
  gl.vertexAttribPointer(this.a_TexCoordLoc, this.vboFcount_a_TexCoord,
                         gl.FLOAT, false,
  						           this.vboStride,  this.vboOffset_a_TexCoord);
  //-- Enable this assignment of the attribute to its' VBO source:
  gl.enableVertexAttribArray(this.a_PositionLoc);
  gl.enableVertexAttribArray(this.a_TexCoordLoc);
}

VBObox1.prototype.isReady = function() {
//==============================================================================
// Returns 'true' if our WebGL rendering context ('gl') is ready to render using
// this objects VBO and shader program; else return false.
// see: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter

var isOK = true;

  if(gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc)  {
    console.log(this.constructor.name +
    						'.isReady() false: shader program at this.shaderLoc not in use!');
    isOK = false;
  }
  if(gl.getParameter(gl.ARRAY_BUFFER_BINDING) != this.vboLoc) {
      console.log(this.constructor.name +
  						'.isReady() false: vbo at this.vboLoc not in use!');
    isOK = false;
  }
  return isOK;
}

VBObox1.prototype.adjust = function() {
//==============================================================================
// Update the GPU to newer, current values we now store for 'uniform' vars on
// the GPU; and (if needed) update each attribute's stride and offset in VBO.

  // check: was WebGL context set to use our VBO & shader program?
  if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name +
  						'.adjust() call you needed to call this.switchToMe()!!');
  }
/* NONE!
	// Adjust values for our uniforms,
  this.ModelMatrix.setRotate(g_angleNow1, 0, 0, 1);	// -spin drawing axes,
  this.ModelMatrix.translate(0.35, -0.15, 0);						// then translate them.
  //  Transfer new uniforms' values to the GPU:-------------
  // Send  new 'ModelMat' values to the GPU's 'u_ModelMat1' uniform:
  gl.uniformMatrix4fv(this.u_ModelMatrixLoc,	// GPU location of the uniform
  										false, 										// use matrix transpose instead?
  										this.ModelMatrix.elements);	// send data from Javascript.
*/
}

VBObox1.prototype.draw = function() {
//=============================================================================
// Send commands to GPU to select and render current VBObox contents.

  // check: was WebGL context set to use our VBO & shader program?
  if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name +
  						'.draw() call you needed to call this.switchToMe()!!');
  }

  // ----------------------------Draw the contents of the currently-bound VBO:
  gl.drawArrays(gl.TRIANGLE_STRIP, // select the drawing primitive to draw:
                  // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP,
                  //          gl.TRIANGLES, gl.TRIANGLE_STRIP,
  							0, 								// location of 1st vertex to draw;
  							this.vboVerts);		// number of vertices to draw on-screen.
}


VBObox1.prototype.reload = function() {
//=============================================================================
// Over-write current values in the GPU for our already-created VBO: use
// gl.bufferSubData() call to re-transfer some or all of our Float32Array
// contents to our VBO without changing any GPU memory allocations.

  // check: was WebGL context set to use our VBO & shader program?
  if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name +
  						'.reload() call you needed to call this.switchToMe()!!');
  }

 gl.bufferSubData(gl.ARRAY_BUFFER, 	// GLenum target(same as 'bindBuffer()')
                  0,                  // byte offset to where data replacement
                                      // begins in the VBO.
 					 				this.vboContents);   // the JS source-data array used to fill VBO

// Modify/update the contents of the texture map(s) stored in the GPU;
// Copy current contents of CImgBuf object 'g_myPic'  (see initTextures() above)
// into the existing texture-map object stored in the GPU:

  gl.texSubImage2D(gl.TEXTURE_2D, 	//  'target'--the use of this texture
  							0, 							//  MIP-map level (default: 0)
  							0,0,						// xoffset, yoffset (shifts the image)
								g_myPic.xSiz,			// image width in pixels,
								g_myPic.ySiz,			// image height in pixels,
  							gl.RGB, 				// source/input data format (RGB? RGBA?)
  							gl.UNSIGNED_BYTE, 	// data type for each color channel
								g_myPic.iBuf);	  // texture-image data source.
}


/*
VBObox1.prototype.empty = function() {
//=============================================================================
// Remove/release all GPU resources used by this VBObox object, including any
// shader programs, attributes, uniforms, textures, samplers or other claims on
// GPU memory.  However, make sure this step is reversible by a call to
// 'restoreMe()': be sure to retain all our Float32Array data, all values for
// uniforms, all stride and offset values, etc.
//
//
// 		********   YOU WRITE THIS! ********
//
//
//
}

VBObox1.prototype.restore = function() {
//=============================================================================
// Replace/restore all GPU resources used by this VBObox object, including any
// shader programs, attributes, uniforms, textures, samplers or other claims on
// GPU memory.  Use our retained Float32Array data, all values for  uniforms,
// all stride and offset values, etc.
//
//
// 		********   YOU WRITE THIS! ********
//
//
//
}
*/

//=============================================================================
//=============================================================================
//=============================================================================
