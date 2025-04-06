import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import data from '../data/3.json';

//汎化
const projectName = "hankyusyoki";

const ThreeBox: React.FC = () => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const isDragging = useRef(false);
	const lastMousePosition = useRef({ x:0, y:0 });
	const rotationRef = useRef({ x:0, y:0 });//current rotation
	const defaultRotation = useRef(true);
	const raycaster = new THREE.Raycaster();
	const mouse = new THREE.Vector2();
	const urlDisplayRef = useRef<HTMLDivElement | null>(null);
/*
const [labelPositions, setLabelPositions] = useState<
		{ id: number; x: number; y: number; label: string }[]
	>([]);
*/

//汎化
	const categories = [
		{ name: "実", color: "#00FFFF" },
		{ name: "A", color: "#FFD700" },
		{ name: "B", color: "#FF4500" },
		{ name: "デ", color: "#7CFC00" },
		{ name: "回", color: "#FF1493" },
		{ name: "磁", color: "#1E90FF" },
		{ name: "英", color: "#32CD32" },
		{ name: "核", color: "#FF6347" },
		{ name: "序", color: "#9370DB" },
		{ name: "その他", color: "#FFFFFF" },
	];

	useEffect(() => {
		const canvasVar = canvasRef.current;
		if (!canvasVar) return;

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

		const linkCounts: { [key: string]: number } = {};
		data.links.forEach((link) => {
			if (link.source in linkCounts) {
				linkCounts[link.source] += 1;
			}
			else
				linkCounts[link.source] = 1;
		});

		const sphereGroup = new THREE.Group();
		const lineGroup = new THREE.Group();
		const nodeMap: { [key: string]: THREE.Vector3 } = {};

		data.nodes.forEach((node) => {
			const material = new THREE.MeshNormalMaterial();
			const count = linkCounts[node.title] || 0;
			let radius
			if (count < 50)
				radius = 10 + 2 * count;
			else
				radius = 10 + 100
			const geometry = new THREE.SphereGeometry(radius, 30, 30);
			const sphere = new THREE.Mesh(geometry, material);

			const pos = new THREE.Vector3(node.x * 400, node.y * 400, node.z * 400);

			sphere.position.copy(pos);
			sphere.userData.url = `https://scrapbox.io/${projectName}/${encodeURIComponent(node.title)}`;
			sphere.userData.displayUrl = `https://scrapbox.io/${projectName}/${node.title}`;
			sphereGroup.add(sphere);

			const label = createLabel(node.title, node.category);
			label.position.copy(sphere.position).add(new THREE.Vector3(0, 20, 0));
			label.userData.url = sphere.userData.url;
			label.userData.displayUrl = sphere.userData.displayUrl;
			sphereGroup.add(label);

			nodeMap[node.title] = pos;
		});

		data.links.forEach((link) => {
			const sourcePos = nodeMap[link.source];
			const targetPos = nodeMap[link.target];

			if (sourcePos && targetPos) {
				const points = [sourcePos, targetPos];
				const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
				const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
				const line = new THREE.Line(lineGeometry, lineMaterial);
				lineGroup.add(line)
			}
		});
		staticGroup.add(sphereGroup);
		staticGroup.add(lineGroup);

/*
		data.forEach((item) => {
			const material = new THREE.MeshNormalMaterial();
			const geometry = new THREE.SphereGeometry(10, 30, 30);
			const sphere = new THREE.Mesh(geometry, material);

			sphere.position.set(item.x * 400, item.y * 400, item.z * 400);
			sphereGroup.add(sphere);

			const lineGeometry = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(0, 0, 0),
				new THREE.Vector3(item.x * 400, item.y * 400, item.z * 400),
			]);
			const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
			const line = new THREE.Line(lineGeometry, lineMaterial);
			lineGroup.add(line);

			const label = createLabel(item.title, item.category);
			label.position.copy(sphere.position).add(new THREE.Vector3(0, 20, 0));
			sphereGroup.add(label);
			});
		staticGroup.add(sphereGroup);
		staticGroup.add(lineGroup);
*/
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
					label: `${item.title}`,
				};
			});
			setLabelPositions(positions);
		};
		updateLabelPositions();
*/

		const clickURL = (event: MouseEvent) => {
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
			raycaster.setFromCamera(mouse, camera);

			const intersects = raycaster.intersectObjects(sphereGroup.children, true);
			if (intersects.length > 0) {
				const obj = intersects[0].object;
				if (obj.userData.url)
					window.location.href = obj.userData.url;
			}
		};

		const handleHover = (event: MouseEvent) => {
			if (isDragging.current)
				return;
			mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
			mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObjects(
				sphereGroup.children,
				true
			);
			const urlDisplay =  urlDisplayRef.current;
			if (intersects.length > 0) {
				const obj = intersects[0].object;
				if (obj.userData.url && urlDisplay) {
					urlDisplay.style.display = "block";
					urlDisplay.style.left = event.clientX + 10 + "px";
					urlDisplay.style.top = event.clientY + 10 + "px";
					urlDisplay.innerText = obj.userData.displayUrl;
					document.body.style.cursor = "pointer";
				}
			}
			else {
				if (urlDisplay)
					urlDisplay.style.display = "none";
				document.body.style.cursor = "default";
			}
		};

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
		};

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

		window.addEventListener("click", clickURL);
		window.addEventListener("mousedown", handleMouseDown);
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		window.addEventListener("wheel", handleWheel, { passive: false });

		window.addEventListener("resize", resizeRenderer);

		canvasRef.current.addEventListener("mousemove", handleHover);

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
			window.removeEventListener("click", clickURL);
			//window.removeEventListener("resize", updateLabelPositions);
			window.removeEventListener("mousedown", handleMouseDown);
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
			window.removeEventListener("wheel", handleWheel);
			canvasVar.removeEventListener("mousemove", handleHover);
			window.removeEventListener("resize", resizeRenderer);
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
		id="urlDisplay"
		ref={urlDisplayRef}
		style={{
			position: "fixed",
			display: "none",
			padding: "5px 8px",
			backgroundColor: "rgba(0, 0, 0, 0.7)",
			color: "#fff",
			fontSize: "12px",
			borderRadius: "4px",
			pointerEvents: "none",
			zIndex: 10,
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

