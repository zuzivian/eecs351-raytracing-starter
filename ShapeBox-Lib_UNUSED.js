// 5/23/2018 J. Tumblin:
// GOOD IDEA; TOO AMBITIOUS FOR NOW:
//  IMPLEMENTATION PROBLEMS

//------------------------------------------------------------------------------
// All the valid values for ShapeBox.shapeType method.
// NICE TRICK; as all 'shapeType' values <0  are treated as 'SHAPE_EMPTY', you
// can disable a shapeBox object by simply changing sign of shapetype.
const SHAPE_EMPTY     =  0; // also 'empty' for any negative values of this.shapeTYpe

const SHAPE_AXES_XYZ  =  1; // x,y,z axes; unit-length: red,grn,blue==+x,+y,+z

const SHAPE_GNDPLANE  =  2; // x,y ground-plane grid

const SHAPE_TETRA     =  3; // tetrahedron at origin: all edge lengths=1
const SHAPE_PYRA3     =  4; // 3-sided pyramid (all edge lengths=1; base in xy plane, tip on +z axis)
const SHAPE_PYRA4     =  5; // 4-sided ("   "   " ...
const SHAPE_PYRA5     =  6; // 5-sided ("   "   " ...
const SHAPE_PYRA6     =  7; // 6-sided ("   "   " ...
const SHAPE_DIAMOND3  =  8; // 3-sided diamond (3-sided pyramid above & below the xy plane)
const SHAPE_DIAMOND4  =  9; // 4-sided ("   "   " ...
const SHAPE_DIAMOND5  = 10; // 5-sided ("   "   " ...
const SHAPE_DIAMOND6  = 11; // 6-sided ("   "   " ...
const SHAPE_PRISM3    = 12; // 3-sided prism (all edge lengths=1; base in x,y plane, top at z=1 plane)
const SHAPE_PRISM4    = 13; // 4-sided ("   "   " ...
const SHAPE_PRISM5    = 14; // 5-sided ("   "   " ...
const SHAPE_PRISM6    = 15; // 6-sided ("   "   " ...

const SHAPE_CUBE      = 16; // unit cube (vertex coords are all +/-1)
const SHAPE_SPHERE    = 17; // unit phere (centered at origin; radius==1)
const SHAPE_CYL       = 18; // cylinder/cone: (base radius=1 in xy plane; top at
                            // at z=+1, user-specified top radius (==0 for cone)
const SHAPE_TORUS     = 19; // torus (internal 'ring' axis in x,y plane; 'ring' radius 2, +/-1 in Z.
const SHAPE_FILE      = 20; // reads in a .obj or .stl-format shape-describing file
const SHAPE_USR0      = 21; //
const SHAPE_USR1      = 22; // new shape somehow specified by the user
const SHAPE_USR2      = 23; //
const SHAPE_MAX       = 24; // total # of possible shape-types.
//------------------------------------------------------------------------------


