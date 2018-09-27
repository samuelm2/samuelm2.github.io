
//@author samuelm2

var twoDArray;
var scaleDown = .65;
var maxScale = .8;
var color = vec3.create();

/**
 * An implementation of a simple colormap that is used to determine the color based on the height of the vertex
 * @param {number} height z-value of the vertex whose height is to be calculated
 * @param {vec3} the color that will be used
 */
function generateColorFromHeight(height, color) {
  if(height <= -.2) {
    //blue
    color[0] = 0.;
    color[1] = 0.;
    color[2] = 139./255.;
  } else if(height <= .0) {
    //green
    color[0] = 0.
    color[1] = .4;
    color[2] = 0;
  } else if(height <= .2) {
    //brown
    color[0] = 205./255;
    color[1] = 133./255.;
    color[2] = 63./255.; 
  } else {
    //white
    color[0] = 1;
    color[1] = 1;
    color[2] = 1;
  }
}

/**
 * Iterative implementation of diamond square algorithm
 * @param {number} n number of squares on each side
 * @param {Array} heightMap height map of generated terrain vertices
 */
function diamondSquareAlgorithm(n, heightMap) 
{

  twoDArray = new Array(n+1);
  for(var i = 0; i < n+1; i++) {
    twoDArray[i] = new Array(n+1);
    for(var j = 0; j < n+1; j++) {
      twoDArray[i][j] = 0;
    }
  }


  //set corners to random values between [-.4, .4)
  twoDArray[0][0] = -.4 + .8*Math.random();
  twoDArray[0][n] = -.4 + .8*Math.random();
  twoDArray[n][0] = -.4 + .8*Math.random();
  twoDArray[n][n] = -.4 + .8*Math.random();

  
  var counter = 0;
  for(var i = Math.floor(n/2); i >= 1; i = Math.floor(i/2)) {
    //diamond step
    for(var x = i; x <= n; x+=2*i) {
      for(var y = i; y <= n; y+= 2*i) {
        diamondStep(x, y, 2*i, twoDArray, counter);
      }
    }

    //square step
    for(var x = 0; x <= n; x+=i) {
      for(var y = 0; y <= n; y+=i) {
        if(twoDArray[x][y] < 0.000000005 && twoDArray[x][y] > -0.000000005) {
          squareStep(x, y, 2*i, twoDArray, counter);
        }
      }
    }

    counter++;
  }

  //put contents of 2d array into the height map
  for(var i = 0; i < n+1; i++) {
    for(var j = 0; j < n+1; j++) {
      heightMap.push(twoDArray[i][j]);
    }
  }
}

function diamondStep(x, y, sideLength, twoDArray, numberOfTimesDone) {
  var halflength = sideLength/2;
  twoDArray[x][y] = (twoDArray[x-halflength][y-halflength] + 
                     twoDArray[x+halflength][y-halflength] +
                     twoDArray[x-halflength][y+halflength] + 
                     twoDArray[x+halflength][y+halflength])/4 + (-maxScale/2 + maxScale * Math.random())*(Math.pow(scaleDown, numberOfTimesDone));
}

function squareStep(x, y, sideLength, twoDArray, numberOfTimesDone) {
    var halflength = sideLength/2;
    var neighboringVerts = [];
    if(x+halflength < twoDArray.length) {
      neighboringVerts.push(twoDArray[x+halflength][y])
    }
    if(x-halflength >= 0) {
      neighboringVerts.push(twoDArray[x-halflength][y]);
    }
    if(y+halflength < twoDArray.length) {
      neighboringVerts.push(twoDArray[x][y+halflength]);
    }
    if(y-halflength >= 0) {
      neighboringVerts.push(twoDArray[x][y-halflength]);
    }

    var total = 0;
    for(var i = 0; i < neighboringVerts.length; i++) {
      total+=neighboringVerts[i];
    }
    var avg = total/neighboringVerts.length;

    twoDArray[x][y] = avg + (-maxScale/2 + maxScale * Math.random())*(Math.pow(scaleDown  , numberOfTimesDone));
} 

/**
 * Iteratively generate terrain from numeric inputs
 * @param {number} n
 * @param {number} minX Minimum X value
 * @param {number} maxX Maximum X value
 * @param {number} minY Minimum Y value
 * @param {number} maxY Maximum Y value
 * @param {Array} heightMap Array that will contain height maps
 * @param {Array} vertexArray Array that will contain vertices generated
 * @param {Array} faceArray Array that will contain faces generated
 * @param {Array} normalArray Array that will contain normals generated
 * @param {Array} colorArray Array that will contain color generated
 * @return {number}
 */
