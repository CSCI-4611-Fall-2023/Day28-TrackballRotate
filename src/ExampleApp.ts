/** CSci-4611 Example Code
 * Copyright 2023+ Regents of the University of Minnesota
 * Please do not distribute beyond the CSci-4611 course
 */

import * as gfx from 'gophergfx'


export class ExampleApp extends gfx.GfxApp
{   
    private bunnyMesh: gfx.Mesh3;
    private mousePrevPos: gfx.Vector2;
    private panning: boolean;
    private panPlane: gfx.Plane3;
    private rotating: boolean;

    // --- Create the ExampleApp class ---
    constructor()
    {
        // initialize the base class gfx.GfxApp
        super();

        this.bunnyMesh = gfx.MeshLoader.loadOBJ('./assets/bunny.obj', (mesh: gfx.Mesh3) => {
            this.bunnyMesh.computeBounds(null); 
        });
        this.mousePrevPos = new gfx.Vector2();
        this.panning = false;
        this.rotating = false;
        this.panPlane = new gfx.Plane3();
    }


    // --- Initialize the graphics scene ---
    createScene(): void 
    {
        this.renderer.viewport = gfx.Viewport.CROP;
        this.camera.setPerspectiveCamera(60, 1920/1080, 0.1, 100);
        this.camera.position = new gfx.Vector3(0, 0, 2);
        this.camera.lookAt(new gfx.Vector3(0, 0, 0), gfx.Vector3.UP);

        this.renderer.background.set(0.7, 0.7, 0.7);
        
        // Create an ambient light
        const ambientLight = new gfx.AmbientLight(new gfx.Vector3(0.2, 0.2, 0.2));
        this.scene.add(ambientLight);

        const pointLight = new gfx.PointLight();
        pointLight.position.set(.75, 1.1, 1);
        this.scene.add(pointLight);

        this.scene.add(this.bunnyMesh);
        this.bunnyMesh.position = new gfx.Vector3(0.5, 0, -1);
        this.bunnyMesh.scale = new gfx.Vector3(0.5, 0.5, 0.5);
        
    }


    // --- Update is called once each frame by the main graphics loop ---
    update(deltaTime: number): void 
    {
    }

    onMouseDown(event: MouseEvent): void 
    {
        const mouseCurPos = this.getNormalizedDeviceCoordinates(event.x, event.y);

        // to start the interaction, check with an intersection with the actual mesh
        const ray = new gfx.Ray3();
        ray.setPickRay(mouseCurPos, this.camera);
        const hit = ray.intersectsMesh3(this.bunnyMesh);
        if (hit) {
            if (event.button == 0 && !this.rotating) {
                this.panning = true;
                const negativeLookVec = this.camera.localToWorldMatrix.transformVector(gfx.Vector3.BACK);
                this.panPlane = new gfx.Plane3(hit, negativeLookVec);
            } else if (event.button == 2 && !this.panning) {
                this.rotating = true;
            }
            this.mousePrevPos = mouseCurPos;
        }
    }

    onMouseMove(event: MouseEvent): void 
    {
        if (this.panning) {
            // shoot a ray for the prev mouse onto the pan plane
            const worldRayPrev = new gfx.Ray3();
            worldRayPrev.setPickRay(this.mousePrevPos, this.camera);
            const worldHitPrev = worldRayPrev.intersectsPlane(this.panPlane);

            // shoot a ray for the current mouse onto the pan plane
            const mouseCurPos = this.getNormalizedDeviceCoordinates(event.x, event.y);
            const worldRayCur = new gfx.Ray3();
            worldRayCur.setPickRay(mouseCurPos, this.camera);
            const worldHitCur = worldRayCur.intersectsPlane(this.panPlane);
            
            if (worldHitPrev && worldHitCur) {
                const deltaPosWorld = gfx.Vector3.subtract(worldHitCur, worldHitPrev);
                const worldToLocalMatrix = this.bunnyMesh.localToWorldMatrix.inverse();
                const deltaPosLocal = worldToLocalMatrix.transformVector(deltaPosWorld);
                
                // with matrices:
                const M = this.bunnyMesh.getLocalToParentMatrix();
                M.multiply(gfx.Matrix4.makeTranslation(deltaPosLocal));
                this.bunnyMesh.setLocalToParentMatrix(M, false);

                // with separate TRS:
                //const deltaPosLocalScaledAndRotated = deltaPosLocal.clone();
                //deltaPosLocalScaledAndRotated.multiply(this.bunnyMesh.scale);
                //deltaPosLocalScaledAndRotated.rotate(this.bunnyMesh.rotation);
                //this.bunnyMesh.position.add(deltaPosLocalScaledAndRotated);
            }
            this.mousePrevPos = mouseCurPos;

        } else if (this.rotating) {
                      
            // shoot a ray for the prev mouse onto the bounding sphere of our object
            const worldRayPrev = new gfx.Ray3();
            worldRayPrev.setPickRay(this.mousePrevPos, this.camera);
            const worldHitPrev = worldRayPrev.intersectsOrientedBoundingSphere(this.bunnyMesh);
        
            // shoot a ray for the current mouse onto the bounding sphere of our object  
            const mouseCurPos = this.getNormalizedDeviceCoordinates(event.x, event.y);
            const worldRayCur = new gfx.Ray3();
            worldRayCur.setPickRay(mouseCurPos, this.camera);
            const worldHitCur = worldRayCur.intersectsOrientedBoundingSphere(this.bunnyMesh);

            // rotate the object
            if (worldHitPrev && worldHitCur) {
                const vPrev = gfx.Vector3.subtract(worldHitPrev, this.bunnyMesh.worldBoundingSphere.center);
                vPrev.normalize();
                const vCur = gfx.Vector3.subtract(worldHitCur, this.bunnyMesh.worldBoundingSphere.center);
                vCur.normalize();
                const axis = gfx.Vector3.normalize(gfx.Vector3.cross(vPrev, vCur));
                const angle = gfx.Vector3.angleBetween(vPrev, vCur);
                
                if (Number.isFinite(angle) && angle < Math.PI/4) {
                    // with matrices: 
                    const M = gfx.Matrix4.makeIdentity();
                    M.multiply(gfx.Matrix4.makeTranslation(gfx.Vector3.multiplyScalar(this.bunnyMesh.position, 1)));
                    M.multiply(gfx.Matrix4.makeRotation(gfx.Quaternion.makeAxisAngle(axis, angle)));
                    M.multiply(gfx.Matrix4.makeTranslation(gfx.Vector3.multiplyScalar(this.bunnyMesh.position, -1)));
                    M.multiply(this.bunnyMesh.getLocalToParentMatrix());
                    this.bunnyMesh.setLocalToParentMatrix(M, false);

                    // with separate TRS and quaternions
                    //this.bunnyMesh.rotation.premultiply(gfx.Quaternion.makeAxisAngle(axis, angle));
                }
                this.mousePrevPos = mouseCurPos;
            }    
        }
    }

    onMouseUp(event: MouseEvent): void {
        if (event.button == 0) {
            this.panning = false;
        }
        if (event.button == 2) {
            this.rotating = false;
        }
    }
}
