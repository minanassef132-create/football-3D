
const loading = document.querySelector("#loading");

function showError(error) {
  console.error(error);
  loading.textContent = "حصل خطأ في تشغيل الملعب: " + (error?.message || error);
  loading.style.display = "grid";
}

async function startGame() {
  try {
    const THREE = await import(
      "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"
    );

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x75b8e8);

    const camera = new THREE.PerspectiveCamera(
      55, innerWidth / innerHeight, 0.1, 300
    );
    camera.position.set(0, 19, 25);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x355533, 2));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(-8, 20, 12);
    sun.castShadow = true;
    scene.add(sun);

    // أرضية الملعب
    const field = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 54),
      new THREE.MeshStandardMaterial({ color: 0x238b42 })
    );
    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    scene.add(field);

    // خطوط الملعب
    function line(x1, z1, x2, z2, color = 0xffffff) {
      const points = [
        new THREE.Vector3(x1, 0.035, z1),
        new THREE.Vector3(x2, 0.035, z2)
      ];
      const obj = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color })
      );
      scene.add(obj);
    }

    line(-17, -27, 17, -27);
    line(-17, 27, 17, 27);
    line(-17, -27, -17, 27);
    line(17, -27, 17, 27);
    line(-17, 0, 17, 0);

    const circle = new THREE.Mesh(
      new THREE.RingGeometry(4.8, 4.95, 64),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.04;
    scene.add(circle);

    // منطقتا الجزاء
    function boxLine(x, z, w, h) {
      line(x, z, x + w, z);
      line(x + w, z, x + w, z + h);
      line(x + w, z + h, x, z + h);
      line(x, z + h, x, z);
    }
    boxLine(-9, -27, 18, 7);
    boxLine(-9, 20, 18, 7);

    // المرمى
    function goal(z) {
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
      for (const x of [-3.6, 3.6]) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.09, 2.5, 8), material
        );
        post.position.set(x, 1.25, z);
        scene.add(post);
      }
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 7.2, 8), material
      );
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, 2.5, z);
      scene.add(bar);
    }
    goal(-27);
    goal(27);

    // اللاعبين
    function makePlayer(color, x, z) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.58, 1.25, 12),
        new THREE.MeshStandardMaterial({ color })
      );
      body.position.y = 0.85;
      body.castShadow = true;
      group.add(body);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xf1c49b })
      );
      head.position.y = 1.65;
      group.add(head);

      group.position.set(x, 0, z);
      scene.add(group);
      return group;
    }

    const player = makePlayer(0x16b9ff, 0, 10);
    const teammates = [
      makePlayer(0x16b9ff, -7, 5),
      makePlayer(0x16b9ff, 7, 3),
      makePlayer(0x16b9ff, -5, -7),
      makePlayer(0x16b9ff, 5, -12)
    ];
    const opponents = [
      makePlayer(0xff4545, -6, -5),
      makePlayer(0xff4545, 6, -4),
      makePlayer(0xff4545, -3, -15),
      makePlayer(0xff4545, 4, -20),
      makePlayer(0xff4545, 0, -24)
    ];

    // الكرة
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    ball.position.set(0, 0.35, 9);
    ball.castShadow = true;
    scene.add(ball);

    const ballVelocity = new THREE.Vector3();
    const direction = new THREE.Vector3(0, 0, -1);
    let hasBall = true;
    let kickLock = 0;
    let paused = false;
    let elapsed = 0;

    const stickArea = document.querySelector("#stickArea");
    const stick = document.querySelector("#stick");
    let joyX = 0, joyY = 0, moving = false;

    function joystick(e) {
      const r = stickArea.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const max = 43;
      const len = Math.hypot(dx, dy) || 1;
      joyX = dx / Math.max(len, max) * Math.min(len, max) / max;
      joyY = dy / Math.max(len, max) * Math.min(len, max) / max;
      stick.style.left = (33 + joyX * 43) + "px";
      stick.style.top = (33 + joyY * 43) + "px";
      moving = true;
    }

    stickArea.addEventListener("pointerdown", e => {
      stickArea.setPointerCapture(e.pointerId);
      joystick(e);
    });
    stickArea.addEventListener("pointermove", e => {
      if (moving) joystick(e);
    });
    function stopJoy() {
      moving = false;
      joyX = joyY = 0;
      stick.style.left = "33px";
      stick.style.top = "33px";
    }
    stickArea.addEventListener("pointerup", stopJoy);
    stickArea.addEventListener("pointercancel", stopJoy);

    function nearestTeammate() {
      return teammates
        .map(p => ({
          p,
          score: p.position.distanceTo(player.position) +
            Math.max(0, p.position.z - player.position.z) * 0.5
        }))
        .sort((a, b) => a.score - b.score)[0].p;
    }

    function kick(target, power) {
      if (!hasBall || kickLock > 0) return;
      const start = player.position.clone();
      start.y = 0.35;
      ball.position.copy(start);
      const dir = target.clone().sub(start).normalize();
      ballVelocity.copy(dir.multiplyScalar(power));
      ballVelocity.y = 1.5;
      hasBall = false;
      kickLock = 0.65;
    }

    function passBall() {
      const mate = nearestTeammate();
      kick(mate.position.clone().add(new THREE.Vector3(0, 0, -0.5)), 17);
    }

    function throughBall() {
      const mate = nearestTeammate();
      const target = mate.position.clone();
      target.z -= 7;
      target.z = Math.max(-25, target.z);
      kick(target, 20);
    }

    function shootBall() {
      const target = new THREE.Vector3(
        player.position.x * -0.12, 0.5, -29
      );
      kick(target, 27);
    }

    document.querySelector("#pass").onclick = passBall;
    document.querySelector("#shoot").onclick = shootBall;

    // زر البينية
    const through = document.createElement("button");
    through.textContent = "بينية";
    through.style.background = "#ef8b16";
    through.style.position = "fixed";
    through.style.right = "20px";
    through.style.bottom = "142px";
    through.style.zIndex = "5";
    document.body.appendChild(through);
    through.onclick = throughBall;

    document.querySelector("#pause").onclick = () => {
      paused = !paused;
      document.querySelector("#pause").textContent =
        paused ? "استكمال" : "إيقاف";
    };

    document.querySelector("#switch").onclick = () => {
      const mate = nearestTeammate();
      const old = player.position.clone();
      player.position.copy(mate.position);
      mate.position.copy(old);
    };

    function clampPlayer(p) {
      p.position.x = THREE.MathUtils.clamp(p.position.x, -15.5, 15.5);
      p.position.z = THREE.MathUtils.clamp(p.position.z, -25.5, 25.5);
    }

    function animate() {
      requestAnimationFrame(animate);
      if (!paused) {
        const dt = Math.min(clock.getDelta(), 0.04);
        elapsed += dt;
        kickLock = Math.max(0, kickLock - dt);

        if (moving) {
          const speed = 9 * dt;
          player.position.x += joyX * speed;
          player.position.z += joyY * speed;
          if (Math.abs(joyX) + Math.abs(joyY) > 0.1) {
            direction.set(joyX, 0, joyY).normalize();
          }
          clampPlayer(player);
        }

        if (hasBall) {
          const target = player.position.clone()
            .add(direction.clone().multiplyScalar(1.0));
          target.y = 0.35;
          ball.position.lerp(target, 0.25);
        } else {
          ball.position.addScaledVector(ballVelocity, dt);
          ballVelocity.y -= 9.8 * dt;
          if (ball.position.y < 0.35) {
            ball.position.y = 0.35;
            ballVelocity.y *= -0.35;
            if (Math.abs(ballVelocity.y) < 0.5) ballVelocity.y = 0;
          }
          ballVelocity.multiplyScalar(0.992);

          if (kickLock <= 0 && ballVelocity.length() < 2.5 &&
              ball.position.distanceTo(player.position) < 1.5) {
            hasBall = true;
            ballVelocity.set(0, 0, 0);
          }
        }

        // حركة مبسطة للفريق المنافس
        for (const enemy of opponents) {
          const d = ball.position.clone().sub(enemy.position);
          d.y = 0;
          if (d.length() > 1.5) {
            enemy.position.add(d.normalize().multiplyScalar(2.0 * dt));
          }
          clampPlayer(enemy);
        }

        // الكاميرا تتبع اللاعب
        const camTarget = new THREE.Vector3(
          player.position.x * 0.55,
          19,
          player.position.z + 17
        );
        camera.position.lerp(camTarget, 0.045);
        camera.lookAt(player.position.x * 0.35, 0, player.position.z - 5);

        const clockEl = document.querySelector("#clock");
        const secs = Math.floor(elapsed);
        clockEl.textContent =
          String(Math.floor(secs / 60)).padStart(2, "0") + ":" +
          String(secs % 60).padStart(2, "0");
      }
      renderer.render(scene, camera);
    }

    const clock = new THREE.Clock();

    addEventListener("resize", () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    loading.style.display = "none";
    animate();

  } catch (error) {
    showError(error);
  }
}

startGame();
                     
