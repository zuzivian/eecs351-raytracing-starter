//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings,
//  lets me see EXACTLY what the editor's 'line-wrap' feature will do.)

//===  TraceSupplement.js  ===================================================
// The object prototypes below (and their comments) are suitable for any and 
// all features described in the Ray-Tracing Project Assignment Sheet.
//
// HOWEVER, they're not required, nor even particularly good:
//				(notably awkward style from their obvious C/C++ origins) 
// They're here to help you get 'started' on better code of your own,
// and to help you avoid common structural 'traps' in writing ray-tracers
//		that might otherwise force ugly/messy refactoring later, such as:
//  --lack of a well-polished vector/matrix library; e.g. open-src glmatrix.js
//  --lack of floating-point RGB values to compute light transport accurately,
//	--no distinct 'camera' and 'image' objects or 'trace' and 'display' funcs 
// 		separate slow ray-tracing steps from fast screen display and refresh.
//	--lack of ray-trace image-buffer (window re-sizing discards your work!) 
//  --lack of texture-mapped image display; permit ray-traced image of any 
//		resolution to display on any screen at any desired image size
//  --the need to describe geometry/shape independently from surface materials,
//		and to select material(s) for each shape from a list of materials;
//  --materials that permit procedural 3D textures, turbulence & Perlin Noise,  
//	--objects for independent light sources, ones that can inherit their 
//    location(s) from a geometric shape (e.g. a light-bulb shape).
//  --need to create a sortable LIST of ray/object hit-points, and not just
//		the intersection nearest to the eyepoint, to enable shape-creation by
//		Constructive Solid Geometry (CSG), and to streamline transparency effects
//  --functions organized well to permit easy recursive ray-tracing:  don't 
//		tangle together ray/object intersection-finding tasks with shading, 
//		lighting, and materials-describing tasks.(e.g. traceRay(), findShade() )
//	--ability to easily match openGL/WebGL functions with ray-tracing results, 
//		using identically-matching ray-tracing functions for cameras, views, 
//		transformations, lighting, and materials (e.g. rayFrustum(), rayLookAt(); 
//		rayTranlate(), rayRotate(), rayScale()...)
//  --a straightforward method to implement scene graphs & jointed objects. 
//		Do it by transforming world-space rays to model coordinates, rather than 
//		models to world coords, using a 4x4 world2model matrix stored in each 
//		model (each CGeom primitive).  Set it by OpenGL-like functions 
//		rayTranslate(), rayRotate(), rayScale(), etc.

/*
-----------ORGANIZATION:-----------
I recommend that you use just two global top-level objects (put above main() )
  g_myPic == new CImgBuf():
    your 'image buffer' object to hold a floating-point ray-traced image.
	g_myScene = new CScene(g_myPic);
	  your ray-tracer that computes an image that fills the g_myPic CImgBuf object. 
		
One CScene object contains all parts of our ray-tracer: 
  its camera (CCamera) object, 
  its collection of 3D shapes (CGeom in geomList array) 
  its collection of light sources (CLight objects in lightList array),
  its collection of materials (CMatl objects in  matlList array), and more.  
When users press the 'T' or 't' key (see GUIbox method gui.keyDown() ), 
  the program starts ray-tracing:
  it calls the CScene method 'MakeRayTracedImage()'. This top-level function 
  fills each pixel of a CImgBuf object (e.g g_myPic) given as its fcn argument. 
The 'makeRayRacedImage() function orchestrates creation and recursive tracing 
  of millions of rays to find the on-screen color of each pixel in the given 
  CImgBuf object (g_myPic).
  The CScene object also contains & uses:
		--CRay	== a 3D ray object in an unspecified coord. system (usually 'world').
		--CCamera == ray-tracing camera object defined the 'world' coordinate system.
		--CGeom	== a 3D geometric shape object for ray-tracing (implicit function).
		--CHit == an object that describes how 1 ray pierced the surface of 1 shape; 
		--CHitList == Array of all CHit objects for 1 ray traced thru entire CScene. 
*/

//----------------------------------------------------------------------------
// NOTE: JavaScript has no 'class-defining' statements or declarations: instead
// we simply create a new object type by defining its constructor function, and
// add member methods/functions using JavaScript's 'prototype' feature.
// SEE: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/prototype 
//----------------------------------------------------------------------------

function CRay() {
//=============================================================================
// Object for a ray in an unspecified coord. system (usually 'world' coords).
	this.orig = vec4.fromValues(0,0,0,1);			// Ray starting point (x,y,z,w)
																						// (default: at origin
	this.dir = 	vec4.fromValues(0,0,-1,0);			// The ray's direction vector 
																						// (default: look down -z axis)
}

CRay.prototype.printMe = function() {
//=============================================================================
// print ray's values in the console window:
	if(name == undefined) name = ' ';

	console.log('CRay::' + this.constructor.name + '.origin:\t' + this.orig[0] 
	+',\t'+ this.orig[1] +',\t'+ this.orig[2] +',\t'+ this.orig[3]);
	console.log('     ', + this.constructor.name + '.direction:\t' + this.dir[0] 
	+',\t'+  this.dir[1] + '\t'+  this.dir[2] +',\t'+ this.dir[3]);
}

