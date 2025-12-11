precision highp float;
varying vec2 UV;
uniform sampler2D Source;    // scalar dye or velocity (when IsVelocity==1)
uniform sampler2D Velocity;  // velocity texture (used to backtrace) (pixel units per second)
uniform float Dt;
uniform float Damping;
uniform float Viscosity;
uniform vec2 Texel;
uniform float SoftSize;
uniform float BoundaryStrength;
uniform int IsVelocity;      // 0 => dye/scalar advect, 1 => vector advect

vec2 boundaryBounceCorrection(vec2 uv, vec2 velocity, float softSize) {
    float Left = uv.x;
    float Right = 1.0 - uv.x;
    float Bottom = uv.y;
    float Top = 1.0 - uv.y;

    vec2 bounce = vec2(0.0);
    if (Left < softSize)   bounce.x += (softSize - Left) * BoundaryStrength;
    if (Right < softSize)  bounce.x -= (softSize - Right) * BoundaryStrength;
    if (Bottom < softSize) bounce.y += (softSize - Bottom) * BoundaryStrength;
    if (Top < softSize)    bounce.y -= (softSize - Top) * BoundaryStrength;

    return velocity + bounce;
}

void main() {
    // read velocity at this pixel and apply soft boundary correction
    vec2 vel = texture2D(Velocity, UV).xy;
    vel = boundaryBounceCorrection(UV, vel, SoftSize);

    // convert to UV units
    vec2 velUV = vel * Texel;

    // backtrace
    vec2 preUV = UV - Dt * velUV;

    // NOTE: do not clamp preUV blindly for dye. We will decide behavior below.
    bool outOfBounds = (preUV.x < 0.0) || (preUV.x > 1.0) || (preUV.y < 0.0) || (preUV.y > 1.0);

    // --- handle scalar dye advect ---
    if (IsVelocity == 0) {
        vec4 s;
        if (outOfBounds) {
            // if trace left the domain, keep the dye that was at this pixel
            s = texture2D(Source, UV);
        } else {
            // normal backtrace sample and simple viscosity Laplacian
            vec2 p = clamp(preUV, vec2(0.0), vec2(1.0));
            vec4 c = texture2D(Source, p);
            vec4 n1 = texture2D(Source, p + vec2(Texel.x, 0.0));
            vec4 n2 = texture2D(Source, p - vec2(Texel.x, 0.0));
            vec4 n3 = texture2D(Source, p + vec2(0.0, Texel.y));
            vec4 n4 = texture2D(Source, p - vec2(0.0, Texel.y));
            vec4 lap = n1 + n2 + n3 + n4 - 4.0 * c;
            s = c + Viscosity * lap;
        }
        s *= Damping;
        gl_FragColor = s;
        return;
    }

    // --- handle vector (velocity) advect ---
    // For velocity we want to reflect normal components when the backtrace went out of bounds,
    // and otherwise sample normally and apply viscosity/damping.
    vec2 sampled;
    if (outOfBounds) {
        // clamp the sampling coordinate to the domain to avoid undefined fetches
        vec2 p = clamp(preUV, vec2(0.0), vec2(1.0));
        vec2 vSample = texture2D(Source, p).xy;

        // reflect components that correspond to which side we left
        if (preUV.x < 0.0) vSample.x = -vSample.x;
        if (preUV.x > 1.0) vSample.x = -vSample.x;
        if (preUV.y < 0.0) vSample.y = -vSample.y;
        if (preUV.y > 1.0) vSample.y = -vSample.y;

        sampled = vSample;
    } else {
        vec2 p = clamp(preUV, vec2(0.0), vec2(1.0));
        sampled = texture2D(Source, p).xy;

        // small extra safety: if sampled is pushing out of the soft boundary, nudge it inward
        sampled = boundaryBounceCorrection(p, sampled, SoftSize);
    }

    // apply viscosity / diffusion for velocity using laplacian on the velocity texture
    vec2 p = clamp(preUV, vec2(0.0), vec2(1.0));
    vec2 n1 = texture2D(Source, p + vec2(Texel.x, 0.0)).xy;
    vec2 n2 = texture2D(Source, p - vec2(Texel.x, 0.0)).xy;
    vec2 n3 = texture2D(Source, p + vec2(0.0, Texel.y)).xy;
    vec2 n4 = texture2D(Source, p - vec2(0.0, Texel.y)).xy;
    vec2 lap = n1 + n2 + n3 + n4 - 4.0 * sampled;

    vec2 outVel = sampled + Viscosity * lap;
    outVel *= Damping;

    gl_FragColor = vec4(outVel, 0.0, 1.0);
}