//===  CGeom.js  ===================================================

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
