# Ray Tracing Starter Code
### J. Tumblin, Northwestern Univ.

## How to start writing your ray tracer:
Ray-tracers require a great deal of organization, and seem to defy good software engineering practices.  Ideally, you want to start with a very simple 'hello-world'-like program that does one simple thing; puts one simple image on-screen.  Ideally, you'd then expand and extend that program step-by-step, feature-by-feature, each time verifying each new feature on-screen.  In practice, ray tracers seem to require nearly all its major parts already built, debugged, and completed to make ANY on-screen image: even the most basic ray tracer seems requires cameras, rays, shapes, lights, materials, and more.

However, with a little care you CAN build your fully-capable ray-tracer step-by-step, without writing it all at once, and get an image on-screen to check your work at almost every step.  Here's what I recommend:

The starter code gives you side-by-side display of a conventional WebGL viewport and the image held in a floating-point image buffer (CImgBuf), where you'll put your ray-traced image.  It also contains remnants of these essential ray-tracing objects, (mostly commented out):

- CScene (a complete ray-tracer object type: it should hold a camera, multiple lights, multiple shapes, and multiple materials, and if you wish, even its own output image buffer);

- CRay ( simple ray object type- we'll use these to trace through the scene)

- CRayHit (an object that holds the results we find when a traced ray hits a surface. It tells us which object, where, what material, what lighting, etc.)

- CGeom (a generic shape-describing object type; each item we might see in the scene gets its own CGeom object to describe it)

- CLamp (a generic light-source-describing object type)

- CMatl (a generic material-describing object type; every different material we use in the scene gets its own CMatl object to describe that material's particular surface reflectances, transparency, texture, etc.)

What a mess!  At first, ignore all these object types; don't let them confuse you.  For your first on-screen ray-traced images, follow these six steps below.
Write your first ray tracer very, very simply- don't add any optional features yet, put in only the essentials described below, and you'll minimize the chance of introducing errors.  Errors are much easier to assess and fix once you have a program that makes a picture.  Let's do that:

- First, be sure you can write pixel values to the CImgBuf frame-buffer object, and that you understand where each of those pixels will appear on-screen. To be sure you can, write a CImgBuf::drawGrid()' function to draw a simple grid of lines on a uniform background, or some other interesting pattern.
Call it when users press the 'c' (clear) key.


- Second, note that the 'cuon-matrix' library supplied with our WebGL book is a bit too cursory for writing a good ray-tracer: we will need objects for vectors, matrices, and functions to manipulate them in 2D, 3D, and 4D.  In the starter code you will find the 'glMatrix.js' library by Brandon Jones and Colin Mackenzie that's notable for its speed and simplicity (e.g. https://github.com/toji/gl-matrix ), and very well-suited for ray-tracing.

	It offers:

	   - vector classes vec2,vec3,vec4 (for 2,3, and 4-element vectors), and
	   - matrix classes mat2,mat3,mat4 (for 2x2, 3x3, 4x4 matrices).
	   - functions to create, clone, change, multiply, invert, normalize and more.

	Use it to write a very basic object to describe a ray (CRay) that contains just these members:

	```
	// ray origin or position:
	vec4 orig;	// why 4 instead of 3? Homogeneous coordinates!
							// use this for (x,y,z,w); set w=1.0;
	// ray direction:	 
	vec4 dir;	// here, set w=0 (its a vector, not a point)

	// The 'w' values enable you to construct any transformations you wish with a
	// simple 4x4 matrix, including any desired combination of translate, rotate,
	// scale, skew etc.
	```

- Third, write a very basic ray-tracing camera object type (CCamera) that creates a CRay object each time we want to compute a pixel value in our output image. As with our cuon-matrix library's'gl.setFrustum()' camera, our first, simplest ray-tracing camera creates an rectangular image plane perpendicular to the -Z axis,
  - spanning 'left' <= x <= 'right' in x,
  - spanning 'bot'  <= y <= 'top'   in y.  

	Imagine that the camera divides this image rectangle into xmax by ymax 'little squares' (one for each pixel), and shoots rays from the origin (0,0,0) through those squares to find the corresponding pixel values.  Remember, a pixel is NOT a little square, but instead is the infinitesimal spot at the center of that square (and a pixel value is an estimate of the image color at the pixel the image neighborhood around it (maybe a square neighborhood, but maybe not).  

	For the simplest image making (without any antialiasing) just shoot ONE ray through the CENTER of each of the little squares; the color found at the end of that ray becomes the color for that pixel in our output image (CImgBuf).

	Start with these CCamera data members:

		integer xmax,ymax;	// ray-camera image resolution, measured in pixels.
		// frustum parameters (just like the ones used by setFrustum() function;)
		float iLeft,iRight;  // image-plane limits in x direction,
		float iBot, iTop;	 // image-plane limits in y direction,
		float iNear;		 // image-plane location on z axis.
		// (no iFar required, because we choose to ignore zfar and allow our ray-tracer's viewing frustum to extend without limit outwards from the camera into the scene.)  

	and make these CCcamera function members:

		void makeSimpleCam();  (no arguments)
		//makes a very simple square camera with a +/-45 degree field of view:
		//sets left= -1.0; right= 1.0; bot = -1.0;  top = 1.0; znear= -1.0;

		void makeEyeRay() // that accepts these arguments:
		// CRay eye, float xpos, float ypos;
		// create a ray from eyepoint through the image plane at
		//	(xpos,ypos,znear).
		// Note xpos and ypos are between the left,right,top,bot limits)

	BUT: Don't call these functions yet; we'll do it in Step 5 below.

- Fourth, write a very basic shape-describing object type (CGeom).  For now, we'll use it to describe only one kind of shape, a 'grid-plane' like the one in the picture shown in the lecture notes.  This solid, unbounded plane is perpendicular to the Z axis at location z=zVal; it stretches to infinity, and we cover the plane with grid of lines parallel to the x and y axes. The lineColr[] array sets the color of these lines, and the bkgndColor set the color on the plane in the gaps between the lines.

	I suggest these data members:

		vec3 bkgndColr;	// r,g,b background color, line color
		vec3 lineColr;		// (Make sure they're different!)
		float xgap,ygap;	// grid-line spacing along x,y directions
							// Start with xgap=ygap=1.0;
		float linewidth;	// line width, as a fraction of xgap or ygap;
							// (I think linewidth=0.1 looks good)
		float zVal;		// TEMPORARY! the z value where the grid-plane
							// meets the perpendicular z axis.
	HINTS: use keyboard's 1,2 keys to adjust zval up and down...
	start with an initial zVal value of -5.0
	(Why? CCamera object, at origin, looks down the -z axis!)

	Start with just these two member functions:

		drawWebGL();		(no arguments)
		// Draws the grid-lines using webGL primitives.  Just make
		// a simple grid of lines parallel to the x and y axes at z=zval;
		// ignore background color between lines.
		// Use this call to replace the wireframe teapot drawing already
		// supplied.  Note that the mouse and arrow keys move this plane in
		// the webGL display; it draws the plane in a 'model' coordinate
		// system, applying a matrix we constructed for ray-tracing.

		traceGrid() accepts CRay argument 'inRay';
		// Your first ray-intersection function:  
		// Ray(t) = RayOrigin + t*RayDir
		// Find the 't0' value where Ray(t) hits the grid-plane object:
		//		Ray(t0).z = RayOrigin.z + t0*RayDir.z = zVal
		//	thus	t0 = (zVal - RayOrigin.z)/RayDir.z
		// - use that 't0' to find where the ray hits the grid-plane object:
		//		hit point (x,y,z) = Ray(t0).x, Ray(t0).y, Ray(t0).z
		// - returns 0.0 if ray hits our grid-plane surface at an x,y location
		// 	BETWEEN the grid-lines,
		// - return 1.0 if ray hits our grid-plane surface at an x,y location
		// 	ON one of the grid-lines,
		// - returns -1.0 if ray misses the plane entirely- no intersection.

	(see footnote 2 below)

- Fifth, write a very basic object type (CScene) that contains our entire ray tracer. Start very, very simply: at first, you'll have just one CScene object, and the object contains only:

	- one camera object to describe the camera,
		(CCamera object 'rayCam')
	- one ray object that holds the ray we're currently tracing to find a pixel's color,
		 (CRay object 'rayNow')
	- one shape object that hold our grid-plane object we're going to draw on-screen,
		(CShape item[0])
	- one 'makeRayTracedImage() member fcn whose argument is: the CImgBuf object where you want to draw the image.
	Initialize:
	- Declare a single global variable of type CScene,
		(such as the commented-out 'myScene')
	- in the init_raytrace()  function,
		- set up your camera: call myScene.makeSimpleCam();
		- set up your grid-plane object:
			myScene.item[0].xgap and also ygap, linewidth, etc.
	- in the display() callback function, draw the grid-plane in webGL:
		myScene.item[0].drawWebGL()

	- Finally, write a first, very-simple version of 'makeRayTracedImage()' member for CScene that will;
		- step through each pixel in the output image
			(0,0) <= i,j <= (xmax,ymax), and for each pixel it:
		- find that pixel's location xpos,ypos in CCamera's image plane
			(the center of the 'little square'), and
		- call CCamera.makeEyeRay() that accepts float arguments xpos,ypos, and CRay argument rayNow,
		and uses them to  set all values of the CScene.rayNow object
		- call CGeom.traceGrid(rayNow) to find where that ray hits the object (if anywhere)
		- use the returned value (-1,0, or 1) to set the pixel color in your frame buffer.
		if the ray hits nothing, use 'scene background' color (black?)
		- make your program respond to the 't' key (trace) function by a call your makeRayTracedImage() function.

- Sixth, run your program! Run your ray-tracer (call myScene.makeRayTracedImage() by hitting the 't' key).
You should get an on-screen grid.  If you use the +,- keys to make your lineGrid.zVal larger or smaller, the grid should grow or shrink, just as it would if you moved your camera away or towards it.

### You have a complete (but rudimentary) ray tracer!  

Note that the mouse and arrow keys move the webGL displayed grid-plane object, but not the ray-traced object. Next, we'll apply some transformations to rays so that the ray-traced object matches the webGL display.

How?

Recall that in previous webGL programs we created matrices 'ModelView' and 'Projection that transformed a stream of vertices from 'model' coordinates to screen coordinates,

#### KEY IDEA
ray-tracing creates rays in 'World' coordinates, then transforms rays (a point and a direction) into 'model' coordinates, and then tests for intersections with CGeom objects in the model's own coordinate system.

Accordingly, the matrix we use in ray-tracing to position an object on-screen is the INVERSE of the matrix we'd use in webGL.  Our week_1 reading assignment discusses this briefly. Don't panic; it's not as ugly as it sounds- you won't have to compute 4x4 matrix inverses, etc.

## FOOTNOTES:
### Hunh?  gl.makeFrustum()?  

Recall that we used gl.makeFrustum() to create a 3D camera matrix our webGL PROJECTION matrix. That matrix accepts vertices and other drawing primitives defined in the 'camera' coordinate system (the one where our eyepoint (center of projection) is at the origin and we're looking down the -z axis; e.g. the output of the MODELVIEW matrix), and transforms them to the 'canonical view volume' (CVV).  This makeFrustum() camera matrix stretches, warps, and moves stuff, so that our 3D 'view frustum' gets transformed into the canonical view volume (CVV: the +/-1 cube centered at the origin). After transformation, clipping to +/-1 (the CVV limits) ensures that webGL will not draw any portion of any drawing primitive that falls outside the camera's view frustum.  

But in ray-tracing, we don't need this transformation, and we don't need to clip primitives to the CVV, we don't need to do any depth-sorting with a Z-buffer. Instead, we send out rays through the view frustum, find the nearest object we hit, find the color of the object, and copy it to the frame buffer.  We specify our ray-tracing camera using the 'gl.makeFrustum()' parameters because it gives us an easy way to make our ray-tracing camera match our webGL camera.

### Why CGeom?
Later, you'll expand the 'CGeom' object type to describe other shapes such as spheres, cones, cylinders, cubes, etc.  Please create just ONE object type to describe ALL different kinds of shapes (instead of separate object types for planes, cones, spheres, cubes, etc). For simplicity, just use a data member whose value selects the shape(e.g. 'int shapeType', where perhaps 0=unassigned, 1==plane, 2=sphere, 3=cone, 4= torus, 5=cube, etc., set by #define statements).  Don't like that? if you'd rather write more elegant code that uses inheritance, please do- you can construct a class hierarchy of derived types to organize and describe different kinds of shapes, or use some other strategy.  Careful- class hierarchy debugging can get tricky and complicated: if unsure about this try my simple 'shapeType' strategy first, make pictures with it, THEN convert to a more elegant shape-describing class.

For now, our simple 'gridPlane' object has an adjustable z value.  Later you may wish to remove that, as we'll define **ALL** your ray tracer's shape primitives as centered at the origin of the current coord. system, just as webGL does with its built-in shape primitives (e.g. glutSolidSphere(), glutWireCone(), glutSolidTorus(), etc.).  Just like webGL, we'll make ray-tracer transformation functions that we'll call to change the current coordinate system.

For example, I recommend that later you add CScene commands such as rayLoadIdentity(), rayTranslate(), rayRotate(), and rayScale() functions that modify the how our built-in shapes appear on-screen. Just like webGL, these functions will modify the contents of a 'rayModelview' matrix used to draw that object.  Just like webGL, we can make jointed objects from a 'tree' of these transformations. Just like webGL, if we construct a push-down stack to store previous versions of this 'rayModelview' matrix, we can traverse that tree of transformations to draw very complicated jointed objects in our ray-tracer.

But that's for later!
