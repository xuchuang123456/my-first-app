'use client';

import { useEffect, useRef, useState } from 'react';
// import { Cinzel } from 'next/font/google';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// const cinzel = Cinzel({ 
//   subsets: ['latin'],
//   weight: ['400', '700'],
//   display: 'swap',
// });

export default function ChristmasTree() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [controlsHidden, setControlsHidden] = useState(false);

  // 获取 basePath
  const basePath = process.env.__NEXT_ROUTER_BASEPATH || '';

  useEffect(() => {
    const initScene = async () => {
      
      // Configuration
      const CONFIG = {
        colors: {
          bg: 0x000000,
          champagneGold: 0xffd966,
          deepGreen: 0x03180a,
          accentRed: 0x990000,
        },
        particles: {
          count: 1500,
          dustCount: 2500,
          treeHeight: 24,
          treeRadius: 8
        },
        camera: { z: 50 }
      };

      const STATE = {
        mode: 'TREE',
        focusIndex: -1,
        focusTarget: null as any,
        hand: { detected: false, x: 0, y: 0 },
        rotation: { x: 0, y: 0 }
      };

      let scene: any, camera: any, renderer: any, composer: any;
      let mainGroup: any;
      let clock = new THREE.Clock();
      let particleSystem: any[] = [];
      let photoMeshGroup = new THREE.Group();
      let caneTexture: any;
      let handLandmarker: any;
      let lastVideoTime = -1;

      // Particle class
      class Particle {
        mesh: any;
        type: string;
        isDust: boolean;
        posTree: any;
        posScatter: any;
        baseScale: number;
        spinSpeed: any;

        constructor(mesh: any, type: string, isDust = false) {
          this.mesh = mesh;
          this.type = type;
          this.isDust = isDust;
          this.posTree = new THREE.Vector3();
          this.posScatter = new THREE.Vector3();
          this.baseScale = mesh.scale.x;

          const speedMult = (type === 'PHOTO') ? 0.3 : 2.0;
          this.spinSpeed = new THREE.Vector3(
            (Math.random() - 0.5) * speedMult,
            (Math.random() - 0.5) * speedMult,
            (Math.random() - 0.5) * speedMult
          );
          this.calculatePositions();
        }

        calculatePositions() {
          const h = CONFIG.particles.treeHeight;
          const halfH = h / 2;
          let t = Math.random();
          t = Math.pow(t, 0.8);
          const y = (t * h) - halfH;
          let rMax = CONFIG.particles.treeRadius * (1.0 - t);
          if (rMax < 0.5) rMax = 0.5;
          const angle = t * 50 * Math.PI + Math.random() * Math.PI;
          const r = rMax * (0.8 + Math.random() * 0.4);
          this.posTree.set(Math.cos(angle) * r, y, Math.sin(angle) * r);

          let rScatter = this.isDust ? (12 + Math.random() * 20) : (8 + Math.random() * 12);
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          this.posScatter.set(
            rScatter * Math.sin(phi) * Math.cos(theta),
            rScatter * Math.sin(phi) * Math.sin(theta),
            rScatter * Math.cos(phi)
          );
        }

        update(dt: number, mode: string, focusTargetMesh: any) {
          let target = this.posTree;

          if (mode === 'SCATTER') target = this.posScatter;
          else if (mode === 'FOCUS') {
            if (this.mesh === focusTargetMesh) {
              const desiredWorldPos = new THREE.Vector3(0, 2, 35);
              const invMatrix = new THREE.Matrix4().copy(mainGroup.matrixWorld).invert();
              target = desiredWorldPos.applyMatrix4(invMatrix);
            } else {
              target = this.posScatter;
            }
          }

          const lerpSpeed = (mode === 'FOCUS' && this.mesh === focusTargetMesh) ? 5.0 : 2.0;
          this.mesh.position.lerp(target, lerpSpeed * dt);

          if (mode === 'SCATTER') {
            this.mesh.rotation.x += this.spinSpeed.x * dt;
            this.mesh.rotation.y += this.spinSpeed.y * dt;
            this.mesh.rotation.z += this.spinSpeed.z * dt;
          } else if (mode === 'TREE') {
            this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, 0, dt);
            this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, 0, dt);
            this.mesh.rotation.y += 0.5 * dt;
          }

          if (mode === 'FOCUS' && this.mesh === focusTargetMesh) {
            this.mesh.lookAt(camera.position);
          }

          let s = this.baseScale;
          if (this.isDust) {
            s = this.baseScale * (0.8 + 0.4 * Math.sin(clock.elapsedTime * 4 + this.mesh.id));
            if (mode === 'TREE') s = 0;
          } else if (mode === 'SCATTER' && this.type === 'PHOTO') {
            s = this.baseScale * 2.5;
          } else if (mode === 'FOCUS') {
            if (this.mesh === focusTargetMesh) s = 4.5;
            else s = this.baseScale * 0.8;
          }

          this.mesh.scale.lerp(new THREE.Vector3(s, s, s), 4 * dt);
        }
      }

      function initThree() {
        if (!containerRef.current) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(CONFIG.colors.bg);
        scene.fog = new THREE.FogExp2(CONFIG.colors.bg, 0.01);

        camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 2, CONFIG.camera.z);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ReinhardToneMapping;
        renderer.toneMappingExposure = 2.2;
        containerRef.current.appendChild(renderer.domElement);

        mainGroup = new THREE.Group();
        scene.add(mainGroup);
      }

      function setupEnvironment() {
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      }

      function setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);

        const innerLight = new THREE.PointLight(0xffaa00, 2, 20);
        innerLight.position.set(0, 5, 0);
        mainGroup.add(innerLight);

        const spotGold = new THREE.SpotLight(0xffcc66, 1200);
        spotGold.position.set(30, 40, 40);
        spotGold.angle = 0.5;
        spotGold.penumbra = 0.5;
        scene.add(spotGold);

        const spotBlue = new THREE.SpotLight(0x6688ff, 600);
        spotBlue.position.set(-30, 20, -30);
        scene.add(spotBlue);

        const fill = new THREE.DirectionalLight(0xffeebb, 0.8);
        fill.position.set(0, 0, 50);
        scene.add(fill);
      }

      function setupPostProcessing() {
        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          1.5, 0.4, 0.85
        );
        bloomPass.threshold = 0.7;
        bloomPass.strength = 0.45;
        bloomPass.radius = 0.4;

        composer = new EffectComposer(renderer);
        composer.addPass(renderScene);
        composer.addPass(bloomPass);
      }

      function createTextures() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#880000';
        ctx.beginPath();
        for (let i = -128; i < 256; i += 32) {
          ctx.moveTo(i, 0);
          ctx.lineTo(i + 32, 128);
          ctx.lineTo(i + 16, 128);
          ctx.lineTo(i - 16, 0);
        }
        ctx.fill();
        caneTexture = new THREE.CanvasTexture(canvas);
        caneTexture.wrapS = THREE.RepeatWrapping;
        caneTexture.wrapT = THREE.RepeatWrapping;
        caneTexture.repeat.set(3, 3);
      }

      function createParticles() {
        const sphereGeo = new THREE.SphereGeometry(0.5, 32, 32);
        const boxGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, -0.5, 0),
          new THREE.Vector3(0, 0.3, 0),
          new THREE.Vector3(0.1, 0.5, 0),
          new THREE.Vector3(0.3, 0.4, 0)
        ]);
        const candyGeo = new THREE.TubeGeometry(curve, 16, 0.08, 8, false);

        const goldMat = new THREE.MeshStandardMaterial({
          color: CONFIG.colors.champagneGold,
          metalness: 1.0,
          roughness: 0.1,
          envMapIntensity: 2.0,
          emissive: 0x443300,
          emissiveIntensity: 0.3
        });

        const greenMat = new THREE.MeshStandardMaterial({
          color: CONFIG.colors.deepGreen,
          metalness: 0.2,
          roughness: 0.8,
          emissive: 0x002200,
          emissiveIntensity: 0.2
        });

        const redMat = new THREE.MeshPhysicalMaterial({
          color: CONFIG.colors.accentRed,
          metalness: 0.3,
          roughness: 0.2,
          clearcoat: 1.0,
          emissive: 0x330000
        });

        const candyMat = new THREE.MeshStandardMaterial({ map: caneTexture, roughness: 0.4 });

        for (let i = 0; i < CONFIG.particles.count; i++) {
          const rand = Math.random();
          let mesh, type;

          if (rand < 0.40) {
            mesh = new THREE.Mesh(boxGeo, greenMat);
            type = 'BOX';
          } else if (rand < 0.70) {
            mesh = new THREE.Mesh(boxGeo, goldMat);
            type = 'GOLD_BOX';
          } else if (rand < 0.92) {
            mesh = new THREE.Mesh(sphereGeo, goldMat);
            type = 'GOLD_SPHERE';
          } else if (rand < 0.97) {
            mesh = new THREE.Mesh(sphereGeo, redMat);
            type = 'RED';
          } else {
            mesh = new THREE.Mesh(candyGeo, candyMat);
            type = 'CANE';
          }

          const s = 0.4 + Math.random() * 0.5;
          mesh.scale.set(s, s, s);
          mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);

          mainGroup.add(mesh);
          particleSystem.push(new Particle(mesh, type, false));
        }

        const starGeo = new THREE.OctahedronGeometry(1.2, 0);
        const starMat = new THREE.MeshStandardMaterial({
          color: 0xffdd88,
          emissive: 0xffaa00,
          emissiveIntensity: 1.0,
          metalness: 1.0,
          roughness: 0
        });
        const star = new THREE.Mesh(starGeo, starMat);
        star.position.set(0, CONFIG.particles.treeHeight / 2 + 1.2, 0);
        mainGroup.add(star);

        mainGroup.add(photoMeshGroup);
      }

      function createDust() {
        const geo = new THREE.TetrahedronGeometry(0.08, 0);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffeebb, transparent: true, opacity: 0.8 });

        for (let i = 0; i < CONFIG.particles.dustCount; i++) {
          const mesh = new THREE.Mesh(geo, mat);
          mesh.scale.setScalar(0.5 + Math.random());
          mainGroup.add(mesh);
          particleSystem.push(new Particle(mesh, 'DUST', true));
        }
      }

      function createDefaultPhotos() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#eebb66';
        ctx.lineWidth = 15;
        ctx.strokeRect(20, 20, 472, 472);
        ctx.font = '500 60px Times New Roman';
        ctx.fillStyle = '#eebb66';
        ctx.textAlign = 'center';
        ctx.fillText("JOYEUX", 256, 230);
        ctx.fillText("NOEL", 256, 300);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        addPhotoToScene(tex);
      }

      function addPhotoToScene(texture: any) {
        const frameGeo = new THREE.BoxGeometry(1.4, 1.4, 0.05);
        const frameMat = new THREE.MeshStandardMaterial({
          color: CONFIG.colors.champagneGold,
          metalness: 1.0,
          roughness: 0.1
        });
        const frame = new THREE.Mesh(frameGeo, frameMat);

        const photoGeo = new THREE.PlaneGeometry(1.2, 1.2);
        const photoMat = new THREE.MeshBasicMaterial({ map: texture });
        const photo = new THREE.Mesh(photoGeo, photoMat);
        photo.position.z = 0.04;

        const group = new THREE.Group();
        group.add(frame);
        group.add(photo);

        const s = 0.8;
        group.scale.set(s, s, s);

        photoMeshGroup.add(group);
        particleSystem.push(new Particle(group, 'PHOTO', false));
      }

      const handleImageUpload = (e: Event) => {
        const input = e.target as HTMLInputElement;
        const files = input.files;
        if (!files?.length) return;

        Array.from(files).forEach(f => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            new THREE.TextureLoader().load(ev.target?.result as string, (t: any) => {
              t.colorSpace = THREE.SRGBColorSpace;
              addPhotoToScene(t);
            });
          };
          reader.readAsDataURL(f);
        });
      };

      // MediaPipe initialization
      async function initMediaPipe() {
        if (!videoRef.current || !webcamCanvasRef.current) return;

        const video = videoRef.current;
        const webcamCanvas = webcamCanvasRef.current;
        const webcamCtx = webcamCanvas.getContext('2d');
        if (!webcamCtx) return;

        webcamCanvas.width = 160;
        webcamCanvas.height = 120;

        try {
          // 动态导入 MediaPipe
          // @ts-ignore - MediaPipe 包的类型声明问题
          const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
          
          // 使用本地 WASM 文件
          const vision = await FilesetResolver.forVisionTasks(
            `${basePath}/mediapipe`
          );
          
          handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              // 使用本地模型文件
              modelAssetPath: `${basePath}/mediapipe/hand_landmarker.task`,
              delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
          });

          if (navigator.mediaDevices?.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
          }
        } catch (error) {
          console.log('MediaPipe initialization skipped:', error);
        }
      }

      function predictWebcam() {
        if (!videoRef.current || !handLandmarker) return;
        
        const video = videoRef.current;
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const result = handLandmarker.detectForVideo(video, performance.now());
          processGestures(result);
        }
        requestAnimationFrame(predictWebcam);
      }

      function processGestures(result: any) {
        if (result.landmarks && result.landmarks.length > 0) {
          STATE.hand.detected = true;
          const lm = result.landmarks[0];
          STATE.hand.x = (lm[9].x - 0.5) * 2;
          STATE.hand.y = (lm[9].y - 0.5) * 2;

          const thumb = lm[4];
          const index = lm[8];
          const wrist = lm[0];
          const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
          const tips = [lm[8], lm[12], lm[16], lm[20]];
          let avgDist = 0;
          tips.forEach((t: any) => avgDist += Math.hypot(t.x - wrist.x, t.y - wrist.y));
          avgDist /= 4;

          if (pinchDist < 0.05) {
            if (STATE.mode !== 'FOCUS') {
              STATE.mode = 'FOCUS';
              const photos = particleSystem.filter(p => p.type === 'PHOTO');
              if (photos.length) STATE.focusTarget = photos[Math.floor(Math.random() * photos.length)].mesh;
            }
          } else if (avgDist < 0.25) {
            STATE.mode = 'TREE';
            STATE.focusTarget = null;
          } else if (avgDist > 0.4) {
            STATE.mode = 'SCATTER';
            STATE.focusTarget = null;
          }
        } else {
          STATE.hand.detected = false;
        }
      }

      function setupEvents() {
        const handleResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
          composer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);
        fileInputRef.current?.addEventListener('change', handleImageUpload as EventListener);

        return () => {
          window.removeEventListener('resize', handleResize);
          fileInputRef.current?.removeEventListener('change', handleImageUpload as EventListener);
        };
      }

      function animate() {
        requestAnimationFrame(animate);
        const dt = clock.getDelta();

        // Rotation Logic with hand control
        if (STATE.mode === 'SCATTER' && STATE.hand.detected) {
          const targetRotY = STATE.hand.x * Math.PI * 0.9;
          const targetRotX = STATE.hand.y * Math.PI * 0.25;
          STATE.rotation.y += (targetRotY - STATE.rotation.y) * 3.0 * dt;
          STATE.rotation.x += (targetRotX - STATE.rotation.x) * 3.0 * dt;
        } else {
          if (STATE.mode === 'TREE') {
            STATE.rotation.y += 0.3 * dt;
            STATE.rotation.x += (0 - STATE.rotation.x) * 2.0 * dt;
          } else {
            STATE.rotation.y += 0.1 * dt;
          }
        }

        mainGroup.rotation.y = STATE.rotation.y;
        mainGroup.rotation.x = STATE.rotation.x;

        particleSystem.forEach(p => p.update(dt, STATE.mode, STATE.focusTarget));
        composer.render();
      }

      // Initialize
      initThree();
      setupEnvironment();
      setupLights();
      createTextures();
      createParticles();
      createDust();
      createDefaultPhotos();
      setupPostProcessing();
      const cleanup = setupEvents();
      await initMediaPipe();

      setTimeout(() => setIsLoading(false), 800);
      animate();

      return cleanup;
    };

    const cleanup = initScene();

    return () => {
      cleanup?.then(fn => fn?.());
    };
  }, []);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') {
        setControlsHidden(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <style jsx global>{`
        body {
          margin: 0;
          overflow: hidden;
          background-color: #000000;
          font-family: 'Times New Roman', serif;
        }

        .ui-hidden {
          opacity: 0;
          pointer-events: none !important;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-full bg-black z-[100] flex flex-col items-center justify-center transition-opacity duration-800">
          <div className="w-10 h-10 border border-[rgba(212,175,55,0.2)] border-t-[#d4af37] rounded-full animate-spin" />
          <div className="text-[#d4af37] text-sm tracking-[4px] mt-5 uppercase font-thin">
            Loading Holiday Magic
          </div>
        </div>
      )}

      <div ref={containerRef} className="w-screen h-screen absolute top-0 left-0 z-[1]" />

      <div className="fixed top-0 left-0 w-full h-full z-10 pointer-events-none flex flex-col items-center pt-10">
        <h1 className="text-[#fceea7] text-[56px] m-0 font-normal tracking-[6px] opacity-90"
            style={{
              textShadow: '0 0 50px rgba(252, 238, 167, 0.6)',
              background: 'linear-gradient(to bottom, #fff, #eebb66)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: "'Cinzel', 'Times New Roman', serif"
            }}>
          Merry Christmas
        </h1>

        <div className={`mt-5 pointer-events-auto text-center transition-opacity duration-500 ${controlsHidden ? 'ui-hidden' : ''}`}>
          <label className="inline-block bg-[rgba(20,20,20,0.6)] border border-[rgba(212,175,55,0.4)] text-[#d4af37] py-2.5 px-6 cursor-pointer uppercase tracking-[3px] text-[10px] transition-all duration-400 backdrop-blur-[5px] hover:bg-[#d4af37] hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.5)]">
            Add Memories
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
            />
          </label>
          <div className="text-[rgba(212,175,55,0.5)] text-[9px] mt-2 tracking-[1px] uppercase">
            Press &apos;H&apos; to Hide Controls
          </div>
        </div>
      </div>

      {/* Webcam preview */}
      <div className="fixed bottom-10 right-10 w-[120px] h-[90px] border border-white/10 overflow-hidden opacity-0 pointer-events-none">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="hidden"
        />
        <canvas ref={webcamCanvasRef} />
      </div>
    </>
  );
}