//=============================================================================
// HOW DO WE CONSTRUCT A RAY-TRACING CAMERA?
//=============================================================================
/* We always specify a perspective camera for ray-tracing in the 'world' 
coordinate system by giving its 'intrinsic' parameters:
                          (the camera's lens-like, internal parameters) 
    iLeft,iRight,iTop,iBot; iNear; // for view frustum;
    xmax,ymax; 				 // number of output image pixels; horiz,vert
		xSampMax,ySampMax; // antialiasing: # of samples/rays per pixel.

 and by giving its 'extrinsic' parameters:
                          (the camera's position and orientation in the world)
                                world-space 'camera-positioning' parameters:
    eyePt, AimPt,UpVec      // Eye Point( the 3D center-of-projection)
				 									 // look-at point; cam's world-space aiming point,
													 // View Up Vector, in +y direction on on-screen
OVERVIEW:
From the 'extrinsic' parameters we compute a 'camera coordinate system' that 
consists of an origin (the eyePoint) and 3 orthonormal vectors U,V,N. From this
coordinate system we use the intrinsic parameters to compute rays for each and
every pixel of the image the camera makes.
HOW?  let's take it step by step:

1)    Users position and aim the camera by specifying two points and one vector 
in world-space.  The 'EyePt' sets camera position; the 'AimPt' point sets the 
cameras' direction-of-gaze, and the 'view up' vector (vup) specifies a 
world-space direction that will appear vertical in the camera image.
  -- a) From (eyePt,aimPt,UpVec), compute the right-handed 3D camera coord. 
 system consisting of its origin point and its 3 computed orthonormal vectors 
 U,V,N (in our first camera, these are just a world-space renaming of the 
 eye-space x,y,z vector directions).
 The coord. system's origin point is == EyePt, and we describe the coordinate
 axes by the unit-length world-space vectors U,V,N. To compute these vectors,
 use N = ||EyePt-AimPt||, U= vup cross N; V= N cross U.  We can then easily
 convert a 3D point from camera coords (u,v,n) to world-space coords (x,y,z):
 we start at the camera's origin (EyePt), add U,V,N axis vectors weighted by
 the point's u,v,n coords: by the coords (x,y,z) = EyePt + U*u + V*v + N*n.

2)   Users set the camera's internal parameters by choosing 6 numbers in the
the camera coordinate system. The camera 'EyePt' or 'center of projection' is 
the origin: (u,v,n)=0,0,0; the camera viewing direction is the -N axis, and the 
U,V axes set the camera image's vertical and horizontal directions (x,y). We 
specify the image in the camera's n=-iNear plane for the view from the origin 
through the 'image rectangle' with these 4 user-spec'd corners:
  	          (iLeft, iTop,-iNear) (iRight, iTop, -iNear)
	            (iLeft, iBot,-iNear) (iRight, iBot, -iNear) in (u,v,n) coords.
 (EXAMPLE: If the user set iNear=1, iLeft=-1, iRight=+1, iTop=+1, iBot = -1, 
 then our image rectangle is a square, centered on the -N axis, and our 
 camera's field-of-view spans +/- 45 degrees horizontally and vertically.)

3)  Users specify resolution of this image rectangle in pixels (xmax,ymax), and
the pixels divide the image rectangle into xsize,ysize 'little squares'. Each
'little square' is a small portion of a continuous image, and we will use one
pixel to summarize the color of that image portion.
 --a) Be sure to choose well-matched image size (xsize,ysize) and pixel counts
 (xmax,ymax) so that each little square will have same width (ufrac) and height 
 (vfrac), where:
     ufrac = (iRight - iLeft)/xmax;  vfrac = (iTop - iBot)/ymax.
  NOTE: keep ratio ufrac/vfrac =1, because (most) display devices use this 
  same 1:1 ratio for horizontal/vertical resolution. With ufrac/vFrac==1 the 
  image won't appear stretched or squashed).
 --b) The little square at the lower-left corner of the image rectangle holds 
  the pixel (0,0), but recall that the pixel itself is NOT that little square! 
  Instead, the pixel **location** is a POINT AT THE SQUARE'S CENTER, and 
  the pixel **color** is a summary of the image color in the neighborhood around
  the pixel location  (and the 'little square' defines that neighborhood).
  Thus pixel (0,0) location in u,v,n coords is:
               (iLeft +    0.5*ufrac,  iBot +    0.5*vfrac, -1).
  Similarly, pixel(x,y) location in u,v,n is:
      uvnPix = (iLeft + (x+0.5)*ufrac, iBot + (y+0.5)*vfrac, -1).

4) With uvnPix, we can easily make the 'eye' ray in (u,v,n) coords at the (x,y)
 pixel; the ray origin is (0,0,0), and the ray direction vector is
        uvnPix - (0,0,0) = uvnPix. 
 --a) However, we need an eyeRay in world-space coords. To convert, replace the 
 ray origin with EyePt (already given world-space coords), and compute ray 
 direction as a coordinate-weighted sum of the unit-length U,V,N axis vectors; 
        eye.dir = uvnPix.u * U + uvnPix.v * V + uvnPix.n * N.
 --b) But look closely! this 'weighted sum' is just a matrix multiply!  We can
 instead write it as:
        cam2world * uvnPix,
 where U,V,N unit-length vectors form the columns of cam2world matrix!

5) finally, position and aim the camera:
 --a) To move the CCamera to any desired position in world space, 
      just translate eyePoint.
 --b) To rotate CCamera around its eyePt, just rotate the u,v,n axes 
      (pre-multiply cam2world matrix with a rotation matrix).
 --c) Later, you can replace this crude translate/rotate step by a function 
    that converts EyePt, AimPt and VUP vector into  U,V,N vectors.
*/