function terrainFromIteration(n, minX,maxX,minY,maxY, vertexArray, faceArray,normalArray, colorArray)
{
    heightMap = [];
    
    diamondSquareAlgorithm(n, heightMap);

    var deltaX=(maxX-minX)/n;
    var deltaY=(maxY-minY)/n;

    var heightMapCounter = 0;

    var leftVect = vec3.create();
    var upVect = vec3.create();
    var downVect = vec3.create();
    var rightVect = vec3.create();
    var cornerVect = vec3.create();

    var leftUpNorm = vec3.create();
    var leftDownNorm = vec3.create();
    var rightUpNorm = vec3.create();
    var rightDownNorm = vec3.create();

    var leftUpNorm2 = vec3.create();
    var leftDownNorm2 = vec3.create();
    var rightUpNorm2 = vec3.create();
    var rightDownNorm2 = vec3.create();
    for(var j=0;j<=n;j++)
       for(var i=0;i<=n;i++)
       {
           vertexArray.push(minX+deltaX*j);
           vertexArray.push(minY+deltaY*i);
           vertexArray.push(heightMap[heightMapCounter]);

           generateColorFromHeight(heightMap[heightMapCounter], color);

           colorArray.push(color[0]);
           colorArray.push(color[1]);
           colorArray.push(color[2]);

           var normals = [];
           
           if(j-1 >= 0) {
              leftVect = vec3.fromValues(-deltaX, 0, (twoDArray[j-1][i] - twoDArray[j][i]));
              if(i+1 <= n) {
                upVect = vec3.fromValues(0, deltaY, (twoDArray[j][i+1] - twoDArray[j][i]));
                cornerVect = vec3.fromValues(-deltaX, deltaY, (twoDArray[j-1][i+1] - twoDArray[j][i]));
                vec3.cross(leftUpNorm, upVect, cornerVect);
                normals.push(leftUpNorm);
                vec3.cross(leftUpNorm2, cornerVect, leftVect);
                normals.push(leftUpNorm2);
              }
              if(i-1 >= 0) {
                downVect = vec3.fromValues(0, -deltaY, (twoDArray[j][i-1] - twoDArray[j][i]));
                cornerVect = vec3.fromValues(-deltaX, -deltaY, (twoDArray[j-1][i-1] - twoDArray[j][i]));
                vec3.cross(leftDownNorm, leftVect, cornerVect);
                normals.push(leftDownNorm);
                vec3.cross(leftDownNorm2, cornerVect, downVect);
                normals.push(leftDownNorm2);
              }
           }

            if(j+1 <= n) {
              rightVect = vec3.fromValues(deltaX, 0, (twoDArray[j+1][i] - twoDArray[j][i]));
              if(i+1 <= n) {
                upVect = vec3.fromValues(0, deltaY, (twoDArray[j][i+1] - twoDArray[j][i]));
                cornerVect = vec3.fromValues(deltaX, deltaY, (twoDArray[j+1][i+1] - twoDArray[j][i]));
                vec3.cross(rightUpNorm, rightVect, cornerVect);
                vec3.cross(rightUpNorm2, cornerVect, upVect);
                normals.push(rightUpNorm);
                normals.push(rightUpNorm2);
              }
              if(i-1 >= 0) {
                downVect = vec3.fromValues(0, -deltaY, (twoDArray[j][i-1] - twoDArray[j][i]));
                cornerVect = vec3.fromValues(deltaX, -deltaY, (twoDArray[j+1][i-1] - twoDArray[j][i]));
                vec3.cross(rightDownNorm, downVect, cornerVect);
                normals.push(rightDownNorm);
                vec3.cross(rightDownNorm2, cornerVect, rightVect);
                normals.push(rightDownNorm2);
              }
           }

           var total = vec3.create();

           for(var k = 0; k < normals.length; k++) {
            vec3.add(total, total, normals[k]);
           }

           vec3.normalize(total, total);
           
           normalArray.push(total[0]);
           normalArray.push(total[1]);
           normalArray.push(total[2]);
           heightMapCounter++;
       }

    var numT=0;
    for(var i=0;i<n;i++)
       for(var j=0;j<n;j++)
       {
           var vid = i*(n+1) + j;
           faceArray.push(vid);
           faceArray.push(vid+1);
           faceArray.push(vid+n+1);
           
           faceArray.push(vid+1);
           faceArray.push(vid+1+n+1);
           faceArray.push(vid+n+1);
           numT+=2;
       }

    return numT;
}
/**
 * Generates line values from faces in faceArray
 * @param {Array} faceArray array of faces for triangles
 * @param {Array} lineArray array of normals for triangles, storage location after generation
 */
function generateLinesFromIndexedTriangles(faceArray,lineArray)
{
    numTris=faceArray.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        lineArray.push(faceArray[fid]);
        lineArray.push(faceArray[fid+1]);
        
        lineArray.push(faceArray[fid+1]);
        lineArray.push(faceArray[fid+2]);
        
        lineArray.push(faceArray[fid+2]);
        lineArray.push(faceArray[fid]);
    }
}








