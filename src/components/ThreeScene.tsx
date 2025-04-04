import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import data from '../data/data.json';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const projectName = process.env.NEXT_PUBLIC_PROJECT_NAME;
import data from '../data/3.json';

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

	const generateCategoryColors = () => {
		const categorySet = new Set<string>();
		data.nodes.forEach((node) => categorySet.add(node.category));

		const uniqueCategories = Array.from(categorySet);

		const colorPalette = [
			"#00FFFF", "#FFD700", "#FF4500", "#7CFC00", "#FF1493", "#1E90FF", "#32CD32", "#FF6347", "#9370DB", "#FF033D"
		];
		const generateCategories = uniqueCategories.map((name, index) => ({
			name,
			color: colorPalette[index % colorPalette.length]
		}));
		return generateCategories;
	}
	const categories = generateCategoryColors();
	const categoryColorMap = new Map<string, string>();
	categories.forEach(({ name, color }) => categoryColorMap.set(name, color));
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

		const edgeMap = new Map<THREE.Object3D, THREE.Line[]>();
		const defaultLineOpacity = 0.1;
		let outlineMesh: THREE.Mesh | null = null;
		let previouslyHoveredSphere: THREE.Mesh | null = null;

		type OverlayInfo = { overlay: HTMLDivElement, node: THREE.Object3D };
		let neighborOverlays: OverlayInfo[] = [];
		type NeighborInfo = { node: THREE.Object3D; position: THREE.Vector3 };
		const neighborMap = new Map<THREE.Object3D, NeighborInfo[]>();

		let hasDragged = false;
		const DRAG_THRESHOLD = 1;

		// レンダラーの初期設定
		const renderer = new THREE.WebGLRenderer({
			canvas: canvasVar,
		});
		renderer.setPixelRatio(window.devicePixelRatio);

		// シーンを作成
		const scene = new THREE.Scene();
		const ambientLight = new THREE.AmbientLight(0xffffff, 5.0);
		scene.add(ambientLight);
		const directionalLight = new THREE.DirectionalLight(0xffffff, 10.0);
		directionalLight.position.set(300, 100, 300);
		scene.add(directionalLight);
		scene.fog = new THREE.Fog(0x111111, 400, 1500);
/*
		const floorGeometry = new THREE.PlaneGeometry(2000, 2000);
		const floorMaterial = new THREE.MeshStandardMaterial({
			color: 0x222222,
			metalness: 0.6,
			roughness: 0.1,
			envMapIntensity: 1.0
		});
		const floor = new THREE.Mesh(floorGeometry, floorMaterial);
		floor.rotation.x = -Math.PI / 2;
		floor.position.y = -100;
		floor.receiveShadow = true;
		scene.add(floor);
*/

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
		staticGroup.scale.set(1.5, 1.5, 1.5);
/*
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
			//canvas.width = 1024;
			//canvas.height = 256;
			canvas.width = 512;
			canvas.height = 128;

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
*/
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
			//const material = new THREE.MeshNormalMaterial();
			const categoryColor = categoryColorMap.get(node.category) || "#ffffff";
			const material = new THREE.MeshStandardMaterial({ 
				color: categoryColor,
				metalness: 0.8,
				roughness: 0.2,
				envMapIntensity: 1.5
			});
			const count = linkCounts[node.text] || 0;
			let radius
			if (count < 500)
				radius = 1 + 0.1 * count;
			else
				radius = 1 + 50
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
			const count = linkCounts[node.text] || 0;
			let radius
			if (count < 50)
				radius = 10 + 2 * count;
			else
				radius = 10 + 100
			const geometry = new THREE.SphereGeometry(radius, 30, 30);
			const sphere = new THREE.Mesh(geometry, material);

			const pos = new THREE.Vector3(node.x * 400, node.y * 400, node.z * 400);

			sphere.position.copy(pos);
			sphere.userData.url = `https://scrapbox.io/${projectName}/${encodeURIComponent(node.text)}`;
			sphere.userData.displayUrl = `https://scrapbox.io/${projectName}/${node.text}`;
			sphere.userData.label = node.text;
			sphereGroup.add(sphere);
