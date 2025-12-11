attribute vec2 Pos;
varying vec2 UV;

void main() {
    UV = Pos * 0.5 + 0.5;
    gl_Position = vec4(Pos, 0, 1);
}