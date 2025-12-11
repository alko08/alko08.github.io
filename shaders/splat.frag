precision highp float;
varying vec2 UV;
uniform sampler2D oldTexture;
uniform vec2 point;
uniform vec3 color;
uniform float radius;
uniform int isColor;

void main() {
    vec3 oldColor = texture2D(oldTexture, UV).rgb;
    float d = distance(UV, point);
    float k = exp(-(d * d) / (radius * radius));
    vec3 newColor = k * color;

    vec3 resultColor = oldColor + newColor;
    if (isColor == 1) {
        resultColor = oldColor + newColor * 0.3;
    } else if (isColor == 2) {
        resultColor = max(oldColor, newColor);
    } else if (isColor == 3) {
        resultColor = mix(oldColor, color, k);
    }
    gl_FragColor = vec4(resultColor, 1.0);
}