function CCamera() {
//=============================================================================
// Object for a ray-tracing camera defined the 'world' coordinate system, with
// a) -- 'extrinsic' parameters that set the camera's position and aiming
//	from the camera-defining UVN coordinate system 
// (coord. system origin at the eye-point; coord axes U,V define camera image 
// horizontal and vertical; camera gazes along the -N axis): 
// Default settings: put camera eye-point at world-space origin, and
	this.eyePt = vec4.fromValues(0,0,0,1);

  // LOOK STRAIGHT DOWN:
	this.uAxis = vec4.fromValues(1,0,0,0);	// camera U axis == world x axis			
  this.vAxis = vec4.fromValues(0,1,0,0);	// camera V axis == world y axis
  this.nAxis = vec4.fromValues(0,0,1,0);	// camera N axis == world z axis.
		  	// (and thus we're gazing down the -Z axis with default camera). 

  // LOOK AT THE HORIZON:
/*
	this.uAxis = vec4.fromValues(1,0,0,0);	// camera U axis == world x axis			
  this.vAxis = vec4.fromValues(0,0,1,0);	// camera V axis == world z axis
  this.nAxis = vec4.fromValues(0,-1,0,0);	// camera N axis == world -y axis.
*/

// b) -- Camera 'intrinsic' parameters that set the camera's optics and images.
// They define the camera's image frustum: its image plane is at N = -znear  
// (the plane that 'splits the universe', perpendicular to N axis), and no 
// 'zfar' plane at all (not needed: ray-tracer doesn't have or need the CVV).  
// The ray-tracing camera creates an rectangular image plane perpendicular to  
// the cam-coord. system N axis at -iNear(defined by N vector in world coords),
// 			horizontally	spanning 'iLeft' <= u <= 'iRight' along the U vector, and
//			vertically    spanning  'iBot' <= v <=  'iTop' along the V vector. 
// As the default camera creates an image plane at distance iNear = 1 from the 
// camera's center-of-projection (at the u,v,n origin), these +/-1 
// defaults define a square ray-traced image with a +/-45-degree field-of-view:
	this.iNear =  1.0;
	this.iLeft = -1.0;		
	this.iRight = 1.0;
	this.iBot =  -1.0;
	this.iTop =   1.0; 

// And the lower-left-most corner of the image is at (u,v,n) = (iLeft,iBot,-iNear).
	this.xmax = 256;			// horizontal,
	this.ymax = 256;			// vertical image resolution.
// To ray-trace an image of xmax,ymax pixels, divide this rectangular image 
// plane into xmax,ymax rectangular tiles, and shoot eye-rays from the camera's
// center-of-projection through those tiles to find scene color values.  
// --For the simplest, fastest image (without antialiasing), trace each eye-ray 
// through the CENTER of each tile to find pixel colors.  
// --For slower, better-looking, anti-aliased image making, apply jittered 
// super-sampling: For each pixel:
//			--subdivide the 'tile' into equal-sized 'sub-tiles';
//			--trace one ray per sub-tile, but randomize (jitter) the ray's position 
//					within the sub-tile,
//			--set pixel color to the average of all sub-tile colors. 
// Let's do that:

// Divide the image plane into rectangular tiles, one for each pixel:
	this.ufrac = (this.iRight - this.iLeft) / this.xmax;	// pixel tile's width
	this.vfrac = (this.iTop   - this.iBot ) / this.ymax;	// pixel tile's height.
}

CCamera.prototype.rayFrustum = function(left, right, bot, top, near) {
//==============================================================================
// Set the camera's viewing frustum with the same arguments used by the OpenGL 
// 'glFrustum()' fucntion
// (except this function has no 'far' argument; not needed for ray-tracing).
// Assumes camera's center-of-projection (COP) is at origin and the camera gazes
// down the -Z axis.
// left,right == -x,+x limits of viewing frustum measured in the z=-znear plane
// bot,top == -y,+y limits of viewing frustum measured
// near =- distance from COP to the image-forming plane. 'near' MUST be positive
//         (even though the image-forming plane is at z = -near).

/*
  console.log("you called CCamera.rayFrustum()");
	  //
	  //
	  // YOU WRITE THIS (see CRay.prototype.printMe() function above)
	  //
	  //
*/

  // UNTESTED!!!
  this.iLeft = left;
  this.iRight = right;
  this.iBot = bot;
  this.iTop = top;
  this.iNear = near;
}

