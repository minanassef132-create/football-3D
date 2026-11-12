const loading = document.querySelector('#loading');
function showError(error) {
  console.error(error);
  loading.style.display = 'grid';
  loading.textContent = 'تعذر تشغيل اللعبة: ' + (error?.message || String(error));
}

async function startGame() {
  try {
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87b9d8);
    scene.fog = new THREE.Fog(0x87b9d8, 55, 115);
    const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .1, 200);
    camera.position.set(0, 19, 22);
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0';
    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x31552a, 2));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(-8, 20, 12); scene.add(sun);
    const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: .85 });
    const white = mat(0xffffff), green = mat(0x16a34a), blue = mat(0x2563eb), black = mat(0x17202a);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(34, 54), mat(0x187a36));
    grass.rotation.x = -Math.PI / 2; scene.add(grass);
    for (let z = -24; z < 27; z += 6) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(34, 6), mat(z % 12 ? 0x187a36 : 0x1c853c));
      stripe.rotation.x = -Math.PI / 2; stripe.position.set(0, .01, z); scene.add(stripe);
    }
    function fieldLine(x1,z1,x2,z2) {
      const dx=x2-x1,dz=z2-z1;
      const m=new THREE.Mesh(new THREE.BoxGeometry(.12,.025,Math.hypot(dx,dz)),white);
      m.position.set((x1+x2)/2,.035,(z1+z2)/2);m.rotation.y=Math.atan2(dx,dz);scene.add(m);
    }
    fieldLine(-17,-27,17,-27);fieldLine(-17,27,17,27);fieldLine(-17,-27,-17,27);fieldLine(17,-27,17,27);fieldLine(-17,0,17,0);
    const circle=new THREE.Mesh(new THREE.RingGeometry(4.8,4.95,64),white);circle.rotation.x=-Math.PI/2;circle.position.y=.04;scene.add(circle);
    function addBox(w,h,d,x,y,z,material){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);o.position.set(x,y,z);scene.add(o);return o;}
    for(const z of [-26.2,26.2]){addBox(7,2.5,.25,0,1.25,z,white);addBox(.18,2.5,.18,-3.5,1.25,z,white);addBox(.18,2.5,.18,3.5,1.25,z,white);addBox(7,.18,.18,0,2.5,z,white);}
    function makePlayer(team,x,z){const g=new THREE.Group();const shirt=new THREE.Mesh(new THREE.CylinderGeometry(.42,.5,.85,12),team);shirt.position.y=1.35;g.add(shirt);const head=new THREE.Mesh(new THREE.SphereGeometry(.24,12,10),mat(0xd6a77a));head.position.y=2;g.add(head);for(const s of [-1,1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.18,.8,.2),black);leg.position.set(s*.18,.45,0);g.add(leg);}g.position.set(x,0,z);scene.add(g);return g;}
    const players=[];for(let i=0;i<5;i++){players.push(makePlayer(green,-8+i*4,8+Math.random()*7));players.push(makePlayer(blue,-8+i*4,-8-Math.random()*7));}
    const user=makePlayer(green,0,12);players.push(user);
    const ball=new THREE.Mesh(new THREE.SphereGeometry(.38,20,16),white);ball.position.set(0,.4,10.8);scene.add(ball);
    const ballVel=new THREE.Vector3(),move=new THREE.Vector2(),forward=new THREE.Vector3(0,0,-1);
    let paused=false,seconds=0,scoreA=0,scoreB=0,hasBall=true;
    const score=document.querySelector('#score'),clock=document.querySelector('#clock');
    function ballNear(){return Math.hypot(ball.position.x-user.position.x,ball.position.z-user.position.z)<1.9;}
    function kick(power){
      if(!hasBall && !ballNear()) return;
      hasBall=false;
      const dir=forward.clone().normalize();
      ball.position.set(user.position.x+dir.x*.95,.42,user.position.z+dir.z*.95);
      ballVel.set(dir.x*power*1.65,power*.19,dir.z*power*1.65);
    }
    document.querySelector('#shoot').onclick=()=>kick(1.35);
    document.querySelector('#pass').onclick=()=>kick(.72);
    document.querySelector('#switch').onclick=()=>{user.position.set((Math.random()-.5)*8,0,10);hasBall=ballNear();};
    document.querySelector('#pause').onclick=e=>{paused=!paused;e.currentTarget.textContent=paused?'استكمال':'إيقاف';};
    const area=document.querySelector('#stickArea'),knob=document.querySelector('#stick');let pointer=null;
    area.addEventListener('pointerdown',e=>{pointer=e.pointerId;area.setPointerCapture(pointer);setStick(e);});
    area.addEventListener('pointermove',e=>{if(e.pointerId===pointer)setStick(e);});
    function setStick(e){const r=area.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,l=Math.hypot(x,y),k=Math.min(1,48/(l||1));move.set(x*k/48,-y*k/48);knob.style.left=(33+x*k)+'px';knob.style.top=(33+y*k)+'px';}
    function release(){pointer=null;move.set(0,0);knob.style.left='33px';knob.style.top='33px';}
    area.addEventListener('pointerup',release);area.addEventListener('pointercancel',release);
    addEventListener('keydown',e=>{if(e.key==='ArrowLeft')move.x=-1;if(e.key==='ArrowRight')move.x=1;if(e.key==='ArrowUp')move.y=1;if(e.key==='ArrowDown')move.y=-1;if(e.key===' ')kick(1.1);});
    let last=performance.now();
    function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.04);last=now;
      if(!paused){seconds+=dt;clock.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(Math.floor(seconds%60)).padStart(2,'0');
        const moving=move.length()>.08;
        if(moving){const dir=new THREE.Vector3(move.x,0,-move.y).normalize();forward.copy(dir);user.rotation.y=Math.atan2(-dir.x,-dir.z);user.position.x=THREE.MathUtils.clamp(user.position.x+dir.x*dt*7,-16,16);user.position.z=THREE.MathUtils.clamp(user.position.z+dir.z*dt*7,-25,25);}
        if(hasBall || ballNear()){
          hasBall=true;ballVel.set(0,0,0);
          const target=new THREE.Vector3(user.position.x+forward.x*.9,.4,user.position.z+forward.z*.9);
          ball.position.lerp(target,moving?Math.min(1,dt*12):Math.min(1,dt*8));
        } else {
          ball.position.addScaledVector(ballVel,dt*60);ballVel.y-=.018*dt*60;ball.position.y+=ballVel.y*dt*60;
          if(ball.position.y<.38){ball.position.y=.38;ballVel.y*=-.35;}
          ballVel.multiplyScalar(Math.pow(.985,dt*60));
          if(ballVel.length()<.025)ballVel.set(0,0,0);
        }
        for(const p of players){if(p===user)continue;const dx=ball.position.x-p.position.x,dz=ball.position.z-p.position.z,d=Math.hypot(dx,dz);if(d>1.3&&d<10){p.position.x+=dx/d*dt*.8;p.position.z+=dz/d*dt*.8;}if(d<.85&&Math.abs(ballVel.x)+Math.abs(ballVel.z)>.1){hasBall=false;}}
        if(Math.abs(ball.position.x)>16)ballVel.x*=-.7;
        if(Math.abs(ball.position.z)>26){if(Math.abs(ball.position.x)<3.5){if(ball.position.z<0)scoreA++;else scoreB++;score.textContent='الأخضر '+scoreA+' - '+scoreB+' الأزرق';ball.position.set(0,.4,0);ballVel.set(0,0,0);hasBall=false;}else ballVel.z*=-.7;}
      }
      camera.position.lerp(new THREE.Vector3(user.position.x*.35,19,user.position.z+21),.06);camera.lookAt(user.position.x*.35,0,user.position.z-3);renderer.render(scene,camera);
      if(loading.style.display!=='none')loading.style.display='none';
    }
    addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
    requestAnimationFrame(animate);
  } catch(error){showError(error);}
}
startGame();
