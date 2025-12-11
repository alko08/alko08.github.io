// fluid_simulation.js
// Created by Alexander Koppel for CS 175 Final
//
// Contains all nessecary code to run a basic fluid simulation with WebGL
// Note depends on many global window variables being defined

let SHADERS = null;

async function loadShaders() {
    const files = [
        ["VS", "./shaders/base.vert"],
        ["ADVECT", "./shaders/advect.frag"],
        ["DIVERGENCE", "./shaders/divergence.frag"],
        ["JACOBI", "./shaders/pressure.frag"],
        ["GRAD", "./shaders/gradient.frag"],
        ["SPLAT", "./shaders/splat.frag"],
        ["DISPLAY", "./shaders/display.frag"],
        ["BOUNCE", "./shaders/bounce.frag"],
        ["ARROW_VS", "./shaders/arrow.vert"],
        ["ARROW_FS", "./shaders/arrow.frag"]
    ];

    const promises = files.map(([key, path]) =>
        fetch(path).then(r => r.text()).then(text => [key, text])
    );

    const results = await Promise.all(promises);
    SHADERS = Object.fromEntries(results);
}

async function init() {
    await loadShaders();
    simulation();
}

init();


function simulation() {
    // Initial variable defintion
    let canvas = document.getElementById("fluidCanvas");
    let simulationLoop = null;

    // Compile shader helper
    function compile(gl, type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(s));
            console.log(src);
        }
        return s;
    }

    // Compile shader program helper
    function program(gl, vs, fs) {
        const p = gl.createProgram();
        gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
        gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(p));
        }
        return p;
    }

    // Create texture helper
    function tex(gl, w, h) {
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return t;
    }

    // Create FBO helper
    function fbo(gl, t) {
        const f = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return f;
    }

    // Create doubleFBO helper
    function doubleFBO(gl, w, h) {
        const A = tex(gl, w, h);
        const B = tex(gl, w, h);
        const a = fbo(gl, A);
        const b = fbo(gl, B);
        return {
            readTex: A,
            readFBO: a,
            writeTex: B,
            writeFBO: b,
            swap() {
                const tt = this.readTex;
                this.readTex = this.writeTex;
                this.writeTex = tt;
                const ff = this.readFBO;
                this.readFBO = this.writeFBO;
                this.writeFBO = ff;
            }
        };
    }

    function start() {
        console.log("Simulation Starting");
        SIM_RES = window.SIM_RES;

        // Wipe event listeners and completly reset canvas
        var oldCanvas = canvas;
        canvas = oldCanvas.cloneNode(true);
        oldCanvas.parentNode.replaceChild(canvas, oldCanvas);

        // Get open GL extensions
        const gl = canvas.getContext('webgl');
        gl.getExtension('OES_texture_float');
        gl.getExtension('OES_texture_float_linear');
        gl.getExtension('WEBGL_color_buffer_float') || gl.getExtension('EXT_color_buffer_float');

        // Quad buffer
        const quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

        // Bind quad for shaders
        function bindQuad(p) {
            gl.useProgram(p);
            const loc = gl.getAttribLocation(p, 'Pos');
            gl.enableVertexAttribArray(loc);
            gl.bindBuffer(gl.ARRAY_BUFFER, quad);
            gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        }

        // Define all shader programs
        const advectP = program(gl, SHADERS.VS, SHADERS.ADVECT);
        const divP = program(gl, SHADERS.VS, SHADERS.DIVERGENCE);
        const jacobiP = program(gl, SHADERS.VS, SHADERS.JACOBI);
        const gradP = program(gl, SHADERS.VS, SHADERS.GRAD);
        const splatP = program(gl, SHADERS.VS, SHADERS.SPLAT);
        const dispP = program(gl, SHADERS.VS, SHADERS.DISPLAY);
        const bounceP = program(gl, SHADERS.VS, SHADERS.BOUNCE);
        const arrowProgram = program(gl, SHADERS.ARROW_VS, SHADERS.ARROW_FS);

        // Define all textures
        const velocity = doubleFBO(gl, SIM_RES, SIM_RES);
        const dye = doubleFBO(gl, SIM_RES, SIM_RES);
        const pressure = doubleFBO(gl, SIM_RES, SIM_RES);
        const divergence = doubleFBO(gl, SIM_RES, SIM_RES);

        // Velocity texture buffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.writeFBO);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        velocity.swap();

        // Dye texture buffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, dye.writeFBO);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        dye.swap();

        // Bind texture for shaders
        function bindTexture(tex, unit) {
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, tex);
        }

        // Call splat step shader program
        function splat(FBO, uv, color, radius, isColor) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, FBO.writeFBO);
            gl.viewport(0, 0, SIM_RES, SIM_RES);
            bindQuad(splatP);
            bindTexture(FBO.readTex, 0);
            gl.uniform1i(gl.getUniformLocation(splatP, 'oldTexture'), 0);
            gl.uniform2f(gl.getUniformLocation(splatP, 'point'), uv[0], uv[1]);
            gl.uniform3fv(gl.getUniformLocation(splatP, 'color'), color);
            gl.uniform1f(gl.getUniformLocation(splatP, 'radius'), radius);
            gl.uniform1i(gl.getUniformLocation(splatP, 'isColor'), isColor ? window.COLOR_VALUE : 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            FBO.swap();
        }

        // Mouse initial Variables
        let mouseDown = false;
        let lastUV = null;
        let mouseColor = window.SPLAT_COLOR;
        if (window.RANDOM_COLOR) {
            mouseColor = [Math.random(), Math.random(), Math.random()];
        }

        let splats = []; // List of random splats for simulation steps

        // Code for spawning a generic splat
        function spawnSplat(uv, dx, dy, randomColor) {
            // Convert UV delta to pixel velocity
            const vx = dx * SIM_RES * window.SPLAT_FORCE;
            const vy = dy * SIM_RES * window.SPLAT_FORCE;

            splat(velocity, uv, [vx, vy, 0], window.SPLAT_RADIUS, false);
            splat(dye, uv, randomColor, window.SPLAT_RADIUS, true);
        }

        // Mouse pressed down in canvas
        canvas.addEventListener('pointerdown', e => {
            mouseDown = true;
            const r = canvas.getBoundingClientRect();
            lastUV = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
            mouseColor = window.SPLAT_COLOR;
            if (window.RANDOM_COLOR) { // Create random color each time
                mouseColor = [Math.random(), Math.random(), Math.random()];
            }
        });

        // Mouse let go in canvas
        canvas.addEventListener('pointerup', () => {
            mouseDown = false;
        });

        // Mouse exited canvas
        canvas.addEventListener('pointerout', () => {
            mouseDown = false;
        });

        // Mouse dragged across canvas event listener (spawn splat)
        canvas.addEventListener('pointermove', e => {
            if (!mouseDown) return; // Ignore mouse, not dragging

            const r = canvas.getBoundingClientRect();
            const uv = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
            const dx = uv[0] - lastUV[0];
            const dy = uv[1] - lastUV[1];

            spawnSplat(uv, dx, dy, mouseColor);
            lastUV = uv;
        });

        

        // Push random splat to array
        function randomSplat() {
            const uv = [Math.random(), Math.random()];
            const dx = (Math.random() - 0.5) / 20.0;
            const dy = (Math.random() - 0.5) / 20.0;

            let SplatColor = window.SPLAT_COLOR;
            if (window.RANDOM_COLOR) {
                SplatColor = [Math.random(), Math.random(), Math.random()];
            }
            splats.push([0, uv, dx, dy, SplatColor]);
        }

        // Spawn 5-20 random splats
        function spawnRandomSplats() {
            const count = Math.random() * 15 + 5;
            for (let i = 0; i < count; i++) {
                randomSplat();
            }
        }

        // Call advect step shader program
        function advectStep(FBO, velFBO, isVelocity) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, FBO.writeFBO);
            gl.viewport(0, 0, SIM_RES, SIM_RES);
            bindQuad(advectP);
            bindTexture(FBO.readTex, 0);   // Source
            bindTexture(velFBO.readTex, 1); // Velocity (used for backtrace)
            gl.uniform1i(gl.getUniformLocation(advectP, 'Source'), 0);
            gl.uniform1i(gl.getUniformLocation(advectP, 'Velocity'), 1);
            gl.uniform1f(gl.getUniformLocation(advectP, 'Dt'), window.DT);
            gl.uniform1f(gl.getUniformLocation(advectP, 'Damping'), window.DAMPING);
            gl.uniform1f(gl.getUniformLocation(advectP, 'Viscosity'), window.VISCOSITY);
            gl.uniform2f(gl.getUniformLocation(advectP, 'Texel'), 1.0 / SIM_RES, 1.0 / SIM_RES);
            gl.uniform1f(gl.getUniformLocation(advectP, 'SoftSize'), window.SOFT_BOUNDARY_SIZE);
            gl.uniform1f(gl.getUniformLocation(advectP, 'BoundaryStrength'), window.BOUNDARY_STRENGTH);
            gl.uniform1i(gl.getUniformLocation(advectP, 'IsVelocity'), isVelocity ? 1 : 0);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            FBO.swap();
        }

        // Call compute div shader program
        function computeDiv(FBO) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, FBO.writeFBO);
            gl.viewport(0, 0, SIM_RES, SIM_RES);
            bindQuad(divP);
            bindTexture(velocity.readTex, 0);
            gl.uniform1i(gl.getUniformLocation(divP, 'Velocity'), 0);
            gl.uniform2f(gl.getUniformLocation(divP, 'Texel'), 1.0 / SIM_RES, 1.0 / SIM_RES);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            FBO.swap();
        }

        // Call pressure shader program PRESSURE_ITER times
        function solvePressure() {
            for (let i = 0; i < window.PRESSURE_ITER; i++) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.writeFBO);
                gl.viewport(0, 0, SIM_RES, SIM_RES);
                bindQuad(jacobiP);
                bindTexture(pressure.readTex, 0);
                bindTexture(divergence.readTex, 1);
                gl.uniform1i(gl.getUniformLocation(jacobiP, 'Pressure'), 0);
                gl.uniform1i(gl.getUniformLocation(jacobiP, 'Divergence'), 1);
                gl.uniform2f(gl.getUniformLocation(jacobiP, 'Texel'), 1.0 / SIM_RES, 1.0 / SIM_RES);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                pressure.swap();
            }
        }

        // Call subtract gradient shader program
        function subtractGrad() {
            gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.writeFBO);
            gl.viewport(0, 0, SIM_RES, SIM_RES);
            bindQuad(gradP);
            bindTexture(velocity.readTex, 0);
            bindTexture(pressure.readTex, 1);
            gl.uniform1i(gl.getUniformLocation(gradP, 'Velocity'), 0);
            gl.uniform1i(gl.getUniformLocation(gradP, 'Pressure'), 1);
            gl.uniform2f(gl.getUniformLocation(gradP, 'Texel'), 1.0 / SIM_RES, 1.0 / SIM_RES);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            velocity.swap();
        }

        // Call display shader program
        function display() {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height);
            bindQuad(dispP);
            bindTexture(dye.readTex, 0);
            gl.uniform1i(gl.getUniformLocation(dispP, 'Dye'), 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        // Create arrow line-segments
        function createArrowLines(res) {
            const pts = [];
            for (let y = 0; y < res; y++) {
                for (let x = 0; x < res; x++) {
                    const u = (x + 0.5) / res;
                    const v = (y + 0.5) / res;

                    pts.push(u, v, 0, 0); // aOffset = (0,0) → tail
                    pts.push(u, v, 1, 0); // aOffset = (1,0) → head
                }
            }
            return new Float32Array(pts);
        }

        // Call arrow shader program
        function renderArrows() {
            gl.useProgram(arrowProgram);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height);
            const arrowData = createArrowLines(window.ARROW_RES);

            const arrowBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, arrowBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, arrowData, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, arrowBuffer);

            const stride = 4 * 4; // 4 floats per vertex
            const locPos = gl.getAttribLocation(arrowProgram, "Pos");
            const locOffset = gl.getAttribLocation(arrowProgram, "aOffset");
            gl.enableVertexAttribArray(locPos);
            gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, stride, 0);
            gl.enableVertexAttribArray(locOffset);
            gl.vertexAttribPointer(locOffset, 2, gl.FLOAT, false, stride, 8);
            bindTexture(velocity.readTex, 0);
            gl.uniform1i(gl.getUniformLocation(arrowProgram, "Velocity"), 0);
            gl.uniform1f(gl.getUniformLocation(arrowProgram, "Scale"), 0.0001);
            gl.drawArrays(gl.LINES, 0, window.ARROW_RES * window.ARROW_RES * 2);
        }

        // Call boundary bounce shader program
        function applyBoundaryBounce(velFBO) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, velFBO.writeFBO);
            gl.viewport(0, 0, SIM_RES, SIM_RES);
            bindQuad(bounceP);
            bindTexture(velFBO.readTex, 0);
            gl.uniform1i(gl.getUniformLocation(bounceP, 'Velocity'), 0);
            gl.uniform1f(gl.getUniformLocation(bounceP, 'SoftSize'), window.SOFT_BOUNDARY_SIZE);
            gl.uniform1f(gl.getUniformLocation(bounceP, 'BoundaryStrength'), window.BOUNDARY_STRENGTH);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            velFBO.swap();
        }


        function simulate() {
            // Do Random Splats before simulation steps
            if (window.SPAWN_SPLAT) {
                spawnRandomSplats();
                window.SPAWN_SPLAT = false;
            }
            for (let i = 0; i < splats.length; i++) {
                splatItem = splats[i];
                count = splatItem[0];
                if (count < 3) {
                    spawnSplat(splatItem[1], splatItem[2], splatItem[3], splatItem[4]);
                    splatItem[0] += 1;
                    splatItem[1][0] += splatItem[2];
                    splatItem[1][1] += splatItem[3];
                } else {
                    splats.pop(i);
                    i -= 1;
                }
            }
        
            // If paused display and skip simulation steps
            if (window.PAUSE_SIM) {
                display();
                if (window.SHOW_ARROWS) {
                    renderArrows();
                }
                simulationLoop = requestAnimationFrame(simulate);
                return;
            }

            // Simulation Steps!
            advectStep(velocity, velocity, true); // advect velocity texture with velocity
            advectStep(dye, velocity, false);     // advect dye using the velocity field
            computeDiv(divergence);
            solvePressure();
            subtractGrad();
            applyBoundaryBounce(velocity);

            // Final Output
            display();
            if (window.SHOW_ARROWS) {
                renderArrows();
            }

            // Loop Simulation
            simulationLoop = requestAnimationFrame(simulate);
        }

        // Start Simulation
        simulate();
    }

    function stopSimulation() {
        if (simulationLoop !== null) {
            cancelAnimationFrame(simulationLoop);
            simulationLoop = null;
        }
    }

    window.restartSimulation = function () {
        stopSimulation();
        start();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
}