//=============================================================================
//=============================================================================
function ShapeBox() {
//=============================================================================
//=============================================================================
// CONSTRUCTOR for 'ShapeBox' object that builds one fixed 3D shape or 'part' as
// one single array of vertices.  It can then append this set of vertices to
// the existing array of vertices kept in a VBObox object.
//
// Within this 'ShapeBox' object:
//    --'vertSet' member (a Float32Array) holds all vertices of the part,
//    --'vertCount' member specifies the number of vertices in 'vertSet',
//    --'floatsPerVertex' member specifies how many Float32Array elements req'd
//      to store one vertex (NOTE: VBO 'stride' is FSIZE*floatPerVertex)
//    --'shapeType' member specifies the intended 3D geometric shape, and its
//        value is chosen from list of 'const' variables given above, such as
//        SHAPE_GNDPLANE, SHAPE_CUBE, SHAPE_SPHERE, etc.
//    --'drawingType' member specifies the intended WebGL drawing primitive used
//        to render it (e.g. gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP,
//        gl.TRIANGLES, gl.TRIANGLE_STRIP). Note that a set of vertices suitable
//        for one drawing primitive often won't be suitable for another; for
//        example, a set of vertices for drawing a cube with gl.LINES usually
//        won't draw a proper solid cube with gl.LINE_LOOP or gl.TRIANGLES.
// Individual member functions create the vertices & set various parameters,
//  e.g. makeGroundGrid(), makeSphere(), makeCube(), etc.
//
// ASIDE:-----------------------------------------------------------------------
// WHY do we offer only simple, centered, fixed 'Canonical' Shapes?
// Why doesn't ShapeBox provide varying sizes, positions, angles, etc.?
// As with any 'parts' made for WebGL rendering, we will almost never need to
// modify the set of vertices that define a 'part'. Instead, we will use 3D
// transformations done by the GPU to adjust the  part's position, orientation,
// size, or aspect ratio (e.g. to 'squash' or 'stretch' it in any direction)
// just before we draw it on-screen.  These transformations let us keep just a
// few 'parts' on the GPU in a 'vertex buffer object' (VBO), and draw them with
// different transformations to create moving, jointed objects and assemble a
// complex 3D scene.
// Easy part transformations let us store them as simple, 'canonical' forms. The
// part stored in one ShapeBox object kept at (or near) the origin, aligned with
// x,y,z axes, and uses simple part sizes such as +/-1 for edge-lengths. We can
// always use transformations later to re-position, re-orient, and re-size
// the part in any way we wish before we draw it on-screen.
// -----------------------------------------------------------------------------
  this.shapeType = SHAPE_EMPTY;
  this.vertCount = 0;

}