/*
			sphereGroup.add(sphere);

			const label = createLabel(node.text, node.category);
			label.position.copy(sphere.position).add(new THREE.Vector3(0, 20, 0));
			label.userData.url = sphere.userData.url;
			label.userData.displayUrl = sphere.userData.displayUrl;
			sphereGroup.add(label);
*/

			nodeMap[node.text] = pos;
		});

		data.links.forEach((link) => {
			const sourcePos = nodeMap[link.source];
			const targetPos = nodeMap[link.target];

			if (sourcePos && targetPos) {
				const points = [sourcePos, targetPos];
				const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
				const lineMaterial = new THREE.LineBasicMaterial({ 
					color: 0xffffff,
					transparent: true,
					opacity: defaultLineOpacity
					});
				const line = new THREE.Line(lineGeometry, lineMaterial);
				lineGroup.add(line)

				const sourceSphere = sphereGroup.children.find(o => o.userData.displayUrl?.endsWith(link.source));
				const targetSphere = sphereGroup.children.find(o => o.userData.displayUrl?.endsWith(link.target));
				if (sourceSphere && targetSphere) {
					const sourceWorldPos = new THREE.Vector3();
					sourceSphere.getWorldPosition(sourceWorldPos);
					const targetWorldPos = new THREE.Vector3();
					targetSphere.getWorldPosition(targetWorldPos);
					if (!neighborMap.has(sourceSphere)) {
						neighborMap.set(sourceSphere, []);
					}
					neighborMap.get(sourceSphere)!.push({ node: targetSphere, position: targetWorldPos.clone() });
					if (!neighborMap.has(targetSphere)) {
						neighborMap.set(targetSphere, []);
					}
					neighborMap.get(targetSphere)!.push({ node: sourceSphere, position: sourceWorldPos.clone() });
				}
				if (sourceSphere) {
					if (!edgeMap.has(sourceSphere)) edgeMap.set(sourceSphere, []);
					edgeMap.get(sourceSphere)!.push(line);
				}
				if (targetSphere) {
					if (!edgeMap.has(targetSphere)) edgeMap.set(targetSphere, []);
					edgeMap.get(targetSphere)!.push(line);
				}
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

			const label = createLabel(item.text, item.category);
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
					label: `${item.text}`,
				};
			});
			setLabelPositions(positions);
		};
		updateLabelPositions();