CCamera.prototype.rayPerspective = function(fovy, aspect, zNear) {
//==============================================================================
// Set the camera's viewing frustum with the same arguments used by the OpenGL
// 'gluPerspective()' function
// (except this function has no 'far' argument; not needed for ray-tracing).
//  fovy == vertical field-of-view (bottom-to-top) in degrees
//  aspect ratio == camera image width/height
//  zNear == distance from COP to the image-forming plane. zNear MUST be >0.
/*
  console.log("you called CCamera.rayPerspective");
		//
		//
		//		YOU WRITE THIS
		//
		//
*/
  // UNTESTED!!!
  this.iNear = zNear;
  this.iTop = zNear * Math.tan(0.5*fovy*(Math.PI/180.0)); // tan(radians)
  this.iBot = -iTop;
  this.iRight = iTop*aspect;
  this.iLeft = -iRight;
}

CCamera.prototype.raylookAt = function(eyePt, aimPt, upVec) {
//==============================================================================
// Adjust the orientation and position of this ray-tracing camera 
// in 'world' coordinate system.
// Results should exactly match WebGL camera posed by the same arguments.
//
// Each argument (eyePt, aimPt, upVec) is a glMatrix 'vec3' object.
/*
  console.log("you called CCamera.rayLookAt().");
		//
		//
		//		YOU WRITE THIS
		//
		//
*/
  // UNTESTED!!!
  vec3.subtract(this.nAxis, eyePt, aimPt);  // aim-eye == MINUS N-axis direction
  vec3.normalize(this.nAxis, this.nAxis);   // N-axis must have unit length.
  vec3.cross(this.uAxis, this.upVec, this.nAxis);  // U-axis == upVec cross N-axis
  vec3.normalize(this.uAxis, this.uAxis);   // make it unit-length.
  vec3.cross(this.vAxis, this.nAxis, this.uAxis); // V-axis == N-axis cross U-axis
}

CCamera.prototype.setEyeRay = function(myeRay, xpos, ypos) {
//=============================================================================
// Set values of a CRay object to specify a ray in world coordinates that 
// originates at the camera's eyepoint (its center-of-projection: COP) and aims 
// in the direction towards the image-plane location (xpos,ypos) given in units 
// of pixels.  The ray's direction vector is *NOT* normalized.
//
// !CAREFUL! Be SURE you understand these floating-point xpos,ypos arguments!
// For the default CCamera (+/-45 degree FOV, xmax,ymax == 256x256 resolution) 
// the function call makeEyeRay(0,0) creates a ray to the image rectangle's 
// lower-left-most corner at U,V,N = (iLeft,iBot,-1), and the function call
// makeEyeRay(256,256) creates a ray to the image rectangle's upper-left-most  
// corner at U,V,N = (iRight,iTop,-1). 
//	To get the eye ray for pixel (x,y), DON'T call setEyeRay(myRay, x,y);
//                                   instead call setEyeRay(myRay,x+0.5,y+0.5)
// (Later you will trace multiple eye-rays per pixel to implement antialiasing) 
// WHY?  
//	-- because the half-pixel offset (x+0.5, y+0.5) traces the ray through the
//     CENTER of the pixel's tile, and not its lower-left corner.
// As we learned in class (and from optional reading "A Pixel is Not a Little 
// Square" by Alvy Ray Smith), a pixel is NOT a little square -- it is a 
// point-like location, one of many in a grid-like arrangement, where we store 
// a neighborhood summary of an image's color(s).  While we could (and often 
// do) define that pixel's 'neighborhood' as a small tile of the image plane, 
// and summarize its color as the tile's average color, it is not our only 
// choice and certainly not our best choice.  
// (ASIDE: You can dramatically improve the appearance of a digital image by 
//     making pixels  that summarize overlapping tiles by making a weighted 
//     average for the neighborhood colors, with maximum weight at the pixel 
//     location, and with weights that fall smoothly to zero as you reach the 
//     outer limits of the pixel's tile or 'neighborhood'. Google: antialiasing 
//     bilinear filter, Mitchell-Netravali piecewise bicubic prefilter, etc).

// Convert image-plane location (xpos,ypos) in the camera's U,V,N coords:
var posU = this.iLeft + xpos*this.ufrac; 	// U coord,
var posV = this.iBot  + ypos*this.vfrac;	// V coord,
//  and the N coord is always -1, at the image-plane (zNear) position.
// Then convert this point location to world-space X,Y,Z coords using our 
// camera's unit-length coordinate axes uAxis,vAxis,nAxis
 xyzPos = vec4.create();    // make vector 0,0,0,0.	
	vec4.scaleAndAdd(xyzPos, xyzPos, this.uAxis, posU); // xyzPos += Uaxis*posU;
	vec4.scaleAndAdd(xyzPos, xyzPos, this.vAxis, posV); // xyzPos += Vaxis*posU;
  vec4.scaleAndAdd(xyzPos, xyzPos, this.nAxis, -this.iNear); 
  // 																								xyzPos += Naxis * (-1)
  // The eyeRay we want consists of just 2 world-space values:
  //  	-- the ray origin == camera origin == eyePt in XYZ coords
  //		-- the ray direction TO image-plane point FROM ray origin;
  //				myeRay.dir = (xyzPos + eyePt) - eyePt = xyzPos; thus
	vec4.copy(myeRay.orig, this.eyePt);	
	vec4.copy(myeRay.dir, xyzPos);
}

