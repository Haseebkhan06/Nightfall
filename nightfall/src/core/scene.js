import * as THREE from 'three';

export const R = new THREE.WebGLRenderer({ antialias: true });
R.setSize(innerWidth, innerHeight);
R.setPixelRatio(Math.min(devicePixelRatio, 1.5));
R.shadowMap.enabled = true;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020505);
scene.fog = new THREE.FogExp2(0x041412, 0.065);
scene.add(new THREE.HemisphereLight(0x2a5a55, 0x050808, 0.22));

export const cam = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 60);
cam.rotation.order = 'YXZ';
scene.add(cam);

// Player flashlight, parented to camera
export const fl = new THREE.SpotLight(0xdff8ff, 0, 26, 0.5, 0.55, 1.4);
fl.castShadow = true;
fl.shadow.mapSize.set(512, 512);
fl.position.set(0.2, -0.1, 0);
fl.target.position.set(0, 0, -5);
cam.add(fl); cam.add(fl.target);

addEventListener('resize', () => {
  R.setSize(innerWidth, innerHeight);
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
});
export const mount = () => document.getElementById('app').appendChild(R.domElement);