ShapeBox.prototype.makeGroundGrid = function() {
//==============================================================================
// Create a set of vertices for an x,y grid of colored lines in the z=0 plane
// centered at x=y=z=0, and store them in vertSet[].
// NOTE: use gl.drawArrays(gl.GL_LINES,,) to draw these vertices.

  //Set # of lines in grid--------------------------------------
	this.xyMax	= 50.0;			// grid size; extends to cover +/-xyMax in x and y.
	this.xCount = 101;			// # of lines of constant-x to draw to make the grid
	this.yCount = 101;		  // # of lines of constant-y to draw to make the grid
	                        // xCount, yCount MUST be >1, and should be odd.
	                        // (why odd#? so that we get lines on the x,y axis)
	//Set # vertices per line-------------------------------------
	// You may wish to break up each line into separate line-segments.
	// Here I've split each line into 4 segments; two above, two below the axis.
	// (why? as of 5/2018, Chrome browser sometimes fails to draw lines whose
	// endpoints are well outside of the view frustum (Firefox works OK, though).
  var vertsPerLine =8;      // # vertices stored in vertSet[] for each line;

	//Set vertex contents:----------------------------------------
	this.floatsPerVertex = 8;  // x,y,z,w;  r,g,b,a values.

  //Create (local) vertSet[] array-----------------------------
  var vertCount = (this.xCount + this.yCount) * vertsPerLine;
  var vertSet = new Float32Array(vertCount * this.floatsPerVertex);
      // This array will hold (xCount+yCount) lines, kept as
      // (xCount+yCount)*vertsPerLine vertices, kept as
      // (xCount+yCount)*vertsPerLine*floatsPerVertex array elements (floats).

	// Set Vertex Colors--------------------------------------
  // Each line's color is constant, but set by the line's position in the grid.
  //  For lines of constant-x, the smallest (or most-negative) x-valued line
  //    gets color xBgnColr; the greatest x-valued line gets xEndColr,
  //  Similarly, constant-y lines get yBgnColr for smallest, yEndColr largest y.
 	this.xBgnColr = vec4.fromValues(1.0, 0.0, 0.0, 1.0);	  // Red
 	this.xEndColr = vec4.fromValues(0.0, 1.0, 1.0, 1.0);    // Cyan
 	this.yBgnColr = vec4.fromValues(0.0, 1.0, 0.0, 1.0);	  // Green
 	this.yEndColr = vec4.fromValues(1.0, 0.0, 1.0, 1.0);    // Magenta

  // Compute how much the color changes between 1 line and the next:
  var xColrStep = vec4.create();  // [0,0,0,0]
  var yColrStep = vec4.create();
  vec4.subtract(xColrStep, this.xEndColr, this.xBgnColr); // End - Bgn
  vec4.subtract(yColrStep, this.yEndColr, this.yBgnColr);
  vec4.scale(xColrStep, xColrStep, 1.0/(this.xCount -1)); // scale by # of lines
  vec4.scale(yColrStep, yColrStep, 1.0/(this.yCount -1));

  // Local vars for vertex-making loops-------------------
	var xgap = 2*this.xyMax/(this.xCount-1);		// Spacing between lines in x,y;
	var ygap = 2*this.xyMax/(this.yCount-1);		// (why 2*xyMax? grid spans +/- xyMax).
  var xNow;           // x-value of the current line we're drawing
  var yNow;           // y-value of the current line we're drawing.
  var line = 0;       // line-number (we will draw xCount or yCount lines, each
                      // made of vertsPerLine vertices),
  var v = 0;          // vertex-counter, used for the entire grid;
  var idx = 0;        // vertSet[] array index.
  var colrNow = vec4.create();   // color of the current line we're drawing.

  //----------------------------------------------------------------------------
  // 1st BIG LOOP: makes all lines of constant-x
  for(line=0; line<this.xCount; line++) {   // for every line of constant x,
    colrNow = vec4.scaleAndAdd(             // find the color of this line,
              colrNow, this.xBgnColr, xColrStep, line);
    xNow = -this.xyMax + (line*xgap);       // find the x-value of this line,
    for(i=0; i<vertsPerLine; i++, v++, idx += this.floatsPerVertex)
    { // for every vertex in this line,  find x,y,z,w;  r,g,b,a;
      // and store them sequentially in vertSet[] array.
      // We already know  xNow; find yNow:
      switch(i) { // find y coord value for each vertex in this line:
        case 0: yNow = -this.xyMax;   break;  // start of 1st line-segment;
        case 1:                               // end of 1st line-segment, and
        case 2: yNow = -this.xyMax/2; break;  // start of 2nd line-segment;
        case 3:                               // end of 2nd line-segment, and
        case 4: yNow = 0.0;           break;  // start of 3rd line-segment;
        case 5:                               // end of 3rd line-segment, and
        case 6: yNow = this.xyMax/2;  break;  // start of 4th line-segment;
        case 7: yNow = this.xyMax;    break;  // end of 4th line-segment.
        default:
          console.log("VBObox0.appendGroundGrid() !ERROR! **X** line out-of-bounds!!\n\n");
        break;
      } // set all values for this vertex:
      vertSet[idx  ] = xNow;            // x value
      vertSet[idx+1] = yNow;            // y value
      vertSet[idx+2] = 0.0;             // z value
      vertSet[idx+3] = 1.0;             // w;
      vertSet[idx+4] = colrNow[0];  // r
      vertSet[idx+5] = colrNow[1];  // g
      vertSet[idx+6] = colrNow[2];  // b
      vertSet[idx+7] = colrNow[3];  // a;
    }
  }
  //----------------------------------------------------------------------------
  // 2nd BIG LOOP: makes all lines of constant-y
  for(line=0; line<this.yCount; line++) {   // for every line of constant y,
    colrNow = vec4.scaleAndAdd(             // find the color of this line,
              colrNow, this.yBgnColr, yColrStep, line);
    yNow = -this.xyMax + (line*ygap);       // find the y-value of this line,
    for(i=0; i<vertsPerLine; i++, v++, idx += this.floatsPerVertex)
    { // for every vertex in this line,  find x,y,z,w;  r,g,b,a;
      // and store them sequentially in vertSet[] array.
      // We already know  yNow; find xNow:
      switch(i) { // find y coord value for each vertex in this line:
        case 0: xNow = -this.xyMax;   break;  // start of 1st line-segment;
        case 1:                               // end of 1st line-segment, and
        case 2: xNow = -this.xyMax/2; break;  // start of 2nd line-segment;
        case 3:                               // end of 2nd line-segment, and
        case 4: xNow = 0.0;           break;  // start of 3rd line-segment;
        case 5:                               // end of 3rd line-segment, and
        case 6: xNow = this.xyMax/2;  break;  // start of 4th line-segment;
        case 7: xNow = this.xyMax;    break;  // end of 4th line-segment.
        default:
          console.log("VBObox0.appendGroundGrid() !ERROR! **Y** line out-of-bounds!!\n\n");
        break;
      } // Set all values for this vertex:
      vertSet[idx  ] = xNow;            // x value
      vertSet[idx+1] = yNow;            // y value
      vertSet[idx+2] = 0.0;             // z value
      vertSet[idx+3] = 1.0;             // w;
      vertSet[idx+4] = colrNow[0];  // r
      vertSet[idx+5] = colrNow[1];  // g
      vertSet[idx+6] = colrNow[2];  // b
      vertSet[idx+7] = colrNow[3];  // a;
    }
  }

}
ShapeBox.prototype.appendShape = function(vboBox) {
//==============================================================================
// Append the contents of vertSet[] to existing contents of a given VBObox
// object; update its vboVerts to include these new verts for drawing.

  // Make a new array (local) big enough to hold BOTH vboContents & vertSet:
var tmp = new Float32Array(vboBox.vboContents.length + this.vertSet.length);
  tmp.set(vboBox.vboContents, 0);     // copy old VBOcontents into tmp, and
  tmp.set(this.vertSet, vboBox.vboContents.length); // copy new vertSet just after it.
  vboBox.vboVerts += vertCount;       // find number of verts in both.
  vboBox.vboContents = tmp;           // REPLACE old vboContents with tmp
}