CCamera.prototype.printMe = function() {
//==============================================================================
// print CCamera object's current contents in console window:
	  console.log("you called CCamera.printMe()");
	  //
	  //
	  // YOU WRITE THIS (see CRay.prototype.printMe() function above)
	  //
	  //
}

//=============================================================================
// Allowable values for CGeom.shapeType variable.  Add some of your own!
const JT_GNDPLANE = 0;    // An endless 'ground plane' surface.
const JT_SPHERE   = 1;    // A sphere.
const JT_BOX      = 2;    // An axis-aligned cube.
const JT_CYLINDER = 3;    // A cylinder with user-settable radius at each end
                        // and user-settable length.  radius of 0 at either
                        // end makes a cone; length of 0 with nonzero
                        // radius at each end makes a disk.
const JT_TRIANGLE = 4;    // a triangle with 3 vertices.
const JT_BLOBBIES = 5;    // Implicit surface:Blinn-style Gaussian 'blobbies'.


function CGeom(shapeSelect) {
//=============================================================================
// Generic object for a geometric shape.  
// Each instance describes just one shape, but you can select from several 
// different kinds of shapes by setting the 'shapeType' member.  CGeom can 
// describe ANY shape, including sphere, box, cone, quadric, etc. and it holds 
// all/any variables needed for each shapeType.
//
// Advanced Version: try it!
//        Ray tracing lets us position and distort these shapes in a new way;
// instead of transforming the shape itself for 'hit' testing against a traced
// ray, we transform the 3D ray by the matrix 'world2model' before a hit-test.
// This matrix simplifies our shape descriptions, because we don't need
// separate parameters for position, orientation, scale, or skew.  For example,
// JT_SPHERE and JT_BOX need NO parameters--they each describe a unit sphere or
// unit cube centered at the origin.  To get a larger, rotated, offset sphere
// or box, just set the parameters in world2model matrix. Note that you can 
// scale the box or sphere differently in different directions, forming 
// ellipsoids for the unit sphere and rectangles (or prisms) from the unit box.
	if(shapeSelect == undefined) shapeSelect = JT_GND_PLANE;	// default
	this.shapeType = shapeSelect;
	
	this.world2model = mat4.create();	// the matrix used to transform rays from
	                                  // 'world' coord system to 'model' coords;
	                                  // Use this to set shape size, position,
	                                  // orientation, and squash/stretch amount.
	// Ground-plane 'Line-grid' parameters:
	this.zGrid = -5.0;	// create line-grid on the unbounded plane at z=zGrid
	this.xgap = 1.0;	// line-to-line spacing
	this.ygap = 1.0;
	this.lineWidth = 0.1;	// fraction of xgap used for grid-line width
	this.lineColor = vec4.fromValues(0.1,0.5,0.1,1.0);  // RGBA green(A==opacity)
	this.gapColor = vec4.fromValues( 0.9,0.9,0.9,1.0);  // near-white
	this.skyColor = vec4.fromValues( 0.3,1.0,1.0,1.0);  // cyan/bright blue
	// (use skyColor when ray does not hit anything, not even the ground-plane)
}

CGeom.prototype.traceGrid = function(inRay) {
//=============================================================================
// Find intersection of CRay object 'inRay' with grid-plane at z== this.zGrid
// return -1 if ray MISSES the plane
// return  0 if ray hits BETWEEN lines
// return  1 if ray hits ON the lines
// HOW?!?
// 1) we parameterize the ray by 't', so that we can find any point on the
// ray by:
//          Ray(t) = ray.orig + t*ray.dir
// To find where the ray hit the plane, solve for t where Ray(t) = x,y,zGrid:
// Re-write:
//      Ray(t0).x = ray.orig[0] + t0*ray.dir[0] = x-value at hit-point (UNKNOWN!)
//      Ray(t0).y = ray.orig[1] + t0*ray.dir[1] = y-value at hit-point (UNKNOWN!)
//      Ray(t0).z = ray.orig[2] + t0*ray.dir[2] = zGrid    (we KNOW this one!)
//
//  solve for t0:   t0 = (zGrid - ray.orig[2]) / ray.dir[2]
//  From t0 we can find x,y value at the hit-point too.
//  Wait wait wait --- did we consider ALL the possibilities?  No, not really:
//  If t0 <0, we can only hit the plane at points BEHIND our camera;
//  thus the ray going FORWARD through the camera MISSED the plane!.
//
// 2) Our grid-plane exists for all x,y, at the value z=zGrid, and is covered by
//    a grid of lines whose width is set by 'linewidth'.  The repeated lines of 
//    constant-x have spacing (repetition period) of xgap, and the lines of
//    constant-y have spacing of ygap.
//    GIVEN a hit-point (x,y,zGrid) on the grid-plane, find the color by:
//         if((x/xgap) has fractional part < linewidth  *OR*
//            (y/ygap) has fractional part < linewidth), you hit a line on
//            the grid. Use 'lineColor.
//        otherwise, the ray hit BETWEEN the lines; use 'gapColor'

  var t0 = (this.zGrid -inRay.orig[2])/inRay.dir[2];    
          // find ray/grid-plane intersection: t0 == value where ray hits plane.
  if(t0 < 0) {
    return -1;      // ray is BEHIND eyepoint.
  }
  // compute the x,y,z point where inRay hit the grid-plane
  var hitPt = vec4.fromValues(inRay.orig[0] + inRay.dir[0]*t0,
                              inRay.orig[1] + inRay.dir[1]*t0,
                              this.zGrid, 1.0);
  // remember, hit-point x,y could be positive or negative:
  var loc = hitPt[0] / this.xgap; // how many 'xgaps' from the origin?
  if(hitPt[0] < 0) loc = -loc;    // keep >0 to form double-width line at yaxis.
//console.log("loc",loc, "loc%1", loc%1, "lineWidth", this.lineWidth);
  if(loc%1 < this.lineWidth) {    // hit a line of constant-x?
    return 1;       // yes.
  }
  loc = hitPt[1] / this.ygap;     // how many 'ygaps' from origin?
  if(hitPt[1] < 0) loc = -loc;    // keep >0 to form double-width line at xaxis.
  if(loc%1 < this.lineWidth) {   // hit a line of constant-y?
      return 1;       // yes.
  }
  return 0;         // No.
}

