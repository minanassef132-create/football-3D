const loading = document.querySelector('#loading');
function showError(error) {
  console.error('Football 3D startup error:', error);
  loading.style.display = 'grid';
  loading.style.background = '#071b12';
  loading.style.color = '#fff';
  loading.style.padding = '24px';
  loading.style.textAlign = 'center';
  loading.style.direction = 'rtl';
  loading.style.zIndex = '1000';
  loading.textContent = 'تعذر تشغيل الملعب: ' + (error?.message || String(error)) + ' — أرسل هذه الرسالة للدعم.';
}

async function startGame() {
  try {
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87b9d8);
    scene.fog = new THREE.Fog(0x87b9d8, 45, 100);
    const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 200);
    camera.position.set(0, 22, 30); camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = false;
    renderer.domElement.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;z-index:0';
    document.body.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x31552a, 2));
    const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(-8, 20, 12); scene.add(sun);
    const material = color => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const white = material(0xffffff), green = material(0x16a34a), blue = material(0x2563eb), black = material(0x17202a);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(34, 54), material(0x187a36));
    grass.rotation.x = -Math.PI / 2; scene.add(grass);
    for (let z = -24; z < 27; z += 6) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(34, 6), material(z % 12 ? 0x187a36 : 0x1c853c));
      stripe.rotation.x = -Math.PI / 2; stripe.position.set(0, 0.01, z); scene.add(stripe);
    }
    function line3(x1, z1, x2, z2) {
      const dx = x2 - x1, dz = z2 - z1;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, Math.hypot(dx, dz)), white);
      mesh.position.set((x1 + x2) / 2, 0.035, (z1 + z2) / 2); mesh.rotation.y = Math.atan2(dx, dz); scene.add(mesh);
    }
    line3(-17,-27,17,-27); line3(-17,27,17,27); line3(-17,-27,-17,27); line3(17,-27,17,27); line3(-17,0,17,0);
    const centerCircle = new THREE.Mesh(new THREE.RingGeometry(4.8, 4.95, 64), white);
    centerCircle.rotation.x = -Math.PI / 2; centerCircle.position.y = 0.04; scene.add(centerCircle);
    function addBox(w,h,d,x,y,z,mat) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat); mesh.position.set(x,y,z); scene.add(mesh); return mesh;
    }
    for (const z of [-26.2, 26.2]) {
      addBox(7,2.5,.25,0,1.25,z,white); addBox(.18,2.5,.18,-3.5,1.25,z,white);
      addBox(.18,2.5,.18,3.5,1.25,z,white); addBox(7,.18,.18,0,2.5,z,white);
    }
    function makePlayer(team, x, z) {
      const group = new THREE.Group();
      const shirt = new THREE.Mesh(new THREE.CylinderGeometry(.42,.5,.85,12), team); shirt.position.y = 1.35; group.add(shirt);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.24,12,10), material(0xd6a77a)); head.position.y = 2; group.add(head);
      for (const side of [-1,1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.18,.8,.2), black); leg.position.set(side*.18,.45,0); group.add(leg); }
      group.position.set(x,0,z); scene.add(group); return group;
    }
    const players = [];
    for (let i=0;i<5;i++) { players.push(makePlayer(green,-8+i*4,8+Math.random()*7)); players.push(makePlayer(blue,-8+i*4,-8-Math.random()*7)); }
    const user = makePlayer(green,0,12); players.push(user);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.38,20,16), white); ball.position.set(0,.4,8); scene.add(ball);
    const ballVelocity = new THREE.Vector3(), move = new THREE.Vector2();
    let paused = false, seconds = 0, scoreA = 0, scoreB = 0;
    const score = document.querySelector('#score'), clock = document.querySelector('#clock');
    function kick(power) {
      const direction = new THREE.Vector3(-Math.sin(user.rotation.y),0,-Math.cos(user.rotation.y));
      ballVelocity.copy(direction.multiplyScalar(power)); ballVelocity.y = power * .22;
      ball.position.set(user.position.x,.4,user.position.z-1);
    }
    document.querySelector('#shoot').onclick = () => kick(.65);
    document.querySelector('#pass').onclick = () => kick(.34);
    document.querySelector('#switch').onclick = () => user.position.set((Math.random()-.5)*8,0,10);
    document.querySelector('#pause').onclick = event => { paused = !paused; event.currentTarget.textContent = paused ? 'استكمال' : 'إيقاف'; };
    const area = document.querySelector('#stickArea'), knob = document.querySelector('#stick'); let pointer = null;
    area.addEventListener('pointerdown', event => { pointer = event.pointerId; area.setPointerCapture(pointer); setStick(event); });
    area.addEventListener('pointermove', event => { if (event.pointerId === pointer) setStick(event); });
    function setStick(event) {
      const rect = area.getBoundingClientRect(), x = event.clientX-rect.left-rect.width/2, y = event.clientY-rect.top-rect.height/2;
      const length = Math.hypot(x,y), scale = Math.min(1,48/(length||1)); move.set(x*scale/48,-y*scale/48);
      knob.style.left = (33+x*scale)+'px'; knob.style.top = (33+y*scale)+'px';
    }
    function release() { pointer=null; move.set(0,0); knob.style.left='33px'; knob.style.top='33px'; }
    area.addEventListener('pointerup',release); area.addEventListener('pointercancel',release);
    addEventListener('keydown',event => { if(event.key==='ArrowLeft')move.x=-1; if(event.key==='ArrowRight')move.x=1; if(event.key==='ArrowUp')move.y=1; if(event.key==='ArrowDown')move.y=-1; if(event.key===' ')kick(.55); });
    let last = performance.now();
    function animate(now) {
      requestAnimationFrame(animate); const dt=Math.min((now-last)/1000,.04); last=now;
      if(!paused) {
        seconds+=dt; clock.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(Math.floor(seconds%60)).padStart(2,'0');
        user.position.x=THREE.MathUtils.clamp(user.position.x+move.x*dt*8,-16,16);
        user.position.z=THREE.MathUtils.clamp(user.position.z-move.y*dt*8,-25,25);
        if(move.length()>.1)user.rotation.y=Math.atan2(-move.x,-move.y);
        for(const p of players){if(p===user)continue;const dx=ball.position.x-p.position.x,dz=ball.position.z-p.position.z,distance=Math.hypot(dx,dz);if(distance>1.5&&distance<12){p.position.x+=dx/distance*dt*1.3;p.position.z+=dz/distance*dt*1.3;}}
        ball.position.addScaledVector(ballVelocity,dt*60); ballVelocity.y-=.018*dt*60; ball.position.y+=ballVelocity.y*dt*60;
        if(ball.position.y<.38){ball.position.y=.38;ballVelocity.y*=-.42;} ballVelocity.multiplyScalar(Math.pow(.985,dt*60));
        if(Math.abs(ball.position.x)>16)ballVelocity.x*=-.7;
        if(Math.abs(ball.position.z)>26){if(Math.abs(ball.position.x)<3.5){if(ball.position.z<0)scoreA++;else scoreB++;score.textContent='الأخضر '+scoreA+' - '+scoreB+' الأزرق';ball.position.set(0,.4,0);ballVelocity.set(0,0,0);}else ballVelocity.z*=-.7;}
      }
      camera.position.lerp(new THREE.Vector3(user.position.x*.35,19,user.position.z+21),.04); camera.lookAt(user.position.x*.35,0,user.position.z-3);
      renderer.render(scene,camera); if(loading.style.display!=='none')loading.style.display='none';
    }
    addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
    requestAnimationFrame(animate);
  } catch(error) { showError(error); }
}
startGame();
