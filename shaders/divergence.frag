precision highp float;
varying vec2 UV;
uniform sampler2D Velocity;
uniform vec2 Texel;

void main() {
    float L = texture2D(Velocity, UV - vec2(Texel.x, 0)).x;
    float R = texture2D(Velocity, UV + vec2(Texel.x, 0)).x;
    float B = texture2D(Velocity, UV - vec2(0, Texel.y)).y;
    float T = texture2D(Velocity, UV + vec2(0, Texel.y)).y;

    float div = 0.5 * ((R - L) + (T - B));
    gl_FragColor = vec4(div, 0, 0, 1);
}