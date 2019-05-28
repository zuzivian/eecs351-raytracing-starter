//===  CRay.js  ===================================================

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
