# VBObox-Lib.js library

#### Written for EECS 351-2,	Intermediate Computer Graphics,
#### Northwestern Univ. EECS Dept., Jack Tumblin

## Changelog

### 2016.05.26 J. Tumblin
-  Created; tested on 'TwoVBOs.html' starter code.
### 2017.02.20 J. Tumblin
- updated for EECS 351-1 use for Project C.
### 2018.04.11 J. Tumblin
-  minor corrections/renaming for particle systems.
- 11e: global 'gl' replaced redundant 'myGL' fcn args;
- 12: added 'SwitchToMe()' fcn to simplify 'init()' function and to fix
weird subtle errors that sometimes appear when we alternate 'adjust()'
and 'draw()' functions of different VBObox objects. CAUSE: found that
only the 'draw()' function (and not the 'adjust()' function) made a full
changeover from one VBObox to another; thus calls to 'adjust()' for one
VBObox could corrupt GPU contents for another.
- Created vboStride, vboOffset members to centralize VBO layout in the
constructor function.
-  13 (abandoned) tried to make a 'core' or 'resuable' VBObox object to
which we would add on new properties for shaders, uniforms, etc., but
I decided there was too little 'common' code that wasn't customized.
- 14: improved animation timing; moved all literals to the constructor;

## Comments
Note that you don't really need 'VBObox' objects for any simple,
beginner-level WebGL/OpenGL programs: if all vertices contain exactly
the same attributes (e.g. position, color, surface normal), and use
the same shader program (e.g. same Vertex Shader and Fragment Shader),
then our textbook's simple 'example code' will suffice.

***BUT*** that's rare -  most genuinely useful WebGL/OpenGL programs need
different sets of vertices with  different sets of attributes rendered
by different shader programs.  THUS a customized VBObox object for each
VBO/shader-program pair will help you remember and correctly implement ALL
the WebGL/GLSL steps required for a working multi-shader, multi-VBO program.

One 'VBObox' object contains all we need for WebGL/OpenGL to render on-screen a
set of shapes made from vertices stored in one Vertex Buffer Object (VBO),
as drawn by calls to one 'shader program' that runs on your computer's
Graphical Processing Unit(GPU), along with changes to values of that shader
program's one set of 'uniform' varibles.

The 'shader program' consists of a Vertex Shader and a Fragment Shader written
in GLSL, compiled and linked and ready to execute as a Single-Instruction,
Multiple-Data (SIMD) parallel program executed simultaneously by multiple
'shader units' on the GPU.  The GPU runs one 'instance' of the Vertex
Shader for each vertex in every shape, and one 'instance' of the Fragment
Shader for every on-screen pixel covered by any part of any drawing
primitive defined by those vertices.

The 'VBO' consists of a 'buffer object' (a memory block reserved in the GPU),
accessed by the shader program through its 'attribute' variables. Shader's
'uniform' variable values also get retrieved from GPU memory, but their
values can't be changed while the shader program runs.
Each VBObox object stores its own 'uniform' values as vars in JavaScript;
its 'adjust()'	function computes newly-updated values for these uniform
vars and then transfers them to the GPU memory for use by shader program.

I have replaced'cuon-matrix' with the free, open-source 'glmatrix.js' library
for vectors, matrices & quaternions: Google it!  This vector/matrix library
is more complete, more widely-used, and runs faster than our textbook's
'cuon-matrix' library.  The version I put in the 'lib' directory is simple;
just one file.  Later versions are more complicated, multi-file affairs.


### A MESSY SET OF CUSTOMIZED OBJECTS- NOT REALLY A 'CLASS'

As each 'VBObox' object can contain:
- a DIFFERENT GLSL shader program,
- a DIFFERENT set of attributes that define a vertex for that shader program,
- a DIFFERENT number of vertices to used to fill the VBOs in GPU memory, and
- a DIFFERENT set of uniforms transferred to GPU memory for shader use.

THUS:
I don't see any easy way to use the exact same object constructors and
prototypes for all VBObox objects.  Every additional VBObox objects may vary
substantially, so I recommend that you copy and re-name an existing VBObox
prototype object, and modify as needed, as shown here.
(e.g. to make the VBObox3 object, copy the VBObox2 constructor and
all its prototype functions, then modify their contents for VBObox3
activities.)
