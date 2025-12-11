precision highp float;
varying vec2 UV;

uniform sampler2D Velocity;
uniform float SoftSize;
uniform float BoundaryStrength;

void main() {
    vec2 vel = texture2D(Velocity, UV).xy;

    float Left = UV.x;
    float Right = 1.0 - UV.x;
    float Bottom = UV.y;
    float Top = 1.0 - UV.y;

    if (Left < SoftSize)   vel.x += (SoftSize - Left) * BoundaryStrength;
    if (Right < SoftSize)  vel.x -= (SoftSize - Right) * BoundaryStrength;
    if (Bottom < SoftSize) vel.y += (SoftSize - Bottom) * BoundaryStrength;
    if (Top < SoftSize)    vel.y -= (SoftSize - Top) * BoundaryStrength;

    gl_FragColor = vec4(vel, 0.0, 1.0);
}