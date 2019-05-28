//===  CHitList.js  ===================================================


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

	//  TODO:	YOU WRITE THIS!

}
