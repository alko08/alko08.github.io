precision highp float;
varying vec2 UV;
uniform sampler2D Velocity;
uniform sampler2D Pressure;
uniform vec2 Texel;

void main() {
    vec2 vel = texture2D(Velocity, UV).xy;
    float L = texture2D(Pressure, UV - vec2(Texel.x, 0)).x;
    float R = texture2D(Pressure, UV + vec2(Texel.x, 0)).x;
    float B = texture2D(Pressure, UV - vec2(0, Texel.y)).x;
    float T = texture2D(Pressure, UV + vec2(0, Texel.y)).x;

    vel -= 0.5 * vec2(R - L, T - B);
    gl_FragColor = vec4(vel, 0, 1);
}