/*=================
 HOW I WAS USING ShapeBox before:


VBObox0.prototype.addShape = function(shapeBoxSrc) {
//==============================================================================
// The ShapeBox object 'ShapeBoxSrc' holds an array of vertices (Float32Array)
// that describes one canonical shape. Append that array of vertices to our
// vboContents[] array, update the vertex count & other VBObox members/methods.
  if(shapeBoxSrc.VertCount==0) {
    console.log("VBObox0.addShape() given zero-sized ShapeBox argument!");
    }
}


 VBObox0.prototype.init = function() {
//==============================================================================
// Prepare the GPU to use all vertices, GLSL shaders, attributes, & uniforms
// kept in this VBObox. (This function usually called only once, within main()).
// Specifically:
// a) UPDATE the vboContents[] to add in more shapes, using ShapeBox.
// b) Create, compile, link our GLSL vertex- and fragment-shaders to form an
//  executable 'program' stored and ready to use inside the GPU.
// c) create a new VBO object in GPU memory and fill it by transferring in all
//  the vertex data held in our Float32array member 'VBOcontents'.
// d) If shader uses texture-maps, create and load them and their samplers,
// e) Find & save the GPU location of all our shaders' attribute-variables and
//  uniform-variables (needed by switchToMe(), adjust(), draw(), reload(), etc.)
// -------------------
// CAREFUL!  before you can draw pictures using this VBObox contents,
//  be sure to call this VBObox object's switchToMe() function too!
//--------------------

//a) Create & use 'ShapeBox' objects--------------------------------------------

  this.gridPart = new ShapeBox();     // Holds our ground-plane grid (gl.LINES)
//  this.cubePart = new ShapeBox();     // Holds our cube (gl.TRIANGLES)
//  this.ballPart = new ShapeBox();     // Holds our sphere (gl.TRIANGLE_STRIP)
  //  Create the vertices for these shapes:
  this.gridPart.makeGroundGrid();
//  this.cubePart.makeCube();
//  this.ballPart.makeSphere();
  // Append them to our vboContents;
  this.addShape(gridPart);    // append this ground-grid to our vboContents.
//  addShape(cubePart);
//  addShape(ballPart);

// b) Compile,link,upload shaders-----------------------------------------------
	this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
	if (!this.shaderLoc) {
    console.log(this.constructor.name +
    						'.init() failed to create executable Shaders on the GPU. Bye!');
    return;
  }
....

*/