function CImgBuf(wide, tall) {
//=============================================================================
// Construct an 'image-buffer' object to hold a floating-pt ray-traced image.
//  Contains BOTH:
//	iBuf -- 2D array of 8-bit RGB pixel values we can display on-screen, AND
//	fBuf -- 2D array of floating-point RGB pixel values we often CAN'T display,
//          but contains full-precision results of ray-tracing.
//			--Both buffers hold the same numbers of pixel values (xSiz,ySiz,pixSiz)
//			--imgBuf.int2float() copies/converts current iBuf contents to fBuf
//			--imgBuf.float2int() copies/converts current fBuf contents to iBuf
//	WHY?  
//	--Our ray-tracer computes floating-point light amounts(e.g. radiance L) 
//    but neither our display nor our WebGL texture-map buffers can accept 
//		images with floating-point pixel values.
//	--You will NEED all those floating-point values for applications such as
//    environment maps (re-lighting from sky image) and lighting simulations.
// Stay simple in early versions of your ray-tracer: keep 0.0 <= RGB < 1.0, 
// but later you can modify your ray-tracer 
// to use radiometric units of Radiance (watts/(steradians*meter^2), or convert 
// to use photometric units of luminance (lumens/(steradians*meter^2 or cd/m^2) 
// to compute in physically verifiable units of visible light.

	this.xSiz = wide;							// image width in pixels
	this.ySiz =	tall;							// image height in pixels
	this.pixSiz = 3;							// pixel size (3 for RGB, 4 for RGBA, etc)
	this.iBuf = new Uint8Array(  this.xSiz * this.ySiz * this.pixSiz);	
	this.fBuf = new Float32Array(this.xSiz * this.ySiz * this.pixSiz);
}

CImgBuf.prototype.setTestPattern = function(pattNum) {
//=============================================================================
// Replace current 8-bit RGB contents of 'imgBuf' with a colorful pattern
	// 2D color image:  8-bit unsigned integers in a 256*256*3 array
	// to store r,g,b,r,g,b integers (8-bit)
	// In WebGL texture map sizes MUST be a power-of-two (2,4,8,16,32,64,...4096)
	// with origin at lower-left corner
	// (NOTE: this 'power-of-two' limit will probably vanish in a few years of
	// WebGL advances, just as it did for OpenGL)

var PATT_MAX = 4;       // number of patterns we can draw:
  if(pattNum < 0 || pattNum >= PATT_MAX) 
    pattNum %= PATT_MAX; // prevent out-of-range inputs.
//console.log('pattNum: ', pattNum);

  // use local vars to set the array's contents.
  for(var j=0; j< this.ySiz; j++) {						// for the j-th row of pixels
  	for(var i=0; i< this.xSiz; i++) {					//  & the i-th pixel on that row,
	  	var idx = (j*this.xSiz + i)*this.pixSiz;// Array index at pixel (i,j) 
	  	switch(pattNum) {
	  		case 0:	//================(Colorful L-shape)===========================
			  	if(i < this.xSiz/4 || j < this.ySiz/4) {
			  		this.iBuf[idx   ] = i;								// 0 <= red <= 255
			  		this.iBuf[idx +1] = j;								// 0 <= grn <= 255
			  	}
			  	else {
			  		this.iBuf[idx   ] = 0;
			  		this.iBuf[idx +1] = 0;
			  		}
			  	this.iBuf[idx +2] = 255 -i -j;								// 0 <= blu <= 255
			  	break;
			  case 1: //================(bright orange)==============================
			  	this.iBuf[idx   ] = 255;	// bright orange
			  	this.iBuf[idx +1] = 128;
			  	this.iBuf[idx +2] =   0;
	  			break;
	  		case 2: //=================(Vertical Blue/yellow)=======================
    	  	if(i > 5 * this.xSiz/7 && j > 4*this.ySiz/5) {
    	  		this.iBuf[idx   ] = 200;                // 0 <= red <= 255
    	  		this.iBuf[idx +1] = 200;								// 0 <= grn <= 255
    	  	  this.iBuf[idx +2] = 200;								// 0 <= blu <= 255
    	  	}
    	  	else {
    	  		this.iBuf[idx   ] = 255-j;                // 0 <= red <= 255
    	  		this.iBuf[idx +1] = 255-j;	 							  // 0 <= grn <= 255
    	  	  this.iBuf[idx +2] = j;								// 0 <= blu <= 255
    	  	}
    	  	break;
    	  case 3: 
    	    //================(Diagonal YRed/Cyan)================================
			  	this.iBuf[idx   ] = 255 - (i+j)/2;	// bright orange
			  	this.iBuf[idx +1] = 255 - j;
			  	this.iBuf[idx +2] = 255 - j;
    	    break;
	  		default:
	  			console.log("CImgBuf.setTestPattern() says: WHUT!?");
	  		break;
	  	}
  	}
  }
  this.int2float();		// fill the floating-point buffer with same test pattern.
}

