//===  CCamera.js  ===================================================

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
