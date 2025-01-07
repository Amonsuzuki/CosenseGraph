import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import data from '../data/reduced_data.json';

const ThreeBox: React.FC = () => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const isDragging = useRef(false);
	const lastMousePosition = useRef({ x:0, y:0 });
	const rotationRef = useRef({ x:0, y:0 });//current rotation
	const defaultRotation = useRef(true);
/*
const [labelPositions, setLabelPositions] = useState<
		{ id: number; x: number; y: number; label: string }[]
	>([]);
*/

const categories = [
	{ name: "What I use", color: "#00FFFF" },
	{ name: "Who I respect", color: "#FFD700" },
	{ name: "Project1", color: "#FF4500" },
	{ name: "Project2", color: "#7CFC00" },
	{ name: "Project3", color: "#FF1493" },
	{ name: "Interests", color: "#1E90FF" },
	{ name: "Organization", color: "#32CD32" },
	{ name: "Companies I like", color: "#FF6347" },
	{ name: "Hobbies", color: "#9370DB" },
	{ name: "Important things", color: "#FFFFFF" },
];

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
		if (defaultRotation)
			scene.add(gridHelper);
		else
			staticGroup.add(gridHelper);//scene.add
		const axesHelper = new THREE.AxesHelper(400);
		if (defaultRotation)
			scene.add(axesHelper);
		else
			staticGroup.add(axesHelper);//scene.add

		const sphereGroup = new THREE.Group();
		//const lineGroup = new THREE.Group();

		const createLabel = (text: string, category:string) => {
			const canvas = document.createElement("canvas");
			canvas.width = 1024;
			canvas.height = 256;

			const context = canvas.getContext("2d")!;
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.font = "30px sans-serif";
			for (let i = 0; i < categories.length; i++) {
				if (category == categories[i].name)
					context.fillStyle = categories[i].color;
			}
			context.fillText(text, canvas.width / 2 - 80, canvas.height / 2 + 50);

			const texture = new THREE.CanvasTexture(canvas);
			//texture.flipY = false;
			//texture.premultiplyAlpha = false;
			texture.needsUpdate = true;
			const material = new THREE.SpriteMaterial({ 
				map: texture,
				depthTest: false
				});
			const sprite = new THREE.Sprite(material);
			sprite.scale.set(90, 25, 1);

			return sprite;
		}


		data.forEach((item) => {
			const material = new THREE.MeshNormalMaterial();
			const geometry = new THREE.SphereGeometry(10, 30, 30);
			const sphere = new THREE.Mesh(geometry, material);

			sphere.position.set(item.x * 400, item.y * 400, item.z * 400);
			sphereGroup.add(sphere);
/*
			const lineGeometry = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(0, 0, 0),
				new THREE.Vector3(item.x * 400, item.y * 400, item.z * 400),
			]);
			const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
			const line = new THREE.Line(lineGeometry, lineMaterial);
			lineGroup.add(line);
*/
			const label = createLabel(item.text, item.category);
			label.position.copy(sphere.position).add(new THREE.Vector3(0, 20, 0));
			sphereGroup.add(label);
			});
		staticGroup.add(sphereGroup);
		//staticGroup.add(lineGroup);
/*
		const updateLabelPositions = () => {
			console.log("label update");
			const positions = data.map((item, index) => {
				const worldPosition = new THREE.Vector3(
					item.x * 400, 
					item.y * 400, 
					item.z * 400
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
*/
		const handleMouseDown = (event: MouseEvent) => {
			defaultRotation.current = false;
			rotationRef.current.y = staticGroup.rotation.y;
			isDragging.current = true;
			lastMousePosition.current = { x: event.clientX, y: event.clientY };
		};

		const handleMouseMove = (event: MouseEvent) => {
			if (!isDragging.current)
				return;
			const deltaX = event.clientX - lastMousePosition.current.x;
			const deltaY = event.clientY - lastMousePosition.current.y;
			
			rotationRef.current.x += deltaY * 0.01;
			rotationRef.current.y += deltaX * 0.01;

			lastMousePosition.current = { x: event.clientX, y:event.clientY };
		};

		const handleMouseUp = () => {
			isDragging.current = false;
		}

		const handleWheel = (event: WheelEvent) => {
			defaultRotation.current = false;
			rotationRef.current.y = staticGroup.rotation.y;
			event.preventDefault();

			const zoomSpeed = 1;
			const delta = event.deltaY * -zoomSpeed;

			const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
			const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

			const vector = new THREE.Vector3(mouseX, mouseY, 0.5).unproject(camera);
			const direction = vector.sub(camera.position).normalize();

			const zoomDistance = delta;
			camera.position.add(direction.multiplyScalar(zoomDistance));
		};

		window.addEventListener("mousedown", handleMouseDown);
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		window.addEventListener("wheel", handleWheel, { passive: false });

		window.addEventListener("resize", resizeRenderer);

		// 毎フレーム時に実行されるループイベント
		const tick = () => {

			//rotation mode, comment out mouserotation 2 lines below and put grounds from staticGroup to scene
			if (defaultRotation.current) {
				const time = 0.003;
				staticGroup.rotation.y += time;
			}
			else {
				staticGroup.rotation.x = rotationRef.current.x;
				staticGroup.rotation.y = rotationRef.current.y;
			}

			//updateLabelPositions();
			// レンダリング
			renderer.render(scene, camera);

			requestAnimationFrame(tick);//recursive
		};

		tick(); // 初回実行

		// コンポーネントがアンマウントされたときにリソースを解放
		return () => {
			window.removeEventListener("resize", resizeRenderer);
			//window.removeEventListener("resize", updateLabelPositions);
			window.removeEventListener("mousedown", handleMouseDown);
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
			window.removeEventListener("wheel", handleWheel);
			renderer.dispose();
		};
	}, []);

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
		<div
		style={{
		position: "absolute",
		top: "10px",
		right: "10px",
		zIndex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		color: "white",
		padding: "10px",
		borderRadius: "8px",
		}}
		>
		<ul style={{ listStyleType: "none", padding: 0, margin: 0 }}>
		{categories.map((category) => (
		<li key={category.name} style={{ display: "flex", alignItems: "center", marginBottom: "5px" }}>
		<span
		style={{
			display: "inline-block",
			width: "16px",
			height: "16px",
			backgroundColor: category.color,
			marginRight: "8px",
			}}
			></span>
			<span>{category.name}</span>
			</li>
			))}
			</ul>
			</div>
	</div>
	);
};

export default ThreeBox;

