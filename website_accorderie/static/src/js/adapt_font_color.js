// This file need to be load at the end ideally
function calculateLightness(strColor) {
    const [r, g, b] = strColor.substring(4, strColor.length - 1).split(',').map(str => parseInt(str.trim()));
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function getBackgroundColor(className) {
    let sheets = document.styleSheets;
    let color = null;
    for (let i = 0; i < sheets.length; i++) {
        let rules = sheets[i].cssRules;
        for (let j = 0; j < rules.length; j++) {
            if (rules[j].selectorText === className) {
                color = rules[j].style.backgroundColor;
                break;
            }
        }
        if (color) break;
    }
    return color;
}

function addInverseColor(bgClassName, newColorClassName) {

    let bgColor = getBackgroundColor(bgClassName);

    // Affichage de la couleur dans la console
    console.debug(bgColor);

    const lightness = calculateLightness(bgColor);

    let color;
    if (lightness < 0.5) {
        color = 'white';
    } else {
        color = 'black';
    }

    console.debug(`Create class color '${newColorClassName}' associate to background '${bgClassName}' color '${bgColor}', lightness '${lightness}', so color is '${color}'`);

    let sheet = document.styleSheets[document.styleSheets.length - 1];

    // Crée la règle
    let rule = `${newColorClassName} { color: ${color} !important; }`;

    // console.log(rule);

    // Ajoute la règle à la feuille de style
    sheet.insertRule(rule, sheet.cssRules.length);

}

addInverseColor(".bg-primary", ".adapt-text-primary-color")
addInverseColor(".bg-secondary", ".adapt-text-secondary-color")
addInverseColor(".bg-alpha", ".adapt-text-alpha-color")
addInverseColor(".bg-beta", ".adapt-text-beta-color")
addInverseColor(".bg-gamma", ".adapt-text-gamma-color")
addInverseColor(".bg-delta", ".adapt-text-delta-color")
addInverseColor(".bg-epsilon", ".adapt-text-epsilon-color")
