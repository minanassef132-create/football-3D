import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const scene=new THREE.Scene(); scene.background=new THREE.Color(0x87b9d8); scene.fog=new THREE.Fog(0x87b9d8,45,100);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,200);
camera.position.set(0,18,25);
const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.7)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=true; document.body.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x31552a,2));
const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(-8,20,12);sun.castShadow=true;scene.add(sun);
const mat=(c)=>new THREE.MeshStandardMaterial({color:c,roughness:.82});
const grass=mat(0x187a36),line=mat(0xffffff),white=mat(0xf5f5f5),green=mat(0x16a34a),blue=mat(0x2563eb),black=mat(0x17202a);
const field=new THREE.Mesh(new THREE.PlaneGeometry(34,54),grass);field.rotation.x=-Math.PI/2;field.receiveShadow=true;scene.add(field);
for(let z=-24;z<27;z+=6){const stripe=new THREE.Mesh(new THREE.PlaneGeometry(34,6),mat(z%12?0x187a36:0x1c853c));stripe.rotation.x=-Math.PI/2;stripe.position.set(0,.006,z);scene.add(stripe)}
function line3(x1,z1,x2,z2){let dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz);let m=new THREE.Mesh(new THREE.BoxGeometry(.12,.025,len),line);m.position.set((x1+x2)/2,.025,(z1+z2)/2);m.rotation.y=Math.atan2(dx,dz);scene.add(m)}
line3(-17,-27,17,-27);line3(-17,27,17,27);line3(-17,-27,-17,27);line3(17,-27,17,27);line3(-17,0,17,0);
const circle=new THREE.Mesh(new THREE.RingGeometry(4.8,4.95,64),line);circle.rotation.x=-Math.PI/2;circle.position.y=.03;scene.add(circle);
function box(w,h,d,x,y,z,material){let o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o}
for(const z of [-26.2,26.2]){box(7,2.5,.25,0,1.25,z,white);box(.18,2.5,.18,-3.5,1.25,z,white);box(.18,2.5,.18,3.5,1.25,z,white);box(7,.18,.18,0,2.5,z,white)}
function player(team,x,z){const g=new THREE.Group();const shirt=new THREE.Mesh(new THREE.CylinderGeometry(.42,.5,.85,12),team);shirt.position.y=1.35;g.add(shirt);const head=new THREE.Mesh(new THREE.SphereGeometry(.24,12,10),mat(0xd6a77a));head.position.y=2;g.add(head);for(let s of [-1,1]){let leg=new THREE.Mesh(new THREE.BoxGeometry(.18,.8,.2),black);leg.position.set(s*.18,.45,0);g.add(leg)}g.position.set(x,0,z);scene.add(g);return g}
const players=[];for(let i=0;i<5;i++){players.push(player(green,-8+i*4,8+Math.random()*7));players.push(player(blue,-8+i*4,-8-Math.random()*7))}
const user=player(green,0,12);players.push(user);
const ball=new THREE.Mesh(new THREE.SphereGeometry(.38,20,16),white);ball.position.set(0,.4,8);ball.castShadow=true;scene.add(ball);
const ballVel=new THREE.Vector3(),move=new THREE.Vector2();let paused=false,seconds=0,scoreA=0,scoreB=0;
const score=document.querySelector('#score'),clock=document.querySelector('#clock');
function kick(power){const dir=new THREE.Vector3(-Math.sin(user.rotation.y),0,-Math.cos(user.rotation.y));ballVel.copy(dir.multiplyScalar(power));ballVel.y=power*.22;ball.position.x=user.position.x;ball.position.z=user.position.z-1}
document.querySelector('#shoot').onclick=()=>kick(.65);document.querySelector('#pass').onclick=()=>kick(.34);
document.querySelector('#switch').onclick=()=>{user.position.set((Math.random()-.5)*8,0,10)};
document.querySelector('#pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'استكمال':'إيقاف'};
const area=document.querySelector('#stickArea'),knob=document.querySelector('#stick');let pointer=null;
area.addEventListener('pointerdown',e=>{pointer=e.pointerId;area.setPointerCapture(pointer);setStick(e)});
area.addEventListener('pointermove',e=>{if(e.pointerId===pointer)setStick(e)});
function setStick(e){let r=area.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,l=Math.hypot(x,y),k=Math.min(1,48/(l||1));move.set(x*k/48,-y*k/48);knob.style.left=(33+x*k)+'px';knob.style.top=(33+y*k)+'px'}
function release(){pointer=null;move.set(0,0);knob.style.left='33px';knob.style.top='33px'}
area.addEventListener('pointerup',release);area.addEventListener('pointercancel',release);
addEventListener('keydown',e=>{if(e.key==='ArrowLeft')move.x=-1;if(e.key==='ArrowRight')move.x=1;if(e.key==='ArrowUp')move.y=1;if(e.key==='ArrowDown')move.y=-1;if(e.key===' ')kick(.55)});
const clockStart=performance.now();let last=clockStart;
function animate(now){requestAnimationFrame(animate);let dt=Math.min((now-last)/1000,.04);last=now;if(!paused){seconds+=dt;let m=String(Math.floor(seconds/60)).padStart(2,'0'),s=String(Math.floor(seconds%60)).padStart(2,'0');clock.textContent=m+':'+s;
user.position.x=THREE.MathUtils.clamp(user.position.x+move.x*dt*8,-16,16);user.position.z=THREE.MathUtils.clamp(user.position.z-move.y*dt*8,-25,25);if(move.length()>.1)user.rotation.y=Math.atan2(-move.x,-move.y);
for(let p of players){if(p===user)continue;let dx=ball.position.x-p.position.x,dz=ball.position.z-p.position.z,d=Math.hypot(dx,dz);if(d>1.5&&d<12){p.position.x+=dx/d*dt*1.3;p.position.z+=dz/d*dt*1.3}}
ball.position.addScaledVector(ballVel,dt*60);ballVel.y-=.018*dt*60;ball.position.y+=ballVel.y*dt*60;if(ball.position.y<.38){ball.position.y=.38;ballVel.y*=-.42}ballVel.multiplyScalar(Math.pow(.985,dt*60));if(Math.abs(ball.position.x)>16)ballVel.x*=-.7;if(Math.abs(ball.position.z)>26){if(Math.abs(ball.position.x)<3.5){if(ball.position.z<0)scoreA++;else scoreB++;score.textContent=`الأخضر ${scoreA} - ${scoreB} الأزرق`;ball.position.set(0,.4,0);ballVel.set(0,0,0)}else ballVel.z*=-.7}
}camera.position.lerp(new THREE.Vector3(user.position.x*.35,17,user.position.z+18),.04);camera.lookAt(user.position.x*.35,0,user.position.z-3);renderer.render(scene,camera)}
requestAnimationFrame(animate);document.querySelector('#loading').style.display='none';
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
