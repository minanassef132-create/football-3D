import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const mount = document.querySelector('#game');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8dc6e8);
scene.fog = new THREE.Fog(0x8dc6e8, 42, 105);

const camera = new THREE.PerspectiveCamera(48, innerWidth/innerHeight, .1, 220);
camera.position.set(0, 17, 25);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x355c35, 2.0));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(-12, 24, 12); sun.castShadow = true;
sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;
scene.add(sun);

const field = new THREE.Mesh(new THREE.PlaneGeometry(46, 72), new THREE.MeshStandardMaterial({color:0x24834b,roughness:1}));
field.rotation.x=-Math.PI/2; field.receiveShadow=true; scene.add(field);
const lineMat = new THREE.MeshBasicMaterial({color:0xffffff});
function line(x1,z1,x2,z2,w=.12){
  const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz);
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,.025,len),lineMat);
  m.position.set((x1+x2)/2,.025,(z1+z2)/2);m.rotation.y=Math.atan2(dx,dz);scene.add(m);
}
line(-22,-35,22,-35);line(-22,35,22,35);line(-22,-35,-22,35);line(22,-35,22,35);line(-22,0,22,0);
const circle=new THREE.Mesh(new THREE.RingGeometry(8.9,9.05,64),lineMat);circle.rotation.x=-Math.PI/2;circle.position.y=.03;scene.add(circle);
const spotGeo=new THREE.CircleGeometry(.18,20);
for(const z of [-27,0,27]){const s=new THREE.Mesh(spotGeo,lineMat);s.rotation.x=-Math.PI/2;s.position.set(0,.04,z);scene.add(s)}
function box(x,y,z,sx,sy,sz,color){const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshStandardMaterial({color,roughness:.8}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m}
for(const z of [-35,35]){
  box(0,1.6,z,8,.18,.18,0xffffff);
  box(-4,1.6,z, .18,3.2,.18,0xffffff);box(4,1.6,z,.18,3.2,.18,0xffffff);
  box(0,3.15,z,8,.18,.18,0xffffff);
  box(0,1.4,z+(z<0?-.7:.7),7.8,2.8,.12,0xe8e8e8);
}

const matGreen=new THREE.MeshStandardMaterial({color:0x13a65c,roughness:.7});
const matWhite=new THREE.MeshStandardMaterial({color:0xf3f4f6,roughness:.7});
const skin=new THREE.MeshStandardMaterial({color:0xc78b62});
function makePlayer(color,x,z){
  const g=new THREE.Group();
  const shirt=new THREE.Mesh(new THREE.CapsuleGeometry(.48,.85,4,8),color);shirt.position.y=1.25;shirt.castShadow=true;g.add(shirt);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.28,14,12),skin);head.position.y=2.05;head.castShadow=true;g.add(head);
  const legMat=new THREE.MeshStandardMaterial({color:0x182536});
  for(const dx of [-.2,.2]){const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.65,3,7),legMat);leg.position.set(dx,.43,0);leg.castShadow=true;g.add(leg)}
  g.position.set(x,0,z);scene.add(g);return g;
}
const player=makePlayer(matGreen,0,10);
const teammates=[makePlayer(matGreen,-8,4),makePlayer(matGreen,8,1),makePlayer(matGreen,-5,-9),makePlayer(matGreen,5,-17)];
const opponents=[makePlayer(matWhite,-7,-5),makePlayer(matWhite,7,-7),makePlayer(matWhite,0,-14),makePlayer(matWhite,-11,13),makePlayer(matWhite,11,15)];
const ball=new THREE.Mesh(new THREE.SphereGeometry(.34,24,18),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.45}));
ball.position.set(0,.36,7);ball.castShadow=true;scene.add(ball);
const ballShadow=new THREE.Mesh(new THREE.CircleGeometry(.43,24),new THREE.MeshBasicMaterial({color:0x07130b,transparent:true,opacity:.25}));
ballShadow.rotation.x=-Math.PI/2;ballShadow.position.y=.025;scene.add(ballShadow);

