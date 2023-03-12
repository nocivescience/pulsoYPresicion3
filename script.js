const mazeElement=document.getElementById("maze");
const joystickElement=document.getElementById("joystick");
const noteElement=document.getElementById("note");
const joystickHeadElement=document.getElementById("joystick-head");
let hardMode=false;
let previousTimestamp=0;
let gameInProcess;
let mouseStartX;
let mouseStartY;
let accelerationX;
let accelerationY
let frictionX;
let frictionY;
const pathW=25;
const wallW=10;
const wallSize=10;
const holeSize=18;
const debugNode=false;
let balls;
const ballElements=[];
const holeElements=[];
const walls=[
    {column:0,row:0,horizontal:true,length:10},
    {column:0,row:0,horizontal:false,length:9},
    {column:0,row:9,horizontal:true,length:10},
    {column:10,row:0,horizontal:false,length:9.28},
    {column:0,row:6,horizontal:true,length:1},
    {column:1,row:8,horizontal:false,length:1},
    {column:1,row:1,horizontal:true,length:2},
    {column:2,row:2,horizontal:false,length:2},
    {column:2,row:4,horizontal:true,length:1},
    {column:2,row:5,horizontal:false,length:1},
    {column:2,row:6,horizontal:true,length:1},
    {column:3,row:3.3,horizontal:false,length:1},
    {column:3,row:6,horizontal:false,length:3},
    {column:4,row:1,horizontal:true,length:1},
    {column:4,row:1,horizontal:false,length:1},
    {column:4,row:2,horizontal:true,length:1},
    {column:5,row:2,horizontal:false,length:1},
    {column:5,row:3,horizontal:true,length:1},
    {column:4,row:6,horizontal:false,length:1},
    {column:5,row:6,horizontal:true,length:1},
    {column:6,row:6,horizontal:false,length:1},
    {column:6,row:7,horizontal:true,length:1},  
    {column:7,row:7,horizontal:false,length:1},
    {column:7,row:8,horizontal:true,length:1},
    {column:8,row:8,horizontal:false,length:1},
    {column:8,row:1,horizontal:true,length:1},
    {column:9,row:1,horizontal:false,length:1},
    {column:9,row:2,horizontal:true,length:1},
    {column:8,row:4,horizontal:false,length:1},
    {column:8,row:5,horizontal:true,length:1},
    {column:9,row:5,horizontal:false,length:1},
    {column:9,row:6,horizontal:true,length:1},
    {column:9,row:3,horizontal:false,length:1},
    {column:9,row:3,horizontal:true,length:1},
    {column:7,row:3,horizontal:false,length:1},
    {column:7,row:4,horizontal:true,length:1},
    {column:7,row:5,horizontal:false,length:1},
    {column:7,row:6,horizontal:true,length:1},
    {column:6,row:2,horizontal:false,length:1},
    {column:6,row:3,horizontal:true,length:1},
].map((wall)=>({
    x:wall.column*(wallW+pathW),
    y:wall.row*(wallW+pathW),
    horizontal:wall.horizontal,
    length:wall.length*(wallW+pathW),
}));
walls.forEach(({x,y,horizontal,length})=>{
    const wall=document.createElement("div");
    wall.setAttribute("class","wall");
    wall.style.cssText=`left:${x}px;top:${y}px;width:${horizontal?length:wallSize}px;height:${horizontal?wallSize:length}px;`;
    mazeElement.appendChild(wall);
});
Math.minmax=(value,limit)=>{return Math.max(Math.min(value,limit),-limit)};
const distance2D=(p1,p2)=>{return Math.sqrt(Math.pow(p1.x-p2.x,2)+Math.pow(p1.y-p2.y,2))};
const getAngle=(p1,p2)=>{return Math.atan2(p2.y-p1.y,p2.x-p1.x)};
const closestCanbe=(cap,ball)=>{
    let angle=getAngle(cap,ball);
    const deltaX=Math.cos(angle);
    const deltaY=Math.sin(angle);
    return {
        x:cap.x+deltaX,
        y:cap.y+deltaY
    };
}
const rollAroundCap=(cap,ball)=>{
    let impactAngle=getAngle(cap,ball);
    let heading =getAngle(
        {x:0,y:0},
        {x:ball.velocityX,y:ball.velocityY}
    );
    let impactHeadingAngle=impactAngle-heading;
    const velocityMagnitude=distance2D(
        {x:0,y:0},
        {x:ball.velocityX,y:ball.velocityY}
    );
    const velocityMagnitudeDiagonalToTheImpact=Math.sin(impactHeadingAngle)*velocityMagnitude;
    const closestDistance=wallW/2+wallSize/2;
    const rotationAngle=Math.atan(velocityMagnitudeDiagonalToTheImpact/closestDistance)
    const deltaFromCap={
        x:Math.cos(impactAngle+Math.PI-rotationAngle)*closestDistance,
        y:Math.sin(impactAngle+Math.PI-rotationAngle)*closestDistance
    }
    const x=ball.x;
    const y=ball.y;
    const velocityX=ball.x-(cap.x+deltaFromCap.x);
    const velocityY=ball.y-(cap.y+deltaFromCap.y);
    const nextX=x+velocityX;
    const nextY=y+velocityY;
    return {x,y,velocityX,velocityY,nextX,nextY};
};
function resetGame(){
    previousTimestamp=undefined;
    gameInProcess=false;
    mouseStartX=undefined;
    mouseStartY=undefined;
    accelerationX=undefined;
    accelerationY=undefined;
    frictionX=undefined;
    frictionY=undefined;
    mazeElement.style.cssText=`
        transform: rotateY(0deg) rotateX(0deg);
    `;
    joystickElement.style.cssText=`
        left: 0;
        top: 0;
        animation: glow;
        cursor: grab;
    `;
    if(hardMode){
        noteElement.innerHTML=`
            Click The joystick to start!
            <p>Hard mode, to back to easy mode press E</p>
        `;
    }else{
        noteElement.innerHTML=`
            Click The joystick to start!
            <p>To har mode press H</p>
        `;
    }
    noteElement.style.opacity=1;
    balls=[
        {column:0,row:0},
        {column: 9, row: 0},
        {column: 0, row: 8},
        {column: 9, row: 8}
    ].map((ball)=>({
        x: ball.column*(wallW+pathW)+(wallW+pathW)/2,
        y: ball.row*(wallW+pathW)+(wallW+pathW)/2,
        velocityX: 0,
        velocityY: 0,
    }));
};
resetGame();
joystickElement.addEventListener("mousedown", function (event) {
    mouseStartX=event.clientX;
    mouseStartY=event.clientY;
    joystickElement.style.cursor="grabbing";
    window.requestAnimationFrame(main);
    joystickHeadElement.style.cssText=`
        animation: none;
        cursor: grabbing;
    `;
});
window.addEventListener("mousemove", function (event) {
    const mouseDeltaX = -Math.minmax(mouseStartX - event.clientX, 15);
    const mouseDeltaY = -Math.minmax(mouseStartY - event.clientY, 15);
    joystickHeadElement.style.cssText=`
        left: ${mouseDeltaX}px;
        top: ${mouseDeltaY}px;
        animation: none;
        cursor: grabbing;
    `;
    const rotationY = mouseDeltaX * 1;
    const rotationX = mouseDeltaY * 1;
    mazeElement.style.cssText=`
        transform: rotateY(${rotationY}deg) rotateX(${rotationX}deg);
    `;
    const gravity=2;
    const friction=0.1;
    accelerationX=gravity*Math.sin(rotationY*Math.PI/180);
    accelerationY=gravity*Math.sin(rotationX*Math.PI/180);
    frictionX=friction*Math.cos(rotationY*Math.PI/180);
    frictionY=friction*Math.cos(rotationX*Math.PI/180);
})
function main(timestamp){
    if(!gameInProcess) return;
    if(previousTimestamp===undefined){
        previousTimestamp=timestamp;
        window.requestAnimationFrame(main);
        return;
    }
    const maxVelocity=1.5;
    const timeElapsed=(timestamp-previousTimestamp)/15;
    if(!gameInProcess){
        try{
            if(accelerationX!==undefined&&accelerationY!==undefined){
                const velocityChangeX=accelerationX
                balls.forEach((ball)=>{
                    console.log(ball.x);
                    ball.nextX=ball.x+ball.velocityX;
                    ball.nextY=ball.y+ball.velocityY;
                    walls.forEach((wall,wi)=>{
                        const wallStart={
                            x:wall.x,
                            y:wall.y
                        }
                        const closest=closestCanbe(wallStart,{
                            x:ball.nextX,
                            y:ball.nextY
                        });
                    })
                })
            }
        }catch(error){
            console.error(error);
        }
    }
}
window.requestAnimationFrame(main);