precision highp float;
varying vec2 UV;
uniform sampler2D Dye;

void main() {
    gl_FragColor = texture2D(Dye, UV);
}