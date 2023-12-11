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

        this.bunnyMesh = gfx.MeshLoader.loadOBJ('./assets/bunny.obj');
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

        const ambientLight = new gfx.AmbientLight(new gfx.Vector3(0.2, 0.2, 0.2));
        this.scene.add(ambientLight);

        const pointLight = new gfx.PointLight();
        pointLight.position.set(.75, 1.1, 1);
        this.scene.add(pointLight);

        this.scene.add(this.bunnyMesh);
        this.bunnyMesh.position = new gfx.Vector3(0.5, 0, -1);
        this.bunnyMesh.scale = new gfx.Vector3(1.5, 1.5, 1.5);        
    }


    // --- Update is called once each frame by the main graphics loop ---
    update(deltaTime: number): void 
    {
    }

    onMouseDown(event: MouseEvent): void 
    {
        const mouseCurPos = this.getNormalizedDeviceCoordinates(event.x, event.y);

        // to start the interaction, check with an intersection with the object's mesh
        // (as opposed to its bounding sphere) because here we are checking to see if
        // the user has clicked directly ON the object, not just near it.
        const ray = new gfx.Ray3();
        ray.setPickRay(mouseCurPos, this.camera);
        const hit = ray.intersectsMesh3(this.bunnyMesh);
        if (hit) {
            if (event.button == 0 && !this.rotating) {
                this.panning = true;
                // TODO: Define the panPlane (filmplane translate)
                // find the normal of the plane, which is camera's -look vector
                // and convert it to world coordinates.
                const n = this.camera.localToWorldMatrix.transformVector(
                    new gfx.Vector3(0,0,-1)
                );
                this.panPlane = new gfx.Plane3(hit, n);

            } else if (event.button == 2 && !this.panning) {
                this.rotating = true;
            }
            this.mousePrevPos = mouseCurPos;
        }
    }

    onMouseMove(event: MouseEvent): void 
    {
        if (this.panning) {

            // TODO: 
            // shoot a ray for the prev mouse onto the pan plane
            const prevRay = new gfx.Ray3();
            prevRay.setPickRay(this.mousePrevPos, this.camera);
            const prevHit = prevRay.intersectsPlane(this.panPlane);

            // shoot a ray for the current mouse onto the pan plane
            const mouseCurPos = this.getNormalizedDeviceCoordinates(event.x, event.y);
            const curRay = new gfx.Ray3();
            curRay.setPickRay(mouseCurPos, this.camera);
            const curHit = curRay.intersectsPlane(this.panPlane);

            // translate the bunny based upon the mouse movement projected onto the pan plane
            if (prevHit && curHit) {
                const deltaPosWorld = gfx.Vector3.subtract(curHit, prevHit);
                const worldToLocalMatrix = this.bunnyMesh.localToWorldMatrix.inverse();
                const deltaPosLocal = worldToLocalMatrix.transformVector(deltaPosWorld);

                const M = this.bunnyMesh.getLocalToParentMatrix();
                M.multiply(gfx.Matrix4.makeTranslation(deltaPosLocal));
                this.bunnyMesh.setLocalToParentMatrix(M, false);

            }

            this.mousePrevPos = mouseCurPos;

        } else if (this.rotating) {
                      
            // TODO: 
            // shoot a ray for the prev mouse onto the bounding sphere of our object, note
            // here we use the bounding sphere (as opposed to the object itself) so we get
            // a smooth rotation.  also, this allows the user to be a little sloppy with the
            // mouse movement--they can move off the bunny mesh while rotating and the rotation
            // will still work as long as they are still on top of the bounding sphere.
            const mouseCurPos = this.getNormalizedDeviceCoordinates(event.x, event.y);

            // prev
            const worldRayPrev = new gfx.Ray3();
            worldRayPrev.setPickRay(this.mousePrevPos, this.camera);
            const worldHitPrev = worldRayPrev.intersectsOrientedBoundingSphere(this.bunnyMesh);

            // cur
            // shoot a ray for the current mouse onto the bounding sphere of our object  
            const worldRayCur = new gfx.Ray3();
            worldRayCur.setPickRay(mouseCurPos, this.camera);
            const worldHitCur = worldRayCur.intersectsOrientedBoundingSphere(this.bunnyMesh);

            // rotate the object based on the mouse's movement projected onto the bounding sphere
            if (worldHitCur && worldHitPrev) {
                const vPrev = gfx.Vector3.subtract(worldHitPrev, this.bunnyMesh.worldBoundingSphere.center);
                vPrev.normalize();

                const vCur = gfx.Vector3.subtract(worldHitCur, this.bunnyMesh.worldBoundingSphere.center);
                vCur.normalize();

                const axis = gfx.Vector3.normalize(gfx.Vector3.cross(vPrev, vCur));
                const angle = gfx.Vector3.angleBetween(vPrev, vCur);

                if (Number.isFinite(angle)) {
                    const TBack = gfx.Matrix4.makeTranslation(this.bunnyMesh.position);
                    const TtoOrigin = gfx.Matrix4.makeTranslation(gfx.Vector3.multiplyScalar(this.bunnyMesh.position, -1));
                    const R = gfx.Matrix4.makeRotation(gfx.Quaternion.makeAxisAngle(axis, angle));
                    const Mprev = this.bunnyMesh.getLocalToParentMatrix();

                    const M = gfx.Matrix4.multiplyAll(TBack, R, TtoOrigin, Mprev);
                    this.bunnyMesh.setLocalToParentMatrix(M, false);
                }
            }

            this.mousePrevPos = mouseCurPos;
            
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
