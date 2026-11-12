from pathlib import Path
import zipfile

outdir = Path("/mnt/data/football_smart_ai_update")
(outdir / "src").mkdir(parents=True, exist_ok=True)

code = r"""const loading = document.querySelector('#loading');
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
    sun.position.set(-8, 20, 12);
    scene.add(sun);

    const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: .85 });
    const white = mat(0xffffff), green = mat(0x16a34a), blue = mat(0x2563eb), black = mat(0x17202a);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(34, 54), mat(0x187a36));
    grass.rotation.x = -Math.PI / 2;
    scene.add(grass);

    for (let z = -24; z < 27; z += 6) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(34, 6), mat(z % 12 ? 0x187a36 : 0x1c853c));
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, .01, z);
      scene.add(stripe);
    }

    function fieldLine(x1, z1, x2, z2) {
      const dx = x2 - x1, dz = z2 - z1;
      const m = new THREE.Mesh(new THREE.BoxGeometry(.12, .025, Math.hypot(dx, dz)), white);
      m.position.set((x1 + x2) / 2, .035, (z1 + z2) / 2);
      m.rotation.y = Math.atan2(dx, dz);
      scene.add(m);
    }
    fieldLine(-17,-27,17,-27); fieldLine(-17,27,17,27);
    fieldLine(-17,-27,-17,27); fieldLine(17,-27,17,27); fieldLine(-17,0,17,0);

    const circle = new THREE.Mesh(new THREE.RingGeometry(4.8, 4.95, 64), white);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = .04;
    scene.add(circle);

    function addBox(w,h,d,x,y,z,material) {
      const o = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
      o.position.set(x,y,z);
      scene.add(o);
      return o;
    }
    for (const z of [-26.2, 26.2]) {
      addBox(7,2.5,.25,0,1.25,z,white);
      addBox(.18,2.5,.18,-3.5,1.25,z,white);
      addBox(.18,2.5,.18,3.5,1.25,z,white);
      addBox(7,.18,.18,0,2.5,z,white);
    }

    function makePlayer(team, x, z, side) {
      const g = new THREE.Group();
      const shirt = new THREE.Mesh(new THREE.CylinderGeometry(.42,.5,.85,12), team);
      shirt.position.y = 1.35;
      g.add(shirt);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.24,12,10), mat(0xd6a77a));
      head.position.y = 2;
      g.add(head);
      for (const s of [-1,1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(.18,.8,.2), black);
        leg.position.set(s*.18,.45,0);
        g.add(leg);
      }
      g.position.set(x,0,z);
      g.userData.side = side;
      g.userData.home = new THREE.Vector3(x,0,z);
      scene.add(g);
      return g;
    }

    const players = [];
    const teammates = [];
    const opponents = [];
    for (let i=0; i<5; i++) {
      const mate = makePlayer(green,-8+i*4,8+Math.random()*7,'green');
      const rival = makePlayer(blue,-8+i*4,-8-Math.random()*7,'blue');
      players.push(mate,rival);
      teammates.push(mate);
      opponents.push(rival);
    }
    const user = makePlayer(green,0,12,'green');
    players.push(user);
    teammates.push(user);

    const ball = new THREE.Mesh(new THREE.SphereGeometry(.38,20,16),white);
    ball.position.set(0,.4,10.8);
    scene.add(ball);

    const ballVel = new THREE.Vector3();
    const move = new THREE.Vector2();
    const forward = new THREE.Vector3(0,0,-1);
    let paused=false, seconds=0, scoreA=0, scoreB=0, hasBall=true, kickLock=0;
    let lastTouch = 'green';
    const score = document.querySelector('#score');
    const clock = document.querySelector('#clock');

    function ballNear() {
      return Math.hypot(ball.position.x-user.position.x,ball.position.z-user.position.z)<2.1;
    }
    function nearestTeammate() {
      let best=null, bestScore=Infinity;
      for (const p of teammates) {
        if (p===user) continue;
        const dx=p.position.x-user.position.x, dz=p.position.z-user.position.z;
        const distance=Math.hypot(dx,dz);
        const forwardProgress = -dz;
        const anglePenalty = (dx*forward.x + dz*forward.z) < -1 ? 5 : 0;
        const defenders = opponents.reduce((n,o)=>n+(Math.hypot(o.position.x-p.position.x,o.position.z-p.position.z)<2.2?1:0),0);
        const value=distance + anglePenalty + defenders*3 - Math.max(-3,Math.min(3,forwardProgress))*.35;
        if(value<bestScore){bestScore=value;best=p;}
      }
      return best;
    }

    function launchBall(target, power, lift=0.08) {
      const start=new THREE.Vector3(user.position.x,user.position.y+.42,user.position.z);
      const end=target.clone();
      const dir=end.sub(start);
      const distance=Math.max(1,dir.length());
      dir.normalize();
      ball.position.set(start.x+dir.x*.9,.42,start.z+dir.z*.9);
      ballVel.set(dir.x*power, lift*power, dir.z*power);
      hasBall=false;
      kickLock=.48;
      lastTouch='green';
    }

    function passBall() {
      if(!hasBall && !ballNear()) return;
      const mate=nearestTeammate();
      if(!mate){shootBall();return;}
      const target=new THREE.Vector3(mate.position.x,.4,mate.position.z);
      launchBall(target, Math.min(1.35,Math.hypot(target.x-user.position.x,target.z-user.position.z)*.12+.65), .035);
    }

    function throughBall() {
      if(!hasBall && !ballNear()) return;
      const mate=nearestTeammate();
      let target;
      if(mate) {
        const runAhead=Math.max(3,Math.min(7,Math.hypot(mate.position.x-user.position.x,mate.position.z-user.position.z)*.55));
        target=new THREE.Vector3(
          THREE.MathUtils.clamp(mate.position.x+forward.x*runAhead,-14,14),
          .4,
          THREE.MathUtils.clamp(mate.position.z+forward.z*runAhead,-23,23)
        );
      } else {
        target=new THREE.Vector3(user.position.x+forward.x*8,.4,user.position.z+forward.z*8);
      }
      launchBall(target,1.25,.055);
    }

    function shootBall() {
      if(!hasBall && !ballNear()) return;
      // Aim at the opponent goal, with a slight angle toward the center.
      const goalX=THREE.MathUtils.clamp(-user.position.x*.22,-2.2,2.2);
      const target=new THREE.Vector3(goalX,.4,-27);
      const distance=Math.hypot(target.x-user.position.x,target.z-user.position.z);
      launchBall(target,Math.max(1.55,Math.min(2.35,distance*.085)),.12);
    }

    document.querySelector('#shoot').onclick=shootBall;
    document.querySelector('#pass').onclick=passBall;
    document.querySelector('#switch').onclick=()=>{
      user.position.set((Math.random()-.5)*8,0,10);
      hasBall=ballNear();
    };
    document.querySelector('#pause').onclick=e=>{
      paused=!paused;
      e.currentTarget.textContent=paused?'استكمال':'إيقاف';
    };

    // Add a dedicated through-ball button without editing index.html.
    const throughBtn=document.createElement('button');
    throughBtn.id='throughBall';
    throughBtn.type='button';
    throughBtn.textContent='بينية';
    throughBtn.setAttribute('aria-label','تمريرة بينية');
    throughBtn.style.cssText=[
      'position:fixed','z-index:5','right:18px','bottom:142px',
      'min-width:68px','height:54px','border:2px solid rgba(255,255,255,.9)',
      'border-radius:16px','background:#f59e0b','color:#111827',
      'font-weight:800','font-size:15px','box-shadow:0 3px 10px #0005',
      'touch-action: manipulation'
    ].join(';');
    document.body.appendChild(throughBtn);
    throughBtn.addEventListener('click',throughBall);

    const area=document.querySelector('#stickArea');
    const knob=document.querySelector('#stick');
    let pointer=null;
    area.addEventListener('pointerdown',e=>{
      pointer=e.pointerId;
      area.setPointerCapture(pointer);
      setStick(e);
    });
    area.addEventListener('pointermove',e=>{if(e.pointerId===pointer)setStick(e);});
    function setStick(e) {
      const r=area.getBoundingClientRect();
      const x=e.clientX-r.left-r.width/2, y=e.clientY-r.top-r.height/2;
      const l=Math.hypot(x,y), k=Math.min(1,48/(l||1));
      move.set(x*k/48,-y*k/48);
      knob.style.left=(33+x*k)+'px';
      knob.style.top=(33+y*k)+'px';
    }
    function release() {
      pointer=null;
      move.set(0,0);
      knob.style.left='33px';
      knob.style.top='33px';
    }
    area.addEventListener('pointerup',release);
    area.addEventListener('pointercancel',release);

    addEventListener('keydown',e=>{
      if(e.key==='ArrowLeft')move.x=-1;
      if(e.key==='ArrowRight')move.x=1;
      if(e.key==='ArrowUp')move.y=1;
      if(e.key==='ArrowDown')move.y=-1;
      if(e.key===' ')shootBall();
      if(e.key.toLowerCase()==='x')passBall();
      if(e.key.toLowerCase()==='c')throughBall();
    });

    let last=performance.now();
    function animate(now) {
      requestAnimationFrame(animate);
      const dt=Math.min((now-last)/1000,.04);
      last=now;

      if(!paused) {
        seconds+=dt;
        clock.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(Math.floor(seconds%60)).padStart(2,'0');

        const moving=move.length()>.08;
        if(moving) {
          const dir=new THREE.Vector3(move.x,0,-move.y).normalize();
          forward.copy(dir);
          user.rotation.y=Math.atan2(-dir.x,-dir.z);
          user.position.x=THREE.MathUtils.clamp(user.position.x+dir.x*dt*7,-16,16);
          user.position.z=THREE.MathUtils.clamp(user.position.z+dir.z*dt*7,-25,25);
        }

        kickLock=Math.max(0,kickLock-dt);

        // Ball stays with the player only when actually controlled.
        if(hasBall || (kickLock<=0 && ballNear() && ballVel.length()<.12)) {
          hasBall=true;
          ballVel.set(0,0,0);
          const target=new THREE.Vector3(user.position.x+forward.x*.9,.4,user.position.z+forward.z*.9);
          ball.position.lerp(target,moving?Math.min(1,dt*12):Math.min(1,dt*8));
        } else {
          ball.position.addScaledVector(ballVel,dt*60);
          ballVel.y-=.018*dt*60;
          ball.position.y+=ballVel.y*dt*60;
          if(ball.position.y<.38){ball.position.y=.38;ballVel.y*=-.35;}
          ballVel.multiplyScalar(Math.pow(.985,dt*60));
          if(ballVel.length()<.025)ballVel.set(0,0,0);
        }

        // Teammates make supporting runs; opponents close down the ball.
        for(const p of players) {
          if(p===user) continue;
          const isMate=p.userData.side==='green';
          const dx=ball.position.x-p.position.x, dz=ball.position.z-p.position.z;
          const d=Math.hypot(dx,dz);
          if(!isMate && d>1.1 && d<11) {
            p.position.x+=dx/d*dt*1.05;
            p.position.z+=dz/d*dt*1.05;
          } else if(isMate) {
            const supportTarget=p.userData.home.clone();
            if(hasBall) {
              supportTarget.z-=1.8;
              supportTarget.x+=forward.x*1.2;
            }
            const sx=supportTarget.x-p.position.x, sz=supportTarget.z-p.position.z;
            const sd=Math.hypot(sx,sz);
            if(sd>1.2) {
              p.position.x+=sx/sd*dt*.7;
              p.position.z+=sz/sd*dt*.7;
            }
          }
          if(d<.82 && !isMate && ballVel.length()>.1 && kickLock<=0) {
            hasBall=false;
            kickLock=.35;
          }
        }

        if(Math.abs(ball.position.x)>16)ballVel.x*=-.7;
        if(Math.abs(ball.position.z)>26) {
          if(Math.abs(ball.position.x)<3.5) {
            if(ball.position.z<0)scoreA++;else scoreB++;
            score.textContent='الأخضر '+scoreA+' - '+scoreB+' الأزرق';
            ball.position.set(0,.4,0);
            ballVel.set(0,0,0);
            hasBall=false;
            kickLock=0;
          } else ballVel.z*=-.7;
        }
      }

      camera.position.lerp(new THREE.Vector3(user.position.x*.35,19,user.position.z+21),.06);
      camera.lookAt(user.position.x*.35,0,user.position.z-3);
      renderer.render(scene,camera);
      if(loading.style.display!=='none')loading.style.display='none';
    }

    addEventListener('resize',()=>{
      camera.aspect=innerWidth/innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth,innerHeight);
    });
    requestAnimationFrame(animate);
  } catch(error) {
    showError(error);
  }
}
startGame();
"""
(outdir / "src" / "game.js").write_text(code, encoding="utf-8")
(outdir / "تعليمات_التركيب.txt").write_text(
"""تحديث Smart Tactical AI للعبة Football 3D

يحتوي الملف على:
- تمرير تلقائي لأفضل زميل متاح.
- تمريرة بينية إلى المساحة أمام الزميل.
- تسديد موجه نحو المرمى.
- زر بينية جديد يضاف تلقائيًا داخل اللعبة دون تعديل index.html.

التركيب:
1) فك ضغط الملف.
2) افتح GitHub ثم مستودع football-3D ثم مجلد src.
3) افتح game.js واضغط القلم Edit.
4) استبدل الكود القديم بالكامل بمحتوى src/game.js من هذا التحديث.
5) اضغط Commit changes.
6) افتح اللعبة واعمل تحديثًا للصفحة.

استبدل game.js فقط. لا تغيّر index.html أو style.css أو sw.js.
""", encoding="utf-8")
zip_path = Path("/mnt/data/football_smart_tactical_ai.zip")
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    z.write(outdir / "src" / "game.js", "src/game.js")
    z.write(outdir / "تعليمات_التركيب.txt", "تعليمات_التركيب.txt")
print(f"تم إنشاء التحديث: {zip_path} ({zip_path.stat().st_size} bytes)")
        