let move={x:0,y:0},ballVel=new THREE.Vector3(),paused=false,score=0,active=true;
const clock=new THREE.Clock();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function reset(){player.position.set(0,0,10);ball.position.set(0,.36,7);ballVel.set(0,0,0);document.querySelector('#score').textContent=`${score} - 0`;}
function kick(power,forward=true){
  const d=new THREE.Vector3().subVectors(ball.position,player.position);d.y=0;
  if(d.length()>2.25){say('قرّب من الكرة الأول');return}
  if(d.length()<.1)d.set(0,0,-1);
  d.normalize();
  if(forward)d.lerp(new THREE.Vector3(0,0,-1),.58).normalize();
  ballVel.add(d.multiplyScalar(power));ballVel.y=Math.max(ballVel.y,.9);
  say(power>10?'تسديدة!':'تمريرة');
}
function say(t){document.querySelector('#hint').textContent=t}
document.querySelector('#shoot').addEventListener('pointerdown',e=>{e.preventDefault();kick(15)});
document.querySelector('#pass').addEventListener('pointerdown',e=>{e.preventDefault();kick(8)});
document.querySelector('#switch').addEventListener('click',()=>say('أنت تتحكم حاليًا باللاعب المحدد'));
document.querySelector('#reset').addEventListener('click',()=>{score=0;reset();say('بدأت مباراة جديدة')});
document.querySelector('#pause').addEventListener('click',e=>{paused=!paused;e.currentTarget.textContent=paused?'استكمال':'إيقاف';say(paused?'المباراة متوقفة':'استكمل اللعب')});

const area=document.querySelector('#stickArea'),stick=document.querySelector('#stick');
let pointer=null,center={x:0,y:0};
area.addEventListener('pointerdown',e=>{pointer=e.pointerId;area.setPointerCapture(pointer);const r=area.getBoundingClientRect();center={x:r.left+r.width/2,y:r.top+r.height/2};updateStick(e)});
area.addEventListener('pointermove',e=>{if(e.pointerId===pointer)updateStick(e)});
function updateStick(e){const dx=e.clientX-center.x,dy=e.clientY-center.y,len=Math.hypot(dx,dy),max=42,k=len>max?max/len:1;const x=dx*k,y=dy*k;stick.style.transform=`translate(${x}px,${y}px)`;move.x=x/max;move.y=y/max}
function release(){pointer=null;move={x:0,y:0};stick.style.transform='translate(0,0)'}
area.addEventListener('pointerup',release);area.addEventListener('pointercancel',release);

function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.035);
  if(!paused){
    const speed=8.5;
    const dir=new THREE.Vector3(move.x,0,move.y);
    if(dir.lengthSq()>.01){
      player.position.x=clamp(player.position.x+dir.x*speed*dt,-21,21);
      player.position.z=clamp(player.position.z+dir.z*speed*dt,-33,33);
      player.rotation.y=Math.atan2(dir.x,dir.z);
    }
    // Light opponent pressure and teammate spacing to make the pitch feel alive.
    opponents.forEach((p,i)=>{
      const target=ball.position;
      const dx=target.x-p.position.x,dz=target.z-p.position.z,dist=Math.hypot(dx,dz);
      if(dist>1.8){p.position.x+=dx/dist*dt*(1.0+i*.08);p.position.z+=dz/dist*dt*(1.0+i*.08)}
      p.position.x=clamp(p.position.x,-20,20);p.position.z=clamp(p.position.z,-33,33);
    });
    // Player-to-ball contact nudges the ball forward while dribbling.
    const diff=new THREE.Vector3(ball.position.x-player.position.x,0,ball.position.z-player.position.z);
    if(diff.length()<1.05 && move.y<-.12){ballVel.x+=move.x*dt*5;ballVel.z-=dt*4.5}
    ballVel.y-=19*dt;ball.position.addScaledVector(ballVel,dt);
    if(ball.position.y<.34){ball.position.y=.34;if(ballVel.y<0)ballVel.y*=-.32}
    ballVel.multiplyScalar(Math.pow(.985,dt*60));
    if(Math.abs(ball.position.x)>21.5){ball.position.x=clamp(ball.position.x,-21.5,21.5);ballVel.x*=-.55}
    if(Math.abs(ball.position.z)>35.5){ball.position.z=clamp(ball.position.z,-35.5,35.5);ballVel.z*=-.55}
    ballShadow.position.x=ball.position.x;ballShadow.position.z=ball.position.z;
    if(ball.position.z < -34.5 && Math.abs(ball.position.x)<3.8){score++;document.querySelector('#score').textContent=`${score} - 0`;say('جوووول!');reset()}
  }
  const desired=new THREE.Vector3(player.position.x*.42,16.5,player.position.z+19);
  camera.position.lerp(desired,.055);
  camera.lookAt(player.position.x*.25,0,player.position.z-3);
  renderer.render(scene,camera);
}
animate();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
document.querySelector('#loading').classList.add('hidden');
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