CImgBuf.prototype.int2float = function() {
//=============================================================================
// Convert the integer RGB image in iBuf into floating-point RGB image in fBuf
for(var j=0; j< this.ySiz; j++) {		// for each scanline
  	for(var i=0; i< this.xSiz; i++) {		// for each pixel on that scanline
  		var idx = (j*this.xSiz + i)*this.pixSiz;// Find array index @ pixel (i,j)
			// convert integer 0 <= RGB <= 255 to floating point 0.0 <= R,G,B <= 1.0
  		this.fBuf[idx   ] = this.iBuf[idx   ] / 255.0;	// red
  		this.fBuf[idx +1] = this.iBuf[idx +1] / 255.0;	// grn
  		this.fBuf[idx +2] = this.iBuf[idx +2] / 255.0;	// blu  		
  	}
  }
}

CImgBuf.prototype.float2int = function() {
//=============================================================================
// Convert the floating-point RGB image in fBuf into integer RGB image in iBuf
for(var j=0; j< this.ySiz; j++) {		// for each scanline,
  	for(var i=0; i< this.xSiz; i++) {	 // for each pixel on that scanline,
  		var idx = (j*this.xSiz + i)*this.pixSiz; //Find array index @ pixel(i,j):
			// find 'clamped' color values that stay >=0.0 and <=1.0:
  		var rval = Math.min(1.0, Math.max(0.0, this.fBuf[idx   ]));
  		var gval = Math.min(1.0, Math.max(0.0, this.fBuf[idx +1]));
  		var bval = Math.min(1.0, Math.max(0.0, this.fBuf[idx +2]));
			// Divide [0,1] span into 256 equal-sized parts:  Math.floor(rval*256)
			// In the rare case when rval==1.0 you get unwanted '256' result that 
			// won't fit into the 8-bit RGB values.  Fix it with Math.min():
  		this.iBuf[idx   ] = Math.min(255,Math.floor(rval*256.0));	// red
  		this.iBuf[idx +1] = Math.min(255,Math.floor(gval*256.0));	// grn
  		this.iBuf[idx +2] = Math.min(255,Math.floor(bval*256.0));	// blu
  	}
  }
}

CImgBuf.prototype.printPixAt = function(xpix,ypix) {
//=============================================================================
// Use console.log() to print the integer and floating-point values (R,B,B,...)
// stored in our CImgBuf object for the pixel at (xpix,ypix)
		//
		//
		//		YOU WRITE THIS
		//
		//
}

CImgBuf.prototype.makeRayTracedImage = function() {
//=============================================================================
// TEMPORARY!!!! 
// THIS FUNCTION SHOULD BE A MEMBER OF YOUR CScene OBJECTS(when you make them),
// and NOT a member of CImgBuf OBJECTS!
//
// Create an image by Ray-tracing.   (called when you press 'T' or 't')

//	console.log("You called CImgBuf.makeRayTracedImage!")

  var eyeRay = new CRay();	// the ray we trace from our camera for each pixel
  var myCam = new CCamera();	// the 3D camera that sets eyeRay values
  var myGrid = new CGeom(JT_GNDPLANE);
  var colr = vec4.create();	// floating-point RGBA color value
console.log("colr obj:", colr);
	var hit = 0;
	var idx = 0;  // CImgBuf array index(i,j) == (j*this.xSiz + i)*this.pixSiz
  var i,j;      // pixel x,y coordinate (origin at lower left; integer values)
  for(j=0; j< this.ySiz; j++) {       // for the j-th row of pixels.
  	for(i=0; i< this.xSiz; i++) {	    // and the i-th pixel on that row,
			myCam.setEyeRay(eyeRay,i,j);						  // create ray for pixel (i,j)
if(i==0 && j==0) console.log('eyeRay:', eyeRay);
			hit = myGrid.traceGrid(eyeRay);						// trace ray to the grid
			if(hit==0) {
				vec4.copy(colr, myGrid.gapColor);
			}
			else if (hit==1) {
				vec4.copy(colr, myGrid.lineColor);
			}
			else {
			  vec4.copy(colr, myGrid.skyColor);
			}
		  idx = (j*this.xSiz + i)*this.pixSiz;	// Array index at pixel (i,j) 
	  	this.fBuf[idx   ] = colr[0];	
	  	this.fBuf[idx +1] = colr[1];
	  	this.fBuf[idx +2] = colr[2];
	  	}
  	}
  this.float2int();		// create integer image from floating-point buffer.
}


