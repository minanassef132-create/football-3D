
(async function () {
  const loading = document.querySelector("#loading");

  function showError(message) {
    console.error(message);
    if (loading) {
      loading.style.display = "grid";
      loading.innerHTML = `
        <div style="color:white;text-align:center;padding:20px">
          <h2>حصل خطأ في تشغيل اللعبة</h2>
          <p>${message}</p>
          <button onclick="location.reload()">إعادة المحاولة</button>
        </div>`;
    }
  }

  try {
    const THREE = await import(
      "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"
    );

    const $ = (id) => document.getElementById(id);

    const stickArea = $("stickArea");
    const stick = $("stick");
    const passBtn = $("pass");
    const shootBtn = $("shoot");
    const pauseBtn = $("pause");
    const switchBtn = $("switch");
    const clockEl = $("clock");

    // المشهد
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8bc8ee);
    scene.fog = new THREE.Fog(0x8bc8ee, 65, 115);

    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.zIndex = "0";
    document.body.appendChild(renderer.domElement);

    // الإضاءة
    scene.add(new THREE.HemisphereLight(0xffffff, 0x477047, 2));

    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(-15, 30, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    // الملعب
    const field = new THREE.Mesh(
      new THREE.PlaneGeometry(32, 54),
      new THREE.MeshStandardMaterial({ color: 0x278b43 })
    );

    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    scene.add(field);

    const lineMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });

    function line(x1, z1, x2, z2, thickness = 0.09) {
      const length = Math.hypot(x2 - x1, z2 - z1);

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(length, 0.035, thickness),
        lineMaterial
      );

      mesh.position.set(
        (x1 + x2) / 2,
        0.035,
        (z1 + z2) / 2
      );

      mesh.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
      scene.add(mesh);
    }

    line(-16, -27, 16, -27);
    line(-16, 27, 16, 27);
    line(-16, -27, -16, 27);
    line(16, -27, 16, 27);
    line(-16, 0, 16, 0);

    const circle = new THREE.Mesh(
      new THREE.RingGeometry(4.8, 4.9, 64),
      lineMaterial
    );

    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.045;
    scene.add(circle);

    // مناطق الجزاء
    for (const side of [-1, 1]) {
      const z = side * 22.2;

      line(-8, z, 8, z);
      line(-8, z, -8, side * 27);
      line(8, z, 8, side * 27);
    }

    // المرميان
    function createGoal(z) {
      const group = new THREE.Group();

      const white = new THREE.MeshStandardMaterial({
        color: 0xffffff
      });

      function post(x, y, zz, w, h, d) {
        const p = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, d),
          white
        );

        p.position.set(x, y, zz);
        p.castShadow = true;
        group.add(p);
      }

      post(-3.7, 1.25, z, 0.18, 2.5, 0.18);
      post(3.7, 1.25, z, 0.18, 2.5, 0.18);
      post(0, 2.5, z, 7.5, 0.18, 0.18);

      const net = new THREE.Mesh(
        new THREE.BoxGeometry(7.3, 2.3, 1.5),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          wireframe: true,
          transparent: true,
          opacity: 0.35
        })
      );

      net.position.set(0, 1.2, z + (z > 0 ? 0.7 : -0.7));
      group.add(net);

      scene.add(group);
    }

    createGoal(-27);
    createGoal(27);

    // اللاعبين
    function createPlayer(color, x, z, isKeeper = false) {
      const group = new THREE.Group();

      const shirt = new THREE.MeshStandardMaterial({ color });
      const shorts = new THREE.MeshStandardMaterial({
        color: isKeeper ? 0x222222 : 0x17233b
      });
      const skin = new THREE.MeshStandardMaterial({
        color: 0xe6ad82
      });

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.5, 1.05, 12),
        shirt
      );

      body.position.y = 1.25;
      body.castShadow = true;
      group.add(body);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.29, 16, 12),
        skin
      );

      head.position.y = 2.05;
      head.castShadow = true;
      group.add(head);

      const legs = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.45, 0.45),
        shorts
      );

      legs.position.y = 0.52;
      group.add(legs);

      const footMaterial = new THREE.MeshStandardMaterial({
        color: 0x171717
      });

      for (const side of [-1, 1]) {
        const foot = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.16, 0.42),
          footMaterial
        );

        foot.position.set(side * 0.2, 0.15, -0.03);
        group.add(foot);
      }

      group.position.set(x, 0, z);
      scene.add(group);

      return {
        mesh: group,
        x,
        z,
        vx: 0,
        vz: 0,
        isKeeper,
        homeX: x,
        homeZ: z
      };
    }

    const user = createPlayer(0x1464dc, 0, 9);

    const teammates = [
      createPlayer(0x1464dc, -8, 1),
      createPlayer(0x1464dc, 8, 1),
      createPlayer(0x1464dc, -5, -9),
      createPlayer(0x1464dc, 5, -9)
    ];

    const opponents = [
      createPlayer(0xe52b35, -7, -5),
      createPlayer(0xe52b35, 7, -5),
      createPlayer(0xe52b35, -4, -15),
      createPlayer(0xe52b35, 4, -15),
      createPlayer(0xe52b35, 0, -19)
    ];

    const keepers = [
      createPlayer(0xf2cf22, 0, -24.7, true),
      createPlayer(0xf2cf22, 0, 24.7, true)
    ];

    // الكرة
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 24, 20),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.65
      })
    );

    ball.position.set(0, 0.32, 8);
    ball.castShadow = true;
    scene.add(ball);

    const ballVelocity = new THREE.Vector3();
    const moveDirection = new THREE.Vector3(0, 0, -1);

    // بيانات المباراة
    let possession = user;
    let selectedPlayer = user;
    let paused = false;
    let gameTime = 90;
    let blueScore = 0;
    let redScore = 0;
    let lastTime = performance.now();

    let shotCooldown = 0;
    let joystickX = 0;
    let joystickY = 0;
    let joystickActive = false;

    // منع تكرار تصدي الحارس
    const keeperCooldown = [0, 0];

    const keys = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    // تحديث اللاعبين
    function syncPlayer(p) {
      p.mesh.position.set(p.x, 0, p.z);
    }

    function clampPlayer(p) {
      p.x = THREE.MathUtils.clamp(p.x, -15.2, 15.2);
      p.z = THREE.MathUtils.clamp(p.z, -25.2, 25.2);
    }

    // استحواذ الكرة
    function takeBall(player = user) {
      possession = player;
      selectedPlayer = player;
      ballVelocity.set(0, 0, 0);
    }

    // استرجاع الكرة بأمان
    function recoverBall() {
      takeBall(user);

      ball.position.set(
        user.x,
        0.32,
        user.z - 0.8
      );

      ball.rotation.set(0, 0, 0);
    }

    // اتجاه الحركة
    function getInputDirection() {
      let x = joystickX;
      let z = joystickY;

      if (keys.left) x -= 1;
      if (keys.right) x += 1;
      if (keys.up) z -= 1;
      if (keys.down) z += 1;

      const direction = new THREE.Vector3(x, 0, z);

      if (direction.length() > 1) {
        direction.normalize();
      }

      return direction;
    }

    // لوحة المفاتيح
    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();

      if (key === "arrowup" || key === "w") keys.up = true;
      if (key === "arrowdown" || key === "s") keys.down = true;
      if (key === "arrowleft" || key === "a") keys.left = true;
      if (key === "arrowright" || key === "d") keys.right = true;
    });

    window.addEventListener("keyup", (e) => {
      const key = e.key.toLowerCase();

      if (key === "arrowup" || key === "w") keys.up = false;
      if (key === "arrowdown" || key === "s") keys.down = false;
      if (key === "arrowleft" || key === "a") keys.left = false;
      if (key === "arrowright" || key === "d") keys.right = false;
    });

    // عصا التحكم
    function resetStick() {
      joystickX = 0;
      joystickY = 0;
      joystickActive = false;

      if (stick) {
        stick.style.transform = "translate(0px, 0px)";
      }
    }

    if (stickArea) {
      stickArea.addEventListener("pointerdown", (e) => {
        joystickActive = true;
        stickArea.setPointerCapture(e.pointerId);
        moveStick(e);
      });

      stickArea.addEventListener("pointermove", (e) => {
        if (joystickActive) moveStick(e);
      });

      stickArea.addEventListener("pointerup", resetStick);
      stickArea.addEventListener("pointercancel", resetStick);
    }

    function moveStick(e) {
      if (!stickArea) return;

      const rect = stickArea.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      let dx = e.clientX - cx;
      let dy = e.clientY - cy;

      const max = Math.min(rect.width, rect.height) * 0.32;
      const distance = Math.hypot(dx, dy);

      if (distance > max) {
        dx = dx / distance * max;
        dy = dy / distance * max;
      }

      joystickX = dx / max;
      joystickY = dy / max;

      if (stick) {
        stick.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    }

    // المراوغة
    function updateDribble() {
      if (!possession) return;

      const p = possession;
      const direction = moveDirection.clone();

      if (direction.length() < 0.1) {
        direction.set(0, 0, -1);
      }

      const speed = Math.hypot(p.vx, p.vz);
      const distance = speed > 0.3 ? 0.95 : 0.72;

      const targetX = p.x + direction.x * distance;
      const targetZ = p.z + direction.z * distance;

      ball.position.x += (targetX - ball.position.x) * 0.32;
      ball.position.z += (targetZ - ball.position.z) * 0.32;

      ball.position.y =
        0.32 + Math.abs(Math.sin(performance.now() * 0.012)) * 0.035;
    }

    // التمرير
    function passBall() {
      if (paused) return;

      // لا نسرق الكرة من الخصم
      if (possession !== user) return;

      let target = null;
      let bestScore = Infinity;

      for (const mate of teammates) {
        const dx = mate.x - user.x;
        const dz = mate.z - user.z;
        const distance = Math.hypot(dx, dz);

        const score = distance + (dz > 1 ? 9 : 0);

        if (score < bestScore) {
          bestScore = score;
          target = mate;
        }
      }

      if (!target) return;

      const direction = new THREE.Vector3(
        target.x - user.x,
        0,
        target.z - user.z
      ).normalize();

      possession = null;

      ball.position.y = 0.4;

      ballVelocity.set(
        direction.x * 10,
        2,
        direction.z * 10
      );
    }

    // التسديد
    function shootBall() {
      if (paused || shotCooldown > 0) return;

      // لا تسديد إذا كانت الكرة مع الخصم أو الحارس
      if (possession !== user) return;

      const direction = moveDirection.clone();

      if (direction.length() < 0.1) {
        direction.set(0, 0, -1);
      }

      direction.normalize();

      possession = null;
      ball.position.y = 0.4;

      ballVelocity.set(
        direction.x * 17,
        4.0,
        direction.z * 17
      );

      shotCooldown = 0.6;
    }

    // الأزرار
    if (passBtn) {
      passBtn.addEventListener("click", passBall);
    }

    if (shootBtn) {
      shootBtn.addEventListener("click", shootBall);
    }

    if (switchBtn) {
      switchBtn.addEventListener("click", recoverBall);
    }

    if (pauseBtn) {
      pauseBtn.addEventListener("click", () => {
        paused = !paused;
        pauseBtn.textContent = paused ? "▶" : "Ⅱ";
      });
    }

    // زملاء الفريق
    function updateTeammates(dt) {
      teammates.forEach((mate) => {
        let tx = mate.homeX;
        let tz = mate.homeZ;

        if (possession === user) {
          tz -= 1.5;
        } else if (possession && opponents.includes(possession)) {
          tx += (ball.position.x - tx) * 0.12;
          tz += (ball.position.z - tz) * 0.12;
        }

        if (mate === possession) {
          tx = mate.x;
          tz = mate.z;
        }

        mate.x += (tx - mate.x) * Math.min(1, dt * 1.8);
        mate.z += (tz - mate.z) * Math.min(1, dt * 1.8);

        clampPlayer(mate);
        syncPlayer(mate);
      });
    }

    // الخصم
    function updateOpponents(dt) {
      opponents.forEach((enemy, i) => {
        let targetX = ball.position.x;
        let targetZ = ball.position.z;

        if (possession && opponents.includes(possession)) {
          targetX = user.x;
          targetZ = user.z;
        }

        if (i > 1) {
          targetX += i % 2 ? -3 : 3;
          targetZ += 2.5;
        }

        const dx = targetX - enemy.x;
        const dz = targetZ - enemy.z;
        const distance = Math.hypot(dx, dz);

        if (distance > 0.8) {
          const speed = 4.0;

          enemy.x += dx / distance * speed * dt;
          enemy.z += dz / distance * speed * dt;
        }

        clampPlayer(enemy);
        syncPlayer(enemy);

        // افتكاك الكرة من اللاعب
        if (
          possession === user &&
          Math.hypot(enemy.x - user.x, enemy.z - user.z) < 1.0
        ) {
          if (Math.random() < 0.012) {
            takeBall(enemy);
          }
        }

        // التقاط الكرة الحرة
        if (
          !possession &&
          Math.hypot(
            enemy.x - ball.position.x,
            enemy.z - ball.position.z
          ) < 0.9
        ) {
          if (Math.random() < 0.04) {
            takeBall(enemy);
          }
        }
      });
    }

    // الحراس
    function updateKeepers(dt) {
      keepers.forEach((keeper, index) => {
        const goalZ = index === 0 ? -24.7 : 24.7;

        keeperCooldown[index] = Math.max(
          0,
          keeperCooldown[index] - dt
        );

        const targetX = THREE.MathUtils.clamp(
          ball.position.x,
          -3,
          3
        );

        keeper.x += (targetX - keeper.x) * Math.min(1, dt * 3);
        keeper.z += (goalZ - keeper.z) * Math.min(1, dt * 3);

        syncPlayer(keeper);

        if (possession) return;
        if (keeperCooldown[index] > 0) return;

        const nearGoal = Math.abs(ball.position.z - goalZ) < 1.35;
        const nearKeeper = Math.abs(ball.position.x - keeper.x) < 1.55;
        const lowEnough = ball.position.y < 2.7;

        // الحارس لا يتصدى إلا إذا كانت الكرة متجهة لمرماه
        const movingTowardGoal =
          index === 0
            ? ballVelocity.z < -0.5
            : ballVelocity.z > 0.5;

        if (
          nearGoal &&
          nearKeeper &&
          lowEnough &&
          movingTowardGoal
        ) {
          // إبعاد الكرة إلى داخل الملعب
          ball.position.z = index === 0
            ? goalZ + 1.2
            : goalZ - 1.2;

          const side = ball.position.x - keeper.x;

          ballVelocity.x = THREE.MathUtils.clamp(
            side * 2.2,
            -4.5,
            4.5
          );

          ballVelocity.z = index === 0 ? 6.5 : -6.5;
          ballVelocity.y = 2.4;

          // منع تكرار التصدي لنفس الكرة
          keeperCooldown[index] = 0.85;
        }
      });
    }

    // تسجيل الأهداف
    function checkGoal() {
      if (
        Math.abs(ball.position.x) < 3.6 &&
        ball.position.y < 2.5 &&
        ball.position.y > 0 &&
        ball.position.z < -26.5
      ) {
        blueScore++;
        resetAfterGoal();
        return true;
      }

      if (
        Math.abs(ball.position.x) < 3.6 &&
        ball.position.y < 2.5 &&
        ball.position.y > 0 &&
        ball.position.z > 26.5
      ) {
        redScore++;
        resetAfterGoal();
        return true;
      }

      return false;
    }

    function resetAfterGoal() {
      possession = user;
      selectedPlayer = user;

      user.x = 0;
      user.z = 9;
      user.vx = 0;
      user.vz = 0;

      teammates.forEach((p) => {
        p.x = p.homeX;
        p.z = p.homeZ;
        p.vx = 0;
        p.vz = 0;
        syncPlayer(p);
      });

      opponents.forEach((p) => {
        p.x = p.homeX;
        p.z = p.homeZ;
        p.vx = 0;
        p.vz = 0;
        syncPlayer(p);
      });

      ballVelocity.set(0, 0, 0);
      ball.position.set(0, 0.32, 8);
      ball.rotation.set(0, 0, 0);

      keeperCooldown[0] = 0;
      keeperCooldown[1] = 0;

      syncPlayer(user);

      const score = $("score");
      if (score) {
        score.textContent = `${blueScore} - ${redScore}`;
      }
    }

    // فحص سلامة الكرة
    function ballIsInvalid() {
      return (
        !Number.isFinite(ball.position.x) ||
        !Number.isFinite(ball.position.y) ||
        !Number.isFinite(ball.position.z) ||
        !Number.isFinite(ballVelocity.x) ||
        !Number.isFinite(ballVelocity.y) ||
        !Number.isFinite(ballVelocity.z)
      );
    }

    // الكرة الحرة
    function updateFreeBall(dt) {
      if (possession) return;

      if (ballIsInvalid()) {
        recoverBall();
        return;
      }

      ballVelocity.y -= 9.8 * dt;

      ball.position.x += ballVelocity.x * dt;
      ball.position.y += ballVelocity.y * dt;
      ball.position.z += ballVelocity.z * dt;

      // مقاومة الهواء والأرض
      const friction = Math.pow(0.985, dt * 60);

      ballVelocity.x *= friction;
      ballVelocity.z *= friction;

      // ارتداد الكرة عن الأرض
      if (ball.position.y < 0.32) {
        ball.position.y = 0.32;
        ballVelocity.y *= -0.42;

        if (Math.abs(ballVelocity.y) < 1.0) {
          ballVelocity.y = 0;
        }

        ballVelocity.x *= 0.92;
        ballVelocity.z *= 0.92;
      }

      // تحديد السرعة القصوى لحماية الفيزياء
      ballVelocity.x = THREE.MathUtils.clamp(
        ballVelocity.x,
        -22,
        22
      );

      ballVelocity.y = THREE.MathUtils.clamp(
        ballVelocity.y,
        -15,
        15
      );

      ballVelocity.z = THREE.MathUtils.clamp(
        ballVelocity.z,
        -22,
        22
      );

      ball.rotation.x += ballVelocity.z * dt;
      ball.rotation.z -= ballVelocity.x * dt;

      // فحص الهدف قبل إعادة الكرة
      if (checkGoal()) return;

      // الكرة تخرج من الملعب؟ نرجعها للاعب
      if (
        Math.abs(ball.position.x) > 18 ||
        Math.abs(ball.position.z) > 29 ||
        ball.position.y > 10 ||
        ball.position.y < -2
      ) {
        recoverBall();
      }
    }

    // اللاعب الأساسي
    function updateUser(dt) {
      if (possession !== user) return;

      const input = getInputDirection();

      if (input.length() > 0.05) {
        moveDirection.copy(input).normalize();

        const speed = 7.0;

        user.vx = input.x * speed;
        user.vz = input.z * speed;

        user.x += user.vx * dt;
        user.z += user.vz * dt;

        user.mesh.rotation.y = Math.atan2(
          moveDirection.x,
          moveDirection.z
        );
      } else {
        user.vx = 0;
        user.vz = 0;
      }

      clampPlayer(user);
      syncPlayer(user);
    }

    // الكاميرا
    function updateCamera(dt) {
      const target = new THREE.Vector3(
        user.x,
        8.5,
        user.z + 12.5
      );

      camera.position.lerp(
        target,
        Math.min(1, dt * 3.5)
      );

      camera.lookAt(
        user.x,
        0,
        user.z - 4
      );
    }

    // الوقت
    function updateClock(dt) {
      gameTime -= dt;

      if (gameTime < 0) {
        gameTime = 90;
      }

      if (clockEl) {
        const seconds = Math.floor(gameTime);

        clockEl.textContent =
          `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
      }
    }

    // بداية المباراة
    takeBall(user);
    ball.position.set(user.x, 0.32, user.z - 0.8);

    camera.position.set(0, 10, 22);
    camera.lookAt(0, 0, 0);

    if (loading) {
      loading.style.display = "none";
    }

    // تغيير حجم الشاشة
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(
        window.innerWidth,
        window.innerHeight
      );

      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, 1.5)
      );
    });

    // حلقة اللعبة المحمية
    function animate(now) {
      requestAnimationFrame(animate);

      try {
        const dt = Math.min(
          Math.max((now - lastTime) / 1000, 0),
          0.035
        );

        lastTime = now;

        if (!paused) {
          shotCooldown = Math.max(
            0,
            shotCooldown - dt
          );

          updateUser(dt);
          updateTeammates(dt);
          updateOpponents(dt);

          // تحديث الكرة قبل الحارس
          updateFreeBall(dt);
          updateKeepers(dt);

          updateDribble();
          updateCamera(dt);
          updateClock(dt);
        }

        renderer.render(scene, camera);

      } catch (error) {
        console.error("Game loop error:", error);

        // محاولة إنقاذ الكرة بدل توقف اللعبة
        try {
          if (ballIsInvalid()) {
            recoverBall();
          }

          renderer.render(scene, camera);
        } catch (renderError) {
          console.error("Render error:", renderError);
        }
      }
    }

    requestAnimationFrame(animate);

  } catch (error) {
    showError(error.message || "تعذر تحميل اللعبة");
  }
})();