*/

		const clickURL = (event: MouseEvent) => {
			if (hasDragged) {
				return;
			}
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
			neighborOverlays.forEach(info => {
				document.body.removeChild(info.overlay);
			});
			neighborOverlays = [];

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

			lineGroup.children.forEach(line => {
				if ((line as THREE.Line).material instanceof THREE.LineBasicMaterial) {
					(line as THREE.Line).material.opacity = defaultLineOpacity;
				}
			});

			if (outlineMesh) {
				scene.remove(outlineMesh);
				outlineMesh.geometry.dispose();
				(outlineMesh.material as THREE.Material).dispose();
				outlineMesh = null;
			}

			if (intersects.length > 0) {
				const obj = intersects[0].object;
				if (obj instanceof THREE.Mesh) {
					const worldPos = new THREE.Vector3();
					obj.getWorldPosition(worldPos);
					const worldScale = new THREE.Vector3();
					obj.getWorldScale(worldScale);
					const worldQuat = new THREE.Quaternion();
					obj.getWorldQuaternion(worldQuat);

					const geometry = obj.geometry.clone();
					const outlineMaterial = new THREE.MeshBasicMaterial({
						color: 0xffffff,
						side: THREE.BackSide,
						depthWrite: false
					});
					outlineMesh = new THREE.Mesh(geometry, outlineMaterial);
					outlineMesh.position.copy(worldPos);
					outlineMesh.quaternion.copy(worldQuat);
					outlineMesh.scale.copy(worldScale).multiplyScalar(1.2);
					scene.add(outlineMesh);

					previouslyHoveredSphere = obj;
				}
			}

			if (intersects.length > 0) {
				const centerNode = intersects[0].object;
				if (urlDisplay && centerNode.userData.url) {
					urlDisplay.style.display = "block";
					urlDisplay.style.left = event.clientX + 10 + "px";
					urlDisplay.style.top = event.clientY + 10 + "px";
					urlDisplay.innerText = centerNode.userData.displayUrl;
					document.body.style.cursor = "pointer";
				}

				const neighbors = neighborMap.get(centerNode) || [];
				neighbors.forEach((neighborInfo) => {
					/*
					const worldPos = neighborInfo.position.clone();
					worldPos.project(camera);
					const screenX = (worldPos.x + 1) / 2 * window.innerWidth;
					const screenY = (-worldPos.y + 1) / 2 * window.innerHeight;
					*/
					const overlay = document.createElement("div");
					overlay.style.position = "fixed";
					overlay.style.padding = "3px 5px";
					overlay.style.background = "rgba(0, 0, 0, 0.7)";
					overlay.style.color = "#fff";
					overlay.style.fontSize = "10px";
					overlay.style.borderRadius = "3px";
					overlay.style.pointerEvents = "none";

					overlay.innerText = neighborInfo.node.userData.label;

					document.body.appendChild(overlay);
					neighborOverlays.push({ overlay, node: neighborInfo.node });
				});
/*
			if (intersects.length > 0) {
				const obj = intersects[0].object;
				if (obj.userData.url && urlDisplay) {
					urlDisplay.style.display = "block";
					urlDisplay.style.left = event.clientX + 10 + "px";
					urlDisplay.style.top = event.clientY + 10 + "px";
					const neighbors = neighborMap.get(obj);
					if (neighbors && neighbors.length > 0) {
						const neighborURLs = neighbors
							.map(neighbor => neighbor.userData.displayUrl)
							.filter(url => url)
							.join("\n");
						urlDisplay.innerText = neighborURLs;
					} else {
						urlDisplay.innerText = obj.userData.displayUrl;
					}
					document.body.style.cursor = "pointer";
				}*/
				const lines = edgeMap.get(centerNode);
				if (lines) {
					lines.forEach((line) => {
						const mat = line.material as THREE.LineBasicMaterial;
						mat.opacity = 1.0;
					});
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
			hasDragged = false;
			lastMousePosition.current = { x: event.clientX, y: event.clientY };
		};

		const handleMouseMove = (event: MouseEvent) => {
			if (!isDragging.current)
				return;
			const deltaX = event.clientX - lastMousePosition.current.x;
			const deltaY = event.clientY - lastMousePosition.current.y;
			if (Math.hypot(deltaX, deltaY) > DRAG_THRESHOLD) {
				hasDragged = true;
			}
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
				//const time = 0.003;
				const time = 0.01;
				staticGroup.rotation.y += time;
			}
			else {
				staticGroup.rotation.x = rotationRef.current.x;
				staticGroup.rotation.y = rotationRef.current.y;
			}

			if (outlineMesh && previouslyHoveredSphere) {
				const worldPos = new THREE.Vector3();
				previouslyHoveredSphere.getWorldPosition(worldPos);
				outlineMesh.position.copy(worldPos);
			}

			neighborOverlays.forEach(({ overlay, node }) => {
				const worldPos = new THREE.Vector3();
				node.getWorldPosition(worldPos);
				worldPos.project(camera);
				const screenX = (worldPos.x + 1) / 2 * window.innerWidth;
				const screenY = (-worldPos.y + 1) / 2 * window.innerHeight;
				overlay.style.left = `${screenX}px`
				overlay.style.top = `${screenY}px`
			});

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
			neighborOverlays.forEach(info => {
				document.body.removeChild(info.overlay);
			});
			canvasRef.current.addEventListener("mousemove", handleHover);
			window.removeEventListener("resize", resizeRenderer);
			renderer.dispose();
		}
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

