attribute vec2 Pos;      // base UV sample point
attribute vec2 aOffset;   // either (0,0) for tail or (1,0) for head

uniform sampler2D Velocity;
uniform float Scale;     // arrow length scale

void main() {
    vec2 vel = texture2D(Velocity, Pos).xy;

    // float mag = length(vel);
    vec2 dir = vel * Scale;
    dir = clamp(dir, -.10, .10);
    if (length(dir) < .005) {
        return;
    }

    vec2 uv = Pos + dir * aOffset.x;
    vec2 clip = uv * 2.0 - 1.0;
    gl_Position = vec4(clip, 0.0, 1.0);
}