import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import data from '../data/reduced_data.json';

const ThreeBox: React.FC = () => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [lastMousePosition, setLastMousePosition] = useState({ x:0, y:0 });
	const rotationRef = useRef({ x:0, y:0 });//current rotation
	const [labelPositions, setLabelPositions] = useState<
		{ id: number; x: number; y: number; label: string }[]
	>([]);

	useEffect(() => {
		if (!canvasRef.current) return;

		// レンダラーの初期設定
		const renderer = new THREE.WebGLRenderer({
			canvas: canvasRef.current,
		});
		renderer.setPixelRatio(window.devicePixelRatio);

		// シーンを作成
		const scene = new THREE.Scene();

		// カメラを作成
		const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight);
		camera.position.set(100, 150, 500);
		camera.lookAt(new THREE.Vector3(0, 0, 0));
 
		//サイズ調整
		const resizeRenderer = () => {
			const width = window.innerWidth;
			const height = window.innerHeight;

			camera.aspect = width / height;
			camera.updateProjectionMatrix();

			renderer.setSize(width, height);
		};
		//初回サイズ調整
		resizeRenderer();

		//all objects here 
		const staticGroup = new THREE.Group();
		scene.add(staticGroup);

		//add ground
		const gridHelper = new THREE.GridHelper(600);
		staticGroup.add(gridHelper);//scene.add
		const axesHelper = new THREE.AxesHelper(400);
		staticGroup.add(axesHelper);//scene.add

		const sphereGroup = new THREE.Group();
		const lineGroup = new THREE.Group();
		data.forEach((item, index) => {
			const material = new THREE.MeshNormalMaterial();
			const geometry = new THREE.SphereGeometry(10, 30, 30);
			const mesh = new THREE.Mesh(geometry, material);

			mesh.position.set(item.x * 400, item.y * 400, item.z * 400);
			sphereGroup.add(mesh);

			const lineGeometry = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(0, 0, 0),
				new THREE.Vector3(item.x * 400, item.y * 400, item.z * 400),
			]);
			const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
			const line = new THREE.Line(lineGeometry, lineMaterial);
			lineGroup.add(line);
			});
		staticGroup.add(sphereGroup);
		staticGroup.add(lineGroup);

		const updateLabelPositions = () => {
			console.log("label update");
			const positions = data.map((item, index) => {
				const worldPosition = new THREE.Vector3(
					item.x * 401, 
					item.y * 401, 
					item.z * 401
				);
				const screenPosition = worldPosition.project(camera);

				const sx = (window.innerWidth / 2) * (screenPosition.x + 1.0);
				const sy = (window.innerHeight / 2) * (-screenPosition.y + 1.0);
				return {
					id: index,
					x: sx,
					y: sy,
					label: `${item.text}`,
				};
			});
			setLabelPositions(positions);
		};
		updateLabelPositions();

		const handleMouseDown = (event: MouseEvent) => {
			setIsDragging(true);
			setLastMousePosition({ x: event.clientX, y: event.clientY });
		};

		const handleMouseMove = (event: MouseEvent) => {
			if (!isDragging) 
				return;
			const deltaX = event.clientX - lastMousePosition.x;
			const deltaY = event.clientY - lastMousePosition.y;
			
			rotationRef.current.x += deltaY * 0.01;
			rotationRef.current.y += deltaX * 0.01;

			setLastMousePosition({ x: event.clientX, y:event.clientY });
		};

		const handleMouseUp = () => {
			setIsDragging(false);
			renderer.render(scene, camera);
		}

		window.addEventListener("mousedown", handleMouseDown);
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);

		window.addEventListener("resize", resizeRenderer);

		// 毎フレーム時に実行されるループイベント
		const tick = () => {
/*
			//rotation mode, comment out mouserotation 2 lines below and put grounds from staticGroup to scene
			const time = 0.005;
			staticGroup.rotation.x += time;
			staticGroup.rotation.y += time;
*/
			staticGroup.rotation.x = rotationRef.current.x;
			staticGroup.rotation.y = rotationRef.current.y;

			updateLabelPositions();
			// レンダリング
			renderer.render(scene, camera);

			requestAnimationFrame(tick);//recursive
		};

		tick(); // 初回実行

		// コンポーネントがアンマウントされたときにリソースを解放
		return () => {
			window.removeEventListener("resize", resizeRenderer);
			window.removeEventListener("resize", updateLabelPositions);
			window.removeEventListener("mousedown", handleMouseDown);
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
			renderer.dispose();
		};
	}, [isDragging, lastMousePosition]);

	return (
	<div
	style={{
		position: "relative",
		width: "100%",
		height: "100vh",
		overflow: "hidden",
	}}
	>
		<canvas 
		ref={canvasRef}
		style={{
			position: "absolute",
			top: 0,
			left: 0,
			width: "100%",
			height: "100%",
			zIndex: 0,
		}}
		/>
		
		{labelPositions.map((label) => (
			<div
			key={label.id}
			style={{
				position: "absolute",
				left: label.x,
				top: label.y,
				transform: "translate(-50%, -50%)",
				background: "white",
				padding: "4px",
				borderRadius: "4px",
				pointerEvents:"none",
				fontSize: "8px",
				zIndex: 10,
				}}
				>
				{label.label}
			</div>
		))}
	</div>
	);
};

export default ThreeBox;

