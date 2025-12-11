precision highp float;
varying vec2 UV;
uniform sampler2D Pressure;
uniform sampler2D Divergence;
uniform vec2 Texel;

void main() { // Jacobi pressure calculation
    float L = texture2D(Pressure, UV - vec2(Texel.x, 0)).x;
    float R = texture2D(Pressure, UV + vec2(Texel.x, 0)).x;
    float B = texture2D(Pressure, UV - vec2(0, Texel.y)).x;
    float T = texture2D(Pressure, UV + vec2(0, Texel.y)).x;

    float div = texture2D(Divergence, UV).x;

    float p = (L + R + B + T - div) * 0.25;
    gl_FragColor = vec4(p, 0, 0, 1);
}