
const loading = document.querySelector("#loading");

function showError(error) {
  console.error(error);
  if (loading) {
    loading.textContent = "خطأ في تشغيل اللعبة: " + (error?.message || error);
    loading.style.display = "grid";
  }
}

async function startGame() {
  try {
    const THREE = await import(
      "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"
    );

    // إعداد المشهد
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x80c5ed);

    const camera = new THREE.PerspectiveCamera(
      55, innerWidth / innerHeight, 0.1, 300
    );
    camera.position.set(0, 22, 28);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x34552e, 2));

    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(-10, 25, 10);
    sun.castShadow = true;
    scene.add(sun);

    // الملعب
    const field = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 54),
      new THREE.MeshStandardMaterial({ color: 0x238b42 })
    );
    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    scene.add(field);

    function line(x1, z1, x2, z2) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x1, 0.04, z1),
        new THREE.Vector3(x2, 0.04, z2)
      ]);
      scene.add(new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color: 0xffffff })
      ));
    }

    line(-17, -27, 17, -27);
    line(-17, 27, 17, 27);
    line(-17, -27, -17, 27);
    line(17, -27, 17, 27);
    line(-17, 0, 17, 0);

    const centerCircle = new THREE.Mesh(
      new THREE.RingGeometry(4.8, 4.95, 64),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
      })
    );
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.y = 0.045;
    scene.add(centerCircle);

    function penaltyBox(z, direction) {
      const a = z;
      const b = z + direction * 7;
      line(-9, a, 9, a);
      line(-9, a, -9, b);
      line(9, a, 9, b);
      line(-9, b, 9, b);
    }

    penaltyBox(-27, 1);
    penaltyBox(27, -1);

    // المرمى
    function createGoal(z) {
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff
      });

      for (const x of [-3.6, 3.6]) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 2.5, 10),
          material
        );
        post.position.set(x, 1.25, z);
        scene.add(post);
      }

      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 7.2, 10),
        material
      );
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, 2.5, z);
      scene.add(bar);

      const net = new THREE.Mesh(
        new THREE.BoxGeometry(7.2, 2.5, 1.4),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          wireframe: true,
          transparent: true,
          opacity: 0.25
        })
      );
      net.position.set(0, 1.25, z + (z < 0 ? -0.7 : 0.7));
      scene.add(net);
    }

    createGoal(-27);
    createGoal(27);

    // اللاعبين
    function makePlayer(color, x, z) {
      const group = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.55, 1.25, 12),
        new THREE.MeshStandardMaterial({ color })
      );
      body.position.y = 0.85;
      body.castShadow = true;
      group.add(body);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xf0c49c })
      );
      head.position.y = 1.65;
      group.add(head);

      const marker = new THREE.Mesh(
        new THREE.RingGeometry(0.65, 0.75, 24),
        new THREE.MeshBasicMaterial({
          color: color,
          side: THREE.DoubleSide
        })
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.y = 0.06;
      group.add(marker);

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
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.55
      })
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
    let scoreHome = 0;
    let scoreAway = 0;
    let goalCooldown = 0;

    // عصا التحكم
    const stickArea = document.querySelector("#stickArea");
    const stick = document.querySelector("#stick");

    let joyX = 0;
    let joyY = 0;
    let moving = false;

    function joystick(e) {
      if (!stickArea || !stick) return;

      const r = stickArea.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const max = 43;
      const len = Math.hypot(dx, dy) || 1;
      const scale = Math.min(len, max) / max;

      joyX = dx / len * scale;
      joyY = dy / len * scale;

      stick.style.left = (33 + joyX * 43) + "px";
      stick.style.top = (33 + joyY * 43) + "px";
      moving = true;
    }

    function stopJoy() {
      moving = false;
      joyX = 0;
      joyY = 0;

      if (stick) {
        stick.style.left = "33px";
        stick.style.top = "33px";
      }
    }

    if (stickArea) {
      stickArea.addEventListener("pointerdown", e => {
        stickArea.setPointerCapture(e.pointerId);
        joystick(e);
      });
      stickArea.addEventListener("pointermove", e => {
        if (moving) joystick(e);
      });
      stickArea.addEventListener("pointerup", stopJoy);
      stickArea.addEventListener("pointercancel", stopJoy);
    }

    function clampPlayer(p) {
      p.position.x = THREE.MathUtils.clamp(p.position.x, -15.5, 15.5);
      p.position.z = THREE.MathUtils.clamp(p.position.z, -25.5, 25.5);
    }

    // استرجاع الكرة
    function takeBall() {
      hasBall = true;
      kickLock = 0;
      ballVelocity.set(0, 0, 0);

      ball.position.set(
        player.position.x + direction.x * 1,
        0.35,
        player.position.z + direction.z * 1
      );
    }

    // اختيار الزميل الأنسب
    function nearestTeammate() {
      let best = teammates[0];
      let bestScore = Infinity;

      for (const mate of teammates) {
        const distance = mate.position.distanceTo(player.position);
        const forwardPenalty =
          mate.position.z > player.position.z ? 3 : 0;
        const score = distance + forwardPenalty;

        if (score < bestScore) {
          bestScore = score;
          best = mate;
        }
      }

      return best;
    }

    // تنفيذ الركلة
    function kick(target, power, lift) {
      if (!hasBall || kickLock > 0) return;

      ball.position.set(
        player.position.x + direction.x * 1.1,
        0.38,
        player.position.z + direction.z * 1.1
      );

      const dir = target.clone().sub(ball.position).normalize();
      ballVelocity.copy(dir.multiplyScalar(power));
      ballVelocity.y = lift;

      hasBall = false;
      kickLock = 0.65;
    }

    function passBall() {
      const mate = nearestTeammate();
      const target = mate.position.clone();
      target.y = 0.35;
      kick(target, 9.5, 0.1);
    }

    function throughBall() {
      const mate = nearestTeammate();
      const target = mate.position.clone();

      target.z -= 7;
      target.z = Math.max(-25, target.z);
      target.x = THREE.MathUtils.clamp(target.x, -14, 14);

      kick(target, 11.5, 0.25);
    }

    function shootBall() {
      const target = new THREE.Vector3(
        player.position.x * -0.12,
        0.5,
        -29
      );
      kick(target, 16, 0.55);
    }

    if (document.querySelector("#pass")) {
      document.querySelector("#pass").onclick = passBall;
    }
    if (document.querySelector("#shoot")) {
      document.querySelector("#shoot").onclick = shootBall;
    }

    // أزرار إضافية
    function addButton(id, text, right, bottom, color, action) {
      const button = document.createElement("button");
      button.id = id;
      button.textContent = text;
      Object.assign(button.style, {
        position: "fixed",
        right,
        bottom,
        zIndex: "20",
        background: color,
        color: "white",
        border: "0",
        borderRadius: "12px",
        padding: "11px 14px",
        fontWeight: "bold",
        fontSize: "14px"
      });
      document.body.appendChild(button);
      button.onclick = action;
      return button;
    }

    addButton(
      "throughButton", "بينية", "20px", "142px", "#ef8b16", throughBall
    );

    addButton(
      "recoverButton", "استرجاع الكرة", "50%", "18px", "#176bce",
      takeBall
    ).style.transform = "translateX(50%)";

    const pauseButton = document.querySelector("#pause");
    if (pauseButton) {
      pauseButton.onclick = () => {
        paused = !paused;
        pauseButton.textContent = paused ? "استكمال" : "إيقاف";
      };
    }

    const switchButton = document.querySelector("#switch");
    if (switchButton) {
      switchButton.onclick = () => {
        const mate = nearestTeammate();
        const old = player.position.clone();
        player.position.copy(mate.position);
        mate.position.copy(old);
        clampPlayer(player);
        clampPlayer(mate);
      };
    }

    // لوحة النتيجة
    const scoreBoard = document.createElement("div");
    Object.assign(scoreBoard.style, {
      position: "fixed",
      top: "12px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "10",
      background: "rgba(0,0,0,0.7)",
      color: "white",
      padding: "9px 18px",
      borderRadius: "12px",
      fontWeight: "bold",
      fontSize: "17px",
      direction: "rtl"
    });
    scoreBoard.textContent = "فريقك 0 - 0 الخصم";
    document.body.appendChild(scoreBoard);

    // ساعة المباراة
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);

      if (!paused) {
        const dt = Math.min(clock.getDelta(), 0.04);
        elapsed += dt;
        kickLock = Math.max(0, kickLock - dt);
        goalCooldown = Math.max(0, goalCooldown - dt);

        // حركة اللاعب
        if (moving) {
          player.position.x += joyX * 8 * dt;
          player.position.z += joyY * 8 * dt;

          if (Math.abs(joyX) + Math.abs(joyY) > 0.1) {
            direction.set(joyX, 0, joyY).normalize();
          }
          clampPlayer(player);
        }

        // الكرة مع اللاعب أو في الملعب
        if (hasBall) {
          const target = player.position.clone().add(
            direction.clone().multiplyScalar(1)
          );
          target.y = 0.35;
          ball.position.lerp(target, 0.3);
        } else {
          ball.position.addScaledVector(ballVelocity, dt);
          ballVelocity.y -= 9.8 * dt;

          if (ball.position.y < 0.35) {
            ball.position.y = 0.35;
            if (Math.abs(ballVelocity.y) > 0.5) {
              ballVelocity.y *= -0.22;
            } else {
              ballVelocity.y = 0;
            }
          }

          const friction = ball.position.y <= 0.351 ? 0.965 : 0.995;
          ballVelocity.x *= Math.pow(friction, dt * 60);
          ballVelocity.z *= Math.pow(friction, dt * 60);

          // إصلاح خروج الكرة: ترجع للاعب فورًا
          const outsideField =
            Math.abs(ball.position.x) > 16.2 ||
            Math.abs(ball.position.z) > 26.2;

          const invalidBall =
            !Number.isFinite(ball.position.x) ||
            !Number.isFinite(ball.position.y) ||
            !Number.isFinite(ball.position.z) ||
            ball.position.y > 8;

          if (outsideField || invalidBall) {
            takeBall();
          }

          // الاستحواذ عند الاقتراب من الكرة
          if (
            !hasBall &&
            kickLock <= 0 &&
            ball.position.distanceTo(player.position) < 1.8
          ) {
            takeBall();
          }

          // هدف
          if (
            goalCooldown <= 0 &&
            Math.abs(ball.position.z) > 26 &&
            Math.abs(ball.position.x) < 3.7
          ) {
            if (ball.position.z < 0) scoreHome++;
            else scoreAway++;

            scoreBoard.textContent =
              "فريقك " + scoreHome + " - " + scoreAway + " الخصم";

            goalCooldown = 2;
            takeBall();
          }
        }

        // حركة المنافسين نحو الكرة
        for (const enemy of opponents) {
          const d = ball.position.clone().sub(enemy.position);
          d.y = 0;

          if (d.length() > 1.5) {
            enemy.position.add(
              d.normalize().multiplyScalar(1.8 * dt)
            );
          }
          clampPlayer(enemy);
        }

        // حركة الزملاء
        for (const mate of teammates) {
          if (hasBall) {
            const target = player.position.clone();
            target.z -= 4;
            const d = target.sub(mate.position);
            d.y = 0;

            if (d.length() > 5) {
              mate.position.add(
                d.normalize().multiplyScalar(1.2 * dt)
              );
            }
          }
          clampPlayer(mate);
        }

        // كاميرا تتبع اللاعب
        const camTarget = new THREE.Vector3(
          player.position.x * 0.55,
          20,
          player.position.z + 18
        );

        camera.position.lerp(camTarget, 0.06);
        camera.lookAt(
          player.position.x * 0.35,
          0,
          player.position.z - 5
        );

        // الوقت
        const clockEl = document.querySelector("#clock");
        if (clockEl) {
          const secs = Math.floor(elapsed);
          clockEl.textContent =
            String(Math.floor(secs / 60)).padStart(2, "0") + ":" +
            String(secs % 60).padStart(2, "0");
        }
      }

      renderer.render(scene, camera);
    }

    addEventListener("resize", () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    if (loading) loading.style.display = "none";
    animate();

  } catch (error) {
    showError(error);
  }
}

startGame();
      