function CScene() {
//=============================================================================
// A complete ray tracer object prototype (formerly a C/C++ 'class').
//      My code uses just one CScene instance (g_myScene) to describe the entire 
//			ray tracer.  Note that I could add more CScene objects to make multiple
//			ray tracers (perhaps on different threads or processors) and then 
//			combine their results into a giant video sequence, a giant image, or 
//			use one ray-traced result as input to make the next ray-traced result.
//
//The CScene class includes:
// One CImgBuf object that holds a floating-point RGB image, and uses that
//		  image to create a corresponding 8,8,8 bit RGB image suitable for WebGL
//			display as a texture-map in an HTML-5 canvas object within a webpage.
// One CCamera object that describes an antialiased ray-tracing camera;
//      in my code, it is the 'rayCam' variable within the CScene prototype.
//      The CCamera class defines the SOURCE of rays we trace from our eyepoint
//      into the scene, and uses those rays to set output image pixel values.
// One CRay object 'eyeRay' that describes the ray we're currently tracing from
//      eyepoint into the scene.
// One CHitList object 'eyeHits' that describes each 3D point where 'eyeRay'
//      pierces a shape (a CGeom object) in our CScene.  Each CHitList object
//      in our ray-tracer holds a COLLECTION of hit-points (CHit objects) for a
//      ray, and keeps track of which hit-point is closest to the camera. That
//			collection is held in the eyeHits member of the CScene class.
// a COLLECTION of CGeom objects: each describe an individual visible thing; a
//      single item or thing we may see in the scene.  That collection is the 
//			held in the 'item[]' array within the CScene class.
//      		Each CGeom element in the 'item[]' array holds one shape on-screen.
//      To see three spheres and a ground-plane we'll have 4 CGeom objects, one 
//			for each of the spheres, and one for the ground-plane.
//      Each CGeom obj. includes a 'matlIndex' index number that selects which
//      material to use in rendering the CGeom shape. I assume ALL lights in a
//      scene may affect ALL CGeom shapes, but you may wish to add an light-src
//      index to permit each CGeom object to choose which lights(s) affect it.
// a COLLECTION of CMatl objects; each describes one light-modifying material'
//      hold this collection in  'matter[]' array within the CScene class).
//      Each CMatl element in the 'matter[]' array describes one particular
//      individual material we will use for one or more CGeom shapes. We may
//      have one CMatl object that describes clear glass, another for a
//      Phong-shaded brass-metal material, another for a texture-map, another
//      for a bump mapped material for the surface of an orange (fruit),
//      another for a marble-like material defined by Perlin noise, etc.
// a COLLECTION of CLight objects that each describe one light source.  
//			That collection is held in the 'lamp[]' array within the CScene class.
//      Note that I apply all lights to all CGeom objects.  You may wish to add
//      an index to the CGeom class to select which lights affect each item.
//
// The default CScene constructor creates a simple scene that will create a
// picture if traced:
// --rayCam with +/- 45 degree Horiz field of view, aimed at the origin from 
// 			world-space location (0,0,5)
// --item[0] is a unit sphere at the origin that uses matter[0] material;
// --matter[0] material is a shiny red Phong-lit material, lit by lamp[0];
// --lamp[0] is a point-light source at location (5,5,5).

  this.RAY_EPSILON = 1.0E-15;       // ray-tracer precision limits; treat 
                                    // any value smaller than this as zero.
                                    // (why?  JS uses 52-bit mantissa;
                                    // 2^-52 = 2.22E-16, so 10^-15 gives a
                                    // safety margin of 20:1 for small # calcs)
	//
	//
	//
	//
	//
	//  	YOU WRITE THIS!  
	//
	//
	//
	//
	//
}

function CHit() {
//=============================================================================
// Describes one ray/object intersection point that was found by 'tracing' one
// ray through one shape (through a single CGeom object, held in the
// CScene.item[] array).
// CAREFUL! We don't use isolated CHit objects, but instead gather all the CHit
// objects for one ray in one list held inside a CHitList object.
// (CHit, CHitList classes are consistent with the 'HitInfo' and 'Intersection'
// classes described in FS Hill, pg 746).

	//
	//
	//
	//
	//  	YOU WRITE THIS!  
	//
	//
	//
	//
	//
}

function CHitList() {
//=============================================================================
// Holds ALL ray/object intersection results from tracing a single ray(CRay)
// sent through ALL shape-defining objects (CGeom) in in the item[] array in 
// our scene (CScene).  A CHitList object ALWAYS holds at least one valid CHit 
// 'hit-point', as we initialize the pierce[0] object to the CScene's 
//  background color.  Otherwise, each CHit element in the 'pierce[]' array
// describes one point on the ray where it enters or leaves a CGeom object.
// (each point is in front of the ray, not behind it; t>0).
//  -- 'iEnd' index selects the next available CHit object at the end of
//      our current list in the pierce[] array. if iEnd=0, the list is empty.
//     CAREFUL! *YOU* must prevent buffer overflow! Keep iEnd<= JT_HITLIST_MAX!
//  -- 'iNearest' index selects the CHit object nearest the ray's origin point.
	//
	//
	//
	//
	//  	YOU WRITE THIS!  
	//
	//
	//
	//
	//
}

