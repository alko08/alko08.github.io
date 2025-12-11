// controls.js
// Created by Alexander Koppel for CS 175 Final
//
// Contains all nessecary code to control the basic fluid simulation by adding
// event listeners to the many sliders and input fields in index.html

// Live simulation parameters
window.SIM_RES = 512;
window.DT = 0.0015;
window.VISCOSITY = 0.0001;
window.DAMPING = 0.995;
window.PRESSURE_ITER = 20;
window.SOFT_BOUNDARY_SIZE = 0.15;
window.BOUNDARY_STRENGTH = 0.5;
window.SPLAT_RADIUS = 0.02;
window.COLOR_VALUE = 1;
window.SHOW_ARROWS = false;
window.ARROW_RES = 20;
window.PAUSE_SIM = false;
window.SPLAT_FORCE = 120;
window.SPAWN_SPLAT = false;
window.RANDOM_COLOR = true;
window.SPLAT_COLOR = [1.0, 1.0, 1.0];

// Connect each slider and input
function bindPair(variableName, useFloat = true) {
    const slider = document.getElementById(variableName + "_slider");
    const input = document.getElementById(variableName + "_input");

    function refreshFields() {
        slider.value = window[variableName];
        input.value = window[variableName];
    }

    refreshFields();

    if (useFloat) {
        slider.addEventListener('input', () => {
            const val = parseFloat(slider.value);
            window[variableName] = val;
            input.value = window[variableName];
            // console.log(variableName, val);
        });

        input.addEventListener('change', () => {
            const val = parseFloat(input.value);
            window[variableName] = val;
            slider.value = window[variableName];
            // console.log(variableName, val);
        });
    } else {
        slider.addEventListener('input', () => {
            const val = parseInt(slider.value);
            window[variableName] = val;
            input.value = window[variableName];
            // console.log(variableName, window[variableName]);
        });
        input.addEventListener('change', () => {
            const val = parseInt(input.value);
            window[variableName] = val;
            slider.value = window[variableName];
            // console.log(variableName, window[variableName]);
        });
    }
}

// Bind all parameters
bindPair('VISCOSITY');
bindPair('DAMPING');
bindPair('PRESSURE_ITER', false);
bindPair('SOFT_BOUNDARY_SIZE');
bindPair('BOUNDARY_STRENGTH');
bindPair('SPLAT_RADIUS');
bindPair('SPLAT_FORCE');
bindPair('ARROW_RES', false);
bindPair('COLOR_VALUE', false);
bindPair('DT');

function restartSimulation() {
    if (window.restartSimulation) {
        window.restartSimulation();
    }
}

// Reset button
document.getElementById('resetButton').addEventListener('click', restartSimulation);

// Sim Resolution requires reset
bindPair('SIM_RES', false);
document.getElementById('SIM_RES_slider').addEventListener('change', restartSimulation);
document.getElementById('SIM_RES_input').addEventListener('change', restartSimulation);

// Arrow checkbox
const arrowsCheckbox = document.getElementById("arrows-checkbox");
arrowsCheckbox.checked = window.SHOW_ARROWS;
arrowsCheckbox.addEventListener("change", () => {
    window.SHOW_ARROWS = arrowsCheckbox.checked;
});

function setValue(variableName) {
    document.getElementById(variableName + "_slider").value = window[variableName];
    document.getElementById(variableName + "_input").value = window[variableName];
}

function resetVariables() {
    window.SIM_RES = 512;
    window.DT = 0.0015;
    window.VISCOSITY = 0.0001;
    window.DAMPING = 0.995;
    window.PRESSURE_ITER = 20;
    window.SOFT_BOUNDARY_SIZE = 0.15;
    window.BOUNDARY_STRENGTH = 0.5;
    window.SPLAT_RADIUS = 0.02;
    window.COLOR_VALUE = 1;
    window.SHOW_ARROWS = false;
    window.ARROW_RES = 20;
    window.SPLAT_FORCE = 120;
    window.RANDOM_COLOR = true;
    window.SPLAT_COLOR = [256, 256, 256];

    setValue('SIM_RES');
    setValue('VISCOSITY');
    setValue('DAMPING');
    setValue('PRESSURE_ITER');
    setValue('SOFT_BOUNDARY_SIZE');
    setValue('BOUNDARY_STRENGTH');
    setValue('SPLAT_RADIUS');
    setValue('SPLAT_FORCE');
    setValue('COLOR_VALUE');
    setValue('ARROW_RES');
    setValue('DT');
    document.getElementById('arrows-checkbox').checked = window.SHOW_ARROWS;
    document.getElementById('random-color-checkbox').checked = window.RANDOM_COLOR;
    splatRed = document.getElementById("SPLAT_COLOR_RED_input");
    splatRed.value = Math.round(window["SPLAT_COLOR"][0]);
    splatGreen = document.getElementById("SPLAT_COLOR_GREEN_input");
    splatGreen.value = Math.round(window["SPLAT_COLOR"][1]);
    splatBLUE = document.getElementById("SPLAT_COLOR_BLUE_input");
    splatBLUE.value = Math.round(window["SPLAT_COLOR"][2]);
}

document.getElementById('resetVarButton').addEventListener('click', resetVariables);
document.getElementById('resetVarButton').addEventListener('click', restartSimulation);

function spawnSplat() {
    window.SPAWN_SPLAT = true;
}
document.getElementById('RandomSplatsButton').addEventListener('click', spawnSplat);

// Pause checkbox
const pauseCheckbox = document.getElementById("pause-checkbox");
pauseCheckbox.checked = window.PAUSE_SIM;
pauseCheckbox.addEventListener("change", () => {
    window.PAUSE_SIM = pauseCheckbox.checked;
});

// Splat Color checkbox
const splatColorCheckbox = document.getElementById("random-color-checkbox");
splatColorCheckbox.checked = window.RANDOM_COLOR;
const splatColorChooser = document.getElementById("SplatColorChooser");
splatColorChooser.style.visibility = window.RANDOM_COLOR ? "hidden" : "visible";
splatColorCheckbox.addEventListener("change", () => {
    window.RANDOM_COLOR = splatColorCheckbox.checked;
    splatColorChooser.style.visibility = window.RANDOM_COLOR ? "hidden" : "visible";
});

splatRed = document.getElementById("SPLAT_COLOR_RED_input");
splatRed.value = Math.round(window["SPLAT_COLOR"][0] * 256);
splatRed.addEventListener('change', () => {
    const val = parseInt(splatRed.value);
    window["SPLAT_COLOR"][0] = val / 256.0;
});
splatGreen = document.getElementById("SPLAT_COLOR_GREEN_input");
splatGreen.value = Math.round(window["SPLAT_COLOR"][1] * 256);
splatGreen.addEventListener('change', () => {
    const val = parseInt(splatGreen.value);
    window["SPLAT_COLOR"][1] = val / 256.0;
});
splatBLUE = document.getElementById("SPLAT_COLOR_BLUE_input");
splatBLUE.value = Math.round(window["SPLAT_COLOR"][2] * 256);
splatBLUE.addEventListener('change', () => {
    const val = parseInt(splatBLUE.value);
    window["SPLAT_COLOR"][2] = val / 256.0;
});


window.addEventListener('keydown', e => {
    if (e.key === 'p' || e.key === 'P') {
        window.PAUSE_SIM = !window.PAUSE_SIM;
        pauseCheckbox.checked = window.PAUSE_SIM;
    } else if (e.key === ' ') {
        spawnSplat();
    }
